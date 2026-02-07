import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { router } from "expo-router";
import { geminiService, DetectionResult } from "../../../services/gemini";
import {
  computerVisionService,
  CVResult,
} from "../../../services/computerVision";
import {
  emergencyCoordinatorService,
  CoordinatorResult,
} from "../../../services/emergencyCoordinator";
import { DispatcherResponse } from "../../../services/medicalDispatcher";
import { Accelerometer, Gyroscope } from "expo-sensors";
import * as Speech from "expo-speech";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";

// Import XR Modals
import { XRCPRModal } from "../../../components/XRCPRModal";
import { XRPulseModal } from "../../../components/XRPulseModal";
import { colors, spacing, borderRadius } from "../../../constants/theme";

type Mode = "airway" | "cpr" | "pulse" | "seizure";


export default function EmergencyRun() {
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView | null>(null);

  const [mode, setMode] = useState<Mode>("airway");
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);

  // AI analysis state
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [overallInstruction, setOverallInstruction] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisIntervalRef = useRef<number | null>(null);

  // Medical Dispatcher state
  const [dispatcherResponse, setDispatcherResponse] =
    useState<DispatcherResponse | null>(null);
  const [isDispatcherActive, setIsDispatcherActive] = useState(false);
  const [claudeInput, setClaudeInput] = useState<string>("");
  const dispatcherIntervalRef = useRef<number | null>(null);

  // Advanced Computer Vision
  const [cvPositions, setCvPositions] = useState<{
    [key: string]: { x: number; y: number };
  }>({});
  const [isCVEnabled, setIsCVEnabled] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cvIntervalRef = useRef<number | null>(null);

  // XR Modal states
  const [isXRCPRModalVisible, setIsXRCPRModalVisible] = useState(false);
  const [isXRPulseModalVisible, setIsXRPulseModalVisible] = useState(false);

  // Advanced CV detection function - REAL camera analysis
  const runAdvancedCV = async () => {
    if (!isCameraReady || !camRef.current) {
      console.log("❌ Camera not ready for CV");
      return;
    }

    try {
      console.log("🔍 Running REAL computer vision analysis...");

      // Take a photo for REAL analysis
      const photo = await camRef.current.takePictureAsync({
        quality: 0.3, // Lower quality for faster processing
        base64: true,
      });

      if (!photo.base64) {
        console.log("❌ No photo captured for CV");
        return;
      }

      console.log("📸 Photo captured for CV analysis...");

      // Use Gemini for REAL body part detection
      const result = await geminiService.analyzeMedicalScene(
        photo.base64,
        mode
      );

      console.log("🤖 REAL CV Analysis result:", result);

      // Update positions based on REAL detections
      const newPositions: { [key: string]: { x: number; y: number } } = {};

      result.detections.forEach((detection, index) => {
        const key = `${mode}_${index}`;
        // Convert normalized coordinates to screen pixels
        const screenX = detection.x * vw;
        const screenY = detection.y * vh;

        newPositions[key] = {
          x: screenX,
          y: screenY,
        };

        console.log(`📍 REAL CV detected ${detection.label} at:`, {
          normalized: { x: detection.x, y: detection.y },
          screen: { x: screenX, y: screenY },
        });
      });

      setCvPositions(newPositions);
    } catch (error) {
      console.error("❌ REAL CV error:", error);
    }
  };

  // CPR metronome (now using the XR CPR variables above)
  const [running, setRunning] = useState(false);
  const [tickSound, setTickSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});

    // Start emergency session when component mounts
    emergencyCoordinatorService.startEmergencySession(mode);

    // All services now use Gemini - no additional initialization needed
    console.log("✅ Using Gemini for all AI services");

    return () => {
      stopAnalysis();
      stopAdvancedCV();
      stopDispatcher();
      if (tickSound) {
        tickSound.unloadAsync().catch(() => {});
      }
      emergencyCoordinatorService.endEmergencySession();
    };
  }, [mode]);

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);


  const onLayout = (e: any) => {
    setVw(e.nativeEvent.layout.width);
    setVh(e.nativeEvent.layout.height);
  };

  // CPR functions moved to XR CPR section above

  // --- AI Analysis Functions ---
  const analyze = async () => {
    if (!camRef.current || loading) return;
    try {
      setLoading(true);
      setHint(null);
      setDetections([]);

      const photo = await camRef.current.takePictureAsync({
        base64: true,
        quality: 0.75,
      });
      if (!photo?.base64) throw new Error("Could not capture image");

      const result = await geminiService.analyzeMedicalScene(
        photo.base64,
        mode
      );
      setDetections(result.detections);
      setOverallInstruction(result.overallInstruction);
      setHint(result.overallInstruction);

      // Provide haptic feedback for successful analysis
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      setHint(`Analysis failed: ${e?.message ?? "unknown error"}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const startContinuousAnalysis = () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    // Analyze every 5 minutes to respect rate limits (very conservative)
    analysisIntervalRef.current = setInterval(analyze, 300000);
  };

  const stopAnalysis = () => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    setIsAnalyzing(false);
  };

  // --- Medical Dispatcher Functions ---
  const startDispatcher = async () => {
    if (isDispatcherActive) return;
    setIsDispatcherActive(true);

    // Initial dispatcher analysis
    await runDispatcherAnalysis();

    // Run dispatcher analysis every 30 seconds
    dispatcherIntervalRef.current = setInterval(async () => {
      await runDispatcherAnalysis();
    }, 300000);
  };

  const stopDispatcher = () => {
    if (dispatcherIntervalRef.current) {
      clearInterval(dispatcherIntervalRef.current);
      dispatcherIntervalRef.current = null;
    }
    setIsDispatcherActive(false);
  };

  const runDispatcherAnalysis = async () => {
    if (!camRef.current || !isCameraReady) return;

    try {
      console.log("🎯 Running medical dispatcher analysis...");

      // Take photo for analysis
      const photo = await camRef.current.takePictureAsync({
        quality: 0.3,
        base64: true,
      });

      if (!photo.base64) {
        console.log("❌ No photo captured for dispatcher");
        return;
      }

      // Process through emergency coordinator
      const result: CoordinatorResult =
        await emergencyCoordinatorService.processEmergencyImage(
          photo.base64,
          "User performing procedure"
        );

      // Update UI with dispatcher response
      setDispatcherResponse(result.dispatcherResponse);
      setClaudeInput(JSON.stringify(result.dispatcherInput, null, 2));

      // Update detections from Gemini
      setDetections(result.geminiAnalysis.detections);
      setOverallInstruction(result.geminiAnalysis.overallInstruction);
      setHint(result.dispatcherResponse.guidance.primary);

      console.log(
        "🎯 Dispatcher analysis complete:",
        result.dispatcherResponse
      );
    } catch (error) {
      console.error("❌ Dispatcher analysis error:", error);
      setHint(`Dispatcher analysis failed: ${error}`);
    }
  };

  // Advanced CV control functions
  const startAdvancedCV = () => {
    setIsCVEnabled(true);

    // Run CV analysis every 10 seconds to respect rate limits
    cvIntervalRef.current = setInterval(() => {
      runAdvancedCV();
    }, 10000);

    // Initial CV analysis after 3 seconds
    setTimeout(runAdvancedCV, 3000);
  };

  const stopAdvancedCV = () => {
    setIsCVEnabled(false);
    if (cvIntervalRef.current) {
      clearInterval(cvIntervalRef.current);
      cvIntervalRef.current = null;
    }
  };

  // XR Modal handlers
  const openXRCPRModal = () => {
    setIsXRCPRModalVisible(true);
  };

  const closeXRCPRModal = () => {
    setIsXRCPRModalVisible(false);
  };

  const openXRPulseModal = () => {
    setIsXRPulseModalVisible(true);
  };

  const closeXRPulseModal = () => {
    setIsXRPulseModalVisible(false);
  };

  const endEmergency = () => {
    stopAnalysis();
    stopAdvancedCV();
    stopDispatcher();
    router.back();
  };

  // guide frames (normalized)
  const guide =
    mode === "airway"
      ? { x: 0.12, y: 0.18, w: 0.76, h: 0.22 }
      : mode === "pulse"
      ? { x: 0.1, y: 0.55, w: 0.8, h: 0.22 }
      : mode === "cpr"
      ? { x: 0.22, y: 0.58, w: 0.56, h: 0.18 }
      : { x: 0.1, y: 0.65, w: 0.8, h: 0.2 };

  // Calculate alignment for AI detections
  const getAlignedDetections = () => {
    return detections.map((detection) => ({
      ...detection,
      aligned:
        iou(guide, {
          x: detection.x,
          y: detection.y,
          w: detection.width,
          h: detection.height,
        }) >= 0.5,
    }));
  };

  if (!permission)
    return <View style={{ flex: 1, backgroundColor: "black" }} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={st.center}>
        <Text style={st.needPerm}>We need camera access to assist you.</Text>
        <TouchableOpacity onPress={requestPermission} style={st.btnPrimary}>
          <Text style={st.btnTxt}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.root} edges={["top", "left", "right", "bottom"]}>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        {/* CAMERA */}
        <CameraView
          ref={(r) => {
            if (r) camRef.current = r;
          }}
          style={{ flex: 1 }}
          facing="back"
          onCameraReady={() => setIsCameraReady(true)}
        />

        {/* END EMERGENCY ICON BUTTON */}
        <TouchableOpacity style={st.endEmergencyIcon} onPress={endEmergency}>
          <Text style={st.endEmergencyIconTxt}>✕</Text>
        </TouchableOpacity>

        {/* TOP PILLS (≈10% height) */}
        <View style={st.topBar}>
          <Pill
            text="Airway"
            active={mode === "airway"}
            onPress={() => {
              setMode("airway");
              stopAnalysis();
              setHint(null);
              setDetections([]);
            }}
          />
          <Pill
            text="CPR"
            active={mode === "cpr"}
            onPress={() => {
              setMode("cpr");
              stopAnalysis();
              setHint(null);
              setDetections([]);
            }}
          />
          <Pill
            text="Pulse"
            active={mode === "pulse"}
            onPress={() => {
              setMode("pulse");
              stopAnalysis();
              setHint(null);
              setDetections([]);
            }}
          />
          <Pill
            text="Seizure"
            active={mode === "seizure"}
            onPress={() => {
              setMode("seizure");
              stopAnalysis();
              setHint(null);
              setDetections([]);
            }}
          />
        </View>


        {/* ADVANCED CV INDICATORS */}
        {Object.entries(cvPositions).map(([key, position], index) => (
          <View
            key={key}
            pointerEvents="none"
            style={[
              st.customIndicator,
              {
                position: "absolute",
                left: position.x - 50, // Center the indicator
                top: position.y - 40,
                width: 100,
                height: 80,
              },
              st.indicatorGreen,
              // Add pulsing animation for CV indicators
              {
                shadowColor: "#00ff00",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
                elevation: 10,
              },
            ]}
          >
            {/* Custom visual based on mode */}
            {mode === "cpr" && (
              <View style={st.handIcon}>
                <Text style={st.handEmoji}>✋</Text>
                <Text style={st.handText}>HANDS</Text>
              </View>
            )}
            {mode === "airway" && (
              <View style={st.fingerIcon}>
                <Text style={st.fingerEmoji}>👆</Text>
                <Text style={st.fingerText}>FINGERS</Text>
              </View>
            )}
            {mode === "pulse" && (
              <View style={st.pulseIcon}>
                <Text style={st.pulseEmoji}>👆</Text>
                <Text style={st.pulseText}>PULSE</Text>
              </View>
            )}
            {mode === "seizure" && (
              <View style={st.protectionIcon}>
                <Text style={st.protectionEmoji}>🛡️</Text>
                <Text style={st.protectionText}>PROTECT</Text>
              </View>
            )}
            <Text style={st.detectionInstruction}>
              {mode === "pulse"
                ? "CV: Check pulse here"
                : mode === "cpr"
                ? "CV: Place hands here"
                : mode === "airway"
                ? "CV: Place fingers here"
                : "CV: Protect this area"}
            </Text>
          </View>
        ))}



        {/* FLOATING GUIDANCE OVERLAYS */}
        {isAnalyzing && (
          <>
            {/* Top-left floating guidance */}
            <View style={st.floatingGuidanceTop}>
              <Text style={st.floatingTitle}>🤖 AI Guidance Active</Text>
              <Text style={st.floatingText}>
                {overallInstruction || `Monitoring for ${mode} procedure...`}
              </Text>
            </View>

            {/* Bottom-right status indicator */}
            <View style={st.floatingStatus}>
              <Text style={st.statusText}>● LIVE</Text>
            </View>
          </>
        )}

        {/* MEDICAL DISPATCHER OVERLAYS */}
        {isDispatcherActive && dispatcherResponse && (
          <>
            {/* Top-right dispatcher guidance */}
            <View style={st.dispatcherGuidance}>
              <Text style={st.dispatcherTitle}>🎯 Medical Dispatcher</Text>
              <Text style={st.dispatcherPrimary}>
                {dispatcherResponse.guidance.primary}
              </Text>
              {dispatcherResponse.guidance.secondary && (
                <Text style={st.dispatcherSecondary}>
                  {dispatcherResponse.guidance.secondary}
                </Text>
              )}
              <Text style={st.dispatcherUrgency}>
                Urgency: {dispatcherResponse.guidance.urgency.toUpperCase()}
              </Text>
            </View>

            {/* Bottom-left Claude input display */}
            <View style={st.claudeInputDisplay}>
              <Text style={st.claudeInputTitle}>📝 Claude Input (JSON)</Text>
              <Text style={st.claudeInputText} numberOfLines={3}>
                {claudeInput.substring(0, 200)}...
              </Text>
            </View>
          </>
        )}

        {/* BOTTOM CONTROLS (≈12–14% height) */}
        <View style={st.bottomBar}>
          {hint ? <Text style={st.hint}>{hint}</Text> : null}

          {mode === "airway" && (
            <>
              <Row>
                <Btn
                  label="📸 Analyze Now"
                  onPress={analyze}
                  loading={loading}
                />
              </Row>
              {isAnalyzing && (
                <Row>
                  <Btn
                    label="⏹️ Stop AI"
                    type="danger"
                    onPress={stopAnalysis}
                  />
                </Row>
              )}
              <Row>
                <Btn
                  label={
                    isDispatcherActive
                      ? "🎯 Dispatcher ON"
                      : "🎯 Start Dispatcher"
                  }
                  type={isDispatcherActive ? "success" : "primary"}
                  onPress={
                    isDispatcherActive ? stopDispatcher : startDispatcher
                  }
                />
              </Row>
            </>
          )}

          {mode === "pulse" && (
            <>
              <Row>
                <Btn
                  label="📸 Analyze Now"
                  onPress={analyze}
                  loading={loading}
                />
              </Row>
              <Row>
                <Btn
                  label="🫀 XR Pulse Guidance"
                  type="primary"
                  onPress={openXRPulseModal}
                />
              </Row>
              {isAnalyzing && (
                <Row>
                  <Btn
                    label="⏹️ Stop AI"
                    type="danger"
                    onPress={stopAnalysis}
                  />
                </Row>
              )}
              <Row>
                <Btn
                  label={
                    isDispatcherActive
                      ? "🎯 Dispatcher ON"
                      : "🎯 Start Dispatcher"
                  }
                  type={isDispatcherActive ? "success" : "primary"}
                  onPress={
                    isDispatcherActive ? stopDispatcher : startDispatcher
                  }
                />
              </Row>
            </>
          )}

          {mode === "cpr" && (
            <>
              <Row>
                <Btn
                  label="📸 Analyze Now"
                  onPress={analyze}
                  loading={loading}
                />
              </Row>
              <Row>
                <Btn
                  label="🎯 XR CPR Guidance"
                  type="primary"
                  onPress={openXRCPRModal}
                />
              </Row>
              {isAnalyzing && (
                <Row>
                  <Btn
                    label="⏹️ Stop AI"
                    type="danger"
                    onPress={stopAnalysis}
                  />
                </Row>
              )}
              <Row>
                <Btn
                  label={
                    isDispatcherActive
                      ? "🎯 Dispatcher ON"
                      : "🎯 Start Dispatcher"
                  }
                  type={isDispatcherActive ? "success" : "primary"}
                  onPress={
                    isDispatcherActive ? stopDispatcher : startDispatcher
                  }
                />
              </Row>
            </>
          )}

          {mode === "seizure" && (
            <>
              <Row>
                <Btn
                  label="📸 Analyze Now"
                  onPress={analyze}
                  loading={loading}
                />
              </Row>
              {isAnalyzing && (
                <Row>
                  <Btn
                    label="⏹️ Stop AI"
                    type="danger"
                    onPress={stopAnalysis}
                  />
                </Row>
              )}
              <Row>
                <Btn
                  label={
                    isDispatcherActive
                      ? "🎯 Dispatcher ON"
                      : "🎯 Start Dispatcher"
                  }
                  type={isDispatcherActive ? "success" : "primary"}
                  onPress={
                    isDispatcherActive ? stopDispatcher : startDispatcher
                  }
                />
              </Row>
            </>
          )}
        </View>
      </View>

      {/* XR Modals */}
      <XRCPRModal 
        visible={isXRCPRModalVisible} 
        onClose={closeXRCPRModal} 
      />
      <XRPulseModal 
        visible={isXRPulseModalVisible} 
        onClose={closeXRPulseModal} 
      />
    </SafeAreaView>
  );
}

/* ---------- tiny UI bits ---------- */
function Pill({
  text,
  active,
  onPress,
}: {
  text: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[st.pill, active && st.pillActive]}
    >
      <Text style={[st.pillTxt, active && st.pillTxtActive]}>{text}</Text>
    </TouchableOpacity>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <View style={st.row}>{children}</View>;
}
function Btn({
  label,
  onPress,
  type = "primary",
  loading,
}: {
  label: string;
  onPress: () => void;
  type?: "primary" | "success" | "danger";
  loading?: boolean;
}) {
  const style =
    type === "success"
      ? st.btnSuccess
      : type === "danger"
      ? st.btnDanger
      : st.btnPrimary;
  return (
    <TouchableOpacity
      style={[st.btn, style]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text style={st.btnTxt}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

/* ---------- helpers ---------- */
function frameStyle(
  b: { x: number; y: number; w: number; h: number },
  vw: number,
  vh: number
) {
  return {
    position: "absolute" as const,
    left: b.x * vw,
    top: b.y * vh,
    width: b.w * vw,
    height: b.h * vh,
  };
}
function iou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) {
  const ax2 = a.x + a.w,
    ay2 = a.y + a.h;
  const bx2 = b.x + b.w,
    by2 = b.y + b.h;
  const x1 = Math.max(a.x, b.x),
    y1 = Math.max(a.y, b.y);
  const x2 = Math.min(ax2, bx2),
    y2 = Math.min(ay2, by2);
  const iw = Math.max(0, x2 - x1),
    ih = Math.max(0, y2 - y1);
  const inter = iw * ih,
    union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

/* ---------- styles ---------- */
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -30,
    height: "12%",
    borderBottomRightRadius: borderRadius.lg,
    borderBottomLeftRadius: borderRadius.lg,
    paddingTop: Platform.select({ ios: 15, android: 10 }),
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface + "f0",
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface + "f2",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  pill: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillTxt: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
  pillTxtActive: { color: colors.text, fontWeight: "700" },

  frameBase: {
    borderWidth: 3,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  frameRed: { borderColor: "#ef4444" },
  frameGreen: { borderColor: "#22c55e" },
  frameBlue: { borderColor: "#3b82f6" },

  // Custom Visual Indicators - Mode-Specific Icons
  customIndicator: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
    minHeight: 80,
    borderRadius: borderRadius.xl,
    elevation: 8,
  },
  indicatorGreen: {
    backgroundColor: colors.success + "e6",
    borderWidth: 2,
    borderColor: colors.success,
  },
  indicatorRed: {
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    borderWidth: 3,
    borderColor: "#ef4444",
  },

  // CPR Hand Icon
  handIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  handEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  handText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Airway Finger Icon
  fingerIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  fingerEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  fingerText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Pulse Check Icon
  pulseIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  pulseText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Seizure Protection Icon
  protectionIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  protectionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  protectionText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "bold",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  detectionInstruction: {
    color: colors.text,
    fontSize: 9,
    textAlign: "center",
    lineHeight: 11,
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: 90,
  },

  // End Emergency Icon Button
  endEmergencyIcon: {
    position: "absolute",
    top: Platform.select({ ios: 70, android: 40 }),
    right: spacing.sm,
    width: 44,
    height: 44,
    backgroundColor: colors.danger,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  endEmergencyIconTxt: {
    color: colors.text,
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Floating Guidance Overlays
  floatingGuidanceTop: {
    position: "absolute",
    top: Platform.select({ ios: 100, android: 80 }),
    left: spacing.md,
    backgroundColor: colors.surface + "e6",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: "70%",
    elevation: 5,
  },
  floatingTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  floatingText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  floatingStatus: {
    position: "absolute",
    bottom: Platform.select({ ios: 120, android: 100 }),
    right: spacing.md,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },

  // Medical Dispatcher Styles
  dispatcherGuidance: {
    position: "absolute",
    top: Platform.select({ ios: 100, android: 80 }),
    right: spacing.md,
    backgroundColor: colors.surface + "e6",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent + "60",
    maxWidth: "60%",
    elevation: 5,
  },
  dispatcherTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  dispatcherPrimary: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  dispatcherSecondary: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 4,
  },
  dispatcherUrgency: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  claudeInputDisplay: {
    position: "absolute",
    bottom: Platform.select({ ios: 120, android: 100 }),
    left: spacing.md,
    backgroundColor: colors.surface + "e6",
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: "70%",
    elevation: 5,
  },
  claudeInputTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  claudeInputText: {
    color: colors.text,
    fontSize: 10,
    fontFamily: "monospace",
    lineHeight: 12,
  },

  row: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  btn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    elevation: 2,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnSuccess: {
    backgroundColor: colors.success,
    borderWidth: 1,
    borderColor: colors.success,
  },
  btnDanger: {
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  btnTxt: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },

  label: {
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    lineHeight: 20,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  needPerm: { color: colors.text, fontSize: 16, marginBottom: 10 },
});
