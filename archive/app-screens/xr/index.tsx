import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { GEMINI_API_KEY, GEMINI_MODEL } from "../../constants/config";

type Mode = "pulse" | "cpr";

type Box = {
  label: string;
  x: number; // normalized 0..1, left
  y: number; // normalized 0..1, top
  w: number; // normalized 0..1
  h: number; // normalized 0..1
  score?: number;
};

export default function XRGoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [mode, setMode] = useState<Mode>("pulse");
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [boxes, setBoxes] = useState<Box[] | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  // CPR metronome
  const [bpm, setBpm] = useState(110);
  const [running, setRunning] = useState(false);
  const beatCount = useRef(0);
  const tickRef = useRef<number | null>(null);
  const player = useAudioPlayer(require("../../assets/sounds/tick.mp3"));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => stopCpr();
  }, []);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setVw(width);
    setVh(height);
  };

  // --------- CPR metronome ----------
  const tickOnce = () => {
    beatCount.current += 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try { player.seekTo(0); player.play(); } catch {}
    if (beatCount.current % 2 === 0) Speech.speak("push", { rate: 1.0, pitch: 1.0 });
  };
  const startCpr = () => {
    if (running) return;
    setRunning(true);
    beatCount.current = 0;
    const rate = Math.max(100, Math.min(120, bpm));
    const ms = 60000 / rate;
    tickOnce();
    tickRef.current = setInterval(tickOnce, ms) as unknown as number;
  };
  const stopCpr = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setRunning(false);
    Speech.stop();
  };
  useEffect(() => { if (running) { stopCpr(); startCpr(); } }, [bpm]); // eslint-disable-line

  // --------- Analyze w/ Gemini (REST) ----------
  const analyze = async () => {
    if (!cameraRef.current) return;
    try {
      setLoading(true);
      setBoxes(null);
      setHint(null);

      // Take a silent snapshot with base64
      // @ts-ignore - types vary across SDKs
      const photo = await cameraRef.current.takePhotoAsync?.({ base64: true, quality: 0.7 })
                  ?? await (cameraRef.current as any).takePictureAsync?.({ base64: true, quality: 0.7 });
      if (!photo?.base64) throw new Error("Could not capture image");

      // Build Gemini REST request
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
      const sys = [
        "You are a first-aid vision assistant.",
        `MODE="${mode}".`,
        "Return tight, normalized bounding boxes (0..1, origin top-left) for the requested target(s):",
        "- For MODE=pulse: adult carotid (neck) and radial (wrist) as applicable; if infant/child, brachial (upper arm).",
        "- For MODE=cpr: lower half of sternum (adult chest compression site).",
        "If the person isn’t clearly visible, return an empty array and a helpful hint.",
        "Strictly output JSON with this shape:",
        '{ "boxes":[{"label":"carotid|radial|brachial|sternum","x":0.00,"y":0.00,"w":0.00,"h":0.00,"score":0.0}], "hint":"string" }',
        "Do not include extra keys, code blocks, or prose."
      ].join(" ");

      const body = {
        contents: [
          {
            role: "user",
            parts: [
              { text: sys },
              { inline_data: { mime_type: "image/jpeg", data: photo.base64 } }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json"
        }
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      // Gemini returns JSON as a text part we need to parse
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = safeParseJSON(text);
      if (!parsed) throw new Error("Model did not return valid JSON");
      setBoxes(parsed.boxes || []);
      setHint(parsed.hint ?? null);
    } catch (e: any) {
      setHint(`Analyze failed: ${e?.message ?? "unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // --------- alignment ----------
  const guide = mode === "pulse"
    ? { x: 0.14, y: 0.58, w: 0.72, h: 0.20 }
    : { x: 0.22, y: 0.60, w: 0.56, h: 0.18 };

  const best = boxes?.[0];
  const iou = best ? computeIoU(guide, best) : 0;
  const aligned = iou >= 0.5;

  if (!permission) return <View style={{ flex: 1, backgroundColor: "black" }} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.needPerm}>We need camera access to assist you.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btnPrimary}>
          <Text style={styles.btnTxt}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top","left","right","bottom"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.title}>XR 911 (Expo Go)</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "pulse" && styles.modeBtnActive]}
            onPress={() => { setMode("pulse"); stopCpr(); setBoxes(null); setHint(null); }}
          >
            <Text style={[styles.modeTxt, mode === "pulse" && styles.modeTxtActive]}>Pulse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "cpr" && styles.modeBtnActive]}
            onPress={() => { setMode("cpr"); setBoxes(null); setHint(null); }}
          >
            <Text style={[styles.modeTxt, mode === "cpr" && styles.modeTxtActive]}>CPR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Camera + overlays */}
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <CameraView ref={(r) => (cameraRef.current = r)} style={{ flex: 1 }} facing="back" />

        {/* Guide frame: turns green when aligned with model box */}
        <View
          pointerEvents="none"
          style={[
            styles.frameBase,
            frameStyle(guide, vw, vh),
            aligned ? styles.frameGreen : styles.frameRed,
          ]}
        />

        {/* Model target box (thin white outline) */}
        {best && (
          <View pointerEvents="none" style={[styles.targetBox, frameStyle(best, vw, vh)]} />
        )}

        {/* Bottom HUD */}
        <View pointerEvents="box-none" style={styles.overlayBottom}>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={analyze} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTxt}>Analyze</Text>}
          </TouchableOpacity>

          {mode === "cpr" && (
            <View style={styles.controls}>
              <Text style={styles.label}>Rate: {bpm} /min (target 100–120)</Text>
              <Slider
                minimumValue={100}
                maximumValue={120}
                step={1}
                value={bpm}
                onValueChange={(v) => setBpm(Math.round(v))}
                style={{ width: "100%" }}
              />
              {!running ? (
                <TouchableOpacity style={[styles.btnSuccess, { marginTop: 8 }]} onPress={startCpr}>
                  <Text style={styles.btnTxt}>Start Beat</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.btnDanger, { marginTop: 8 }]} onPress={stopCpr}>
                  <Text style={styles.btnTxt}>Stop</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------- helpers ----------
function frameStyle(b: {x:number;y:number;w:number;h:number}, vw: number, vh: number) {
  return { position: "absolute" as const, left: b.x * vw, top: b.y * vh, width: b.w * vw, height: b.h * vh };
}
function computeIoU(a: {x:number;y:number;w:number;h:number}, b: {x:number;y:number;w:number;h:number}) {
  const ax2 = a.x + a.w, ay2 = a.y + a.h;
  const bx2 = b.x + b.w, by2 = b.y + b.h;
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(ax2, bx2), y2 = Math.min(ay2, by2);
  const iw = Math.max(0, x2 - x1), ih = Math.max(0, y2 - y1);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}
function safeParseJSON(s: string) {
  try { return JSON.parse(s); } catch {}
  // try to extract the first {...} block
  const m = s.match(/\{[\s\S]*\}$/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// ---------- styles ----------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  needPerm: { color: "#111827", fontSize: 16, marginBottom: 10 },

  topBar: { paddingHorizontal: 16, paddingTop: Platform.select({ ios: 4, android: 8 }), paddingBottom: 8, backgroundColor: "#0b1220" },
  title: { color: "white", fontSize: 18, fontWeight: "800" },
  modeRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  modeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#1f2937" },
  modeBtnActive: { backgroundColor: "#2563eb" },
  modeTxt: { color: "#cbd5e1", fontWeight: "700" },
  modeTxtActive: { color: "white" },

  frameBase: { borderWidth: 3, borderRadius: 14 },
  frameRed: { borderColor: "#ef4444" },
  frameGreen: { borderColor: "#22c55e" },

  targetBox: { borderWidth: 2, borderColor: "white", borderRadius: 10, opacity: 0.9 },

  overlayBottom: {
    position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, gap: 10,
    backgroundColor: "#0b1220cc", borderTopLeftRadius: 16, borderTopRightRadius: 16,
  },
  hint: { color: "white", fontSize: 14, marginBottom: 6, textAlign: "center" },

  controls: { backgroundColor: "#0b1220cc", padding: 12, borderRadius: 12, marginTop: 6 },
  label: { color: "white", marginBottom: 8 },

  btnPrimary: { backgroundColor: "#2563eb", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  btnSuccess: { backgroundColor: "#16a34a", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  btnDanger: { backgroundColor: "#dc2626", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: "center" },
  btnTxt: { color: "white", fontWeight: "700" },
});
