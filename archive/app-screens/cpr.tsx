import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useKeepAwake } from "expo-keep-awake";
import { SafeAreaView } from "react-native-safe-area-context";

/** expo-audio */
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";

const DEFAULT_BPM = 110; // AHA: 100–120

export default function CprScreen() {
  useKeepAwake();
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);
  const beatCount = useRef(0);

  // Prepare audio player
  const player = useAudioPlayer(require("../assets/sounds/tick.mp3"));

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    return () => stop();
  }, []);

  const loopOnce = () => {
    beatCount.current += 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    player.seekTo(0);
    player.play();
    if (beatCount.current % 2 === 0) {
      Speech.speak("push", { rate: 1.0, pitch: 1.0 });
    }
  };

  const start = () => {
    if (running) return;
    setRunning(true);
    beatCount.current = 0;
    const periodMs = 60000 / bpm;
    loopOnce();
    tickRef.current = setInterval(loopOnce, periodMs) as unknown as number;
  };

  const stop = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setRunning(false);
    Speech.stop();
  };

  useEffect(() => {
    if (!running) return;
    stop();
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top","left","right","bottom"]}>
      <View style={s.wrap}>
        <Text style={s.h1}>CPR Assistant</Text>
        <Text style={s.p}>Rate: {bpm} compressions/min (target 100–120)</Text>

        <View style={{ height: 10 }} />
        <Slider
          minimumValue={100}
          maximumValue={120}
          step={1}
          value={bpm}
          onValueChange={(v) => setBpm(Math.round(v))}
        />

        <View style={{ height: 16 }} />
        {!running ? (
          <TouchableOpacity style={s.btnStart} onPress={start}>
            <Text style={s.btnTxt}>Start Beat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.btnStop} onPress={stop}>
            <Text style={s.btnTxt}>Stop</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
        <Text style={s.tip}>
          Hand position: center of chest on the lower half of the sternum. Push hard and fast ~2 inches (5 cm), allow full recoil. Minimize interruptions.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  p: { fontSize: 16 },
  btnStart: { backgroundColor: "#16a34a", padding: 14, borderRadius: 14, alignItems: "center", marginTop: 10 },
  btnStop: { backgroundColor: "#dc2626", padding: 14, borderRadius: 14, alignItems: "center", marginTop: 10 },
  btnTxt: { color: "white", fontWeight: "700" },
  tip: { color: "#334155", marginTop: 14, lineHeight: 22 },
});
