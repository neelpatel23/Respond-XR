import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import Slider from "@react-native-community/slider";

// Import our services and components
import {
  poseDetectionService,
  PoseDetectionResult,
  HandPlacementTarget,
} from "../services/poseDetection";
import { colors, spacing, borderRadius } from "../constants/theme";
import { PoseOverlay } from "./ar/PoseOverlay";
import { HandPlacementGuide } from "./ar/HandPlacementGuide";
import { InstructionOverlay } from "./ar/InstructionOverlay";

type DetectionStatus =
  | "detecting"
  | "person_found"
  | "hands_correct"
  | "hands_adjust"
  | "hands_incorrect"
  | "no_person"
  | "not_lying_down";

interface XRCPRModalProps {
  visible: boolean;
  onClose: () => void;
}

export function XRCPRModal({ visible, onClose }: XRCPRModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  // Camera and detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isPhotoTaken, setIsPhotoTaken] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);

  // Pose detection results
  const [poseResult, setPoseResult] = useState<PoseDetectionResult | null>(null);
  const [handPlacementTarget, setHandPlacementTarget] = useState<HandPlacementTarget | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>("detecting");
  const [instruction, setInstruction] = useState("Initializing camera and AI models...");

  // CPR metronome state
  const [bpm, setBpm] = useState(110);
  const [running, setRunning] = useState(false);
  const tickRef = useRef<number | null>(null);
  const beatCount = useRef(0);
  const player = useAudioPlayer(require("../assets/sounds/tick.mp3"));

  // Instruction overlay state
  const [isInstructionMinimized, setIsInstructionMinimized] = useState(false);

  // Initialize pose detection service
  useEffect(() => {
    if (!visible) return;
    
    const initializePoseDetection = async () => {
      try {
        setInstruction("Loading AI models...");
        await poseDetectionService.initialize();
        setIsInitialized(true);
        setInstruction("Position camera to see person lying down, then tap 'Take Photo'");
        setDetectionStatus("detecting");
      } catch (error) {
        console.error("Failed to initialize pose detection:", error);
        setInstruction("Failed to load AI models. Please restart the app.");
        Alert.alert(
          "Initialization Error",
          "Failed to load pose detection models. Please restart the app."
        );
      }
    };

    initializePoseDetection();

    return () => {
      poseDetectionService.dispose();
    };
  }, [visible]);

  // Audio setup
  useEffect(() => {
    if (visible) {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    return () => stopCpr();
  }, [visible]);

  // Camera permission
  useEffect(() => {
    if (!permission && visible) requestPermission();
  }, [permission, visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setIsDetecting(false);
      setIsPhotoTaken(false);
      setCapturedPhotoUri(null);
      setPoseResult(null);
      setHandPlacementTarget(null);
      setDetectionStatus("detecting");
      setInstruction("Initializing camera and AI models...");
      setIsInstructionMinimized(false);
      stopCpr();
    }
  }, [visible]);

  // CPR metronome functions
  const tickOnce = useCallback(() => {
    beatCount.current += 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      player.seekTo(0);
      player.play();
    } catch {}
    if (beatCount.current % 2 === 0) {
      Speech.speak("push", { rate: 1.0, pitch: 1.0 });
    }
  }, [player]);

  const startCpr = useCallback(() => {
    if (running) return;
    setRunning(true);
    beatCount.current = 0;
    const rate = Math.max(100, Math.min(120, bpm));
    const ms = 60000 / rate;
    tickOnce();
    tickRef.current = setInterval(tickOnce, ms) as unknown as number;
  }, [running, bpm, tickOnce]);

  const stopCpr = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setRunning(false);
    Speech.stop();
  }, []);

  // Re-time when BPM changes
  useEffect(() => {
    if (running) {
      stopCpr();
      startCpr();
    }
  }, [bpm, running, stopCpr, startCpr]);

  // Update detection status based on pose result
  const updateDetectionStatus = useCallback(
    (result: PoseDetectionResult) => {
      if (result.keypoints.length === 0) {
        setDetectionStatus("no_person");
        setInstruction("Position camera to see person lying down, then tap 'Take Photo'");
        setHandPlacementTarget(null);
        return;
      }

      if (!result.isPersonLyingDown) {
        setDetectionStatus("not_lying_down");
        setInstruction("Person must be lying flat on their back");
        setHandPlacementTarget(null);
        return;
      }

      if (!result.chestCenter) {
        setDetectionStatus("person_found");
        setInstruction("Adjust camera angle to better see the person's chest");
        setHandPlacementTarget(null);
        return;
      }

      setDetectionStatus("person_found");
      setInstruction("Place your hands on the target marker shown on the frozen image");

      const target = poseDetectionService.calculateHandPlacementTarget(result);
      setHandPlacementTarget(target);

      if (target) {
        const accuracy = poseDetectionService.calculateHandPlacementAccuracy(
          target,
          result.handPositions,
          imageWidth,
          imageHeight
        );

        switch (accuracy) {
          case "correct":
            setDetectionStatus("hands_correct");
            setInstruction("Perfect! Keep hands here and start CPR");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case "adjust":
            setDetectionStatus("hands_adjust");
            setInstruction("Move hands closer to the target marker");
            break;
          case "incorrect":
            setDetectionStatus("hands_incorrect");
            setInstruction("Place both hands on the target marker shown");
            break;
        }
      }
    },
    [imageWidth, imageHeight]
  );

  // Pose detection function
  const detectPose = useCallback(async () => {
    if (!isInitialized || !isDetecting || !isCameraReady) return;

    if (!cameraRef.current) {
      console.log("Camera not ready, retrying in 1 second...");
      setTimeout(() => {
        if (isDetecting) detectPose();
      }, 1000);
      return;
    }

    try {
      console.log("Taking photo for pose detection...");

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo.base64 || !photo.uri) {
        console.log("No photo captured, retrying...");
        setTimeout(() => {
          if (isDetecting) detectPose();
        }, 1000);
        return;
      }

      console.log("Photo captured, freezing camera view...");
      setCapturedPhotoUri(photo.uri);
      setIsPhotoTaken(true);

      console.log("Running pose detection on frozen image...");
      const result = await poseDetectionService.detectPose(photo.base64);
      setPoseResult(result);

      updateDetectionStatus(result);
      setIsDetecting(false);
    } catch (error) {
      console.error("Pose detection error:", error);
      setInstruction("Failed to capture photo. Please try again.");
      setIsDetecting(false);
    }
  }, [isInitialized, isDetecting, updateDetectionStatus]);

  // Start/stop detection
  const toggleDetection = useCallback(() => {
    if (isDetecting) {
      setIsDetecting(false);
      setInstruction("Detection stopped");
    } else {
      setIsDetecting(true);
      setInstruction("Starting pose detection...");
    }
  }, [isDetecting]);

  // Toggle instruction overlay minimize state
  const toggleInstructionMinimize = useCallback(() => {
    setIsInstructionMinimized(prev => !prev);
  }, []);

  // Camera layout handler
  const onLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setImageWidth(width);
    setImageHeight(height);
  }, []);

  // Run pose detection when detection is enabled
  useEffect(() => {
    if (isDetecting && isInitialized) {
      detectPose();
    }
  }, [isDetecting, isInitialized, detectPose]);

  if (!visible) {
    return null;
  }

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.container} />
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.center}>
          <Text style={styles.needPerm}>
            We need camera access for XR guidance.
          </Text>
          <TouchableOpacity onPress={requestPermission} style={styles.btnPrimary}>
            <Text style={styles.btnTxt}>Grant Permission</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>XR CPR Guidance</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Camera View */}
        <View style={styles.cameraContainer} onLayout={onLayout}>
          {isPhotoTaken && capturedPhotoUri ? (
            <Image
              source={{ uri: capturedPhotoUri }}
              style={styles.camera}
              resizeMode="cover"
            />
          ) : (
            <CameraView
              ref={(r) => {
                if (r) cameraRef.current = r;
              }}
              style={styles.camera}
              facing="back"
              onCameraReady={() => {
                console.log("Camera is ready");
                setIsCameraReady(true);
              }}
            />
          )}

          {/* Frozen Image Indicator */}
          {isPhotoTaken && (
            <View style={styles.frozenIndicator}>
              <Text style={styles.frozenText}>
                📸 Image Frozen - AR Overlay Active
              </Text>
            </View>
          )}

          {/* AR Overlays */}
          {isPhotoTaken && poseResult && (
            <>
              <PoseOverlay
                keypoints={poseResult?.keypoints || []}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                visible={true}
              />
              <HandPlacementGuide
                target={handPlacementTarget}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                accuracy={
                  detectionStatus === "hands_correct"
                    ? "correct"
                    : detectionStatus === "hands_adjust"
                    ? "adjust"
                    : "incorrect"
                }
                visible={handPlacementTarget !== null}
              />
              <InstructionOverlay
                instruction={instruction}
                status={detectionStatus}
                confidence={poseResult?.confidence}
                visible={true}
                isMinimized={isInstructionMinimized}
                onToggleMinimize={toggleInstructionMinimize}
              />
            </>
          )}
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          {/* Detection Controls */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                isDetecting ? styles.btnSuccess : styles.btnPrimary,
              ]}
              onPress={toggleDetection}
              disabled={!isInitialized || !isCameraReady || isPhotoTaken}
            >
              {!isInitialized ? (
                <ActivityIndicator color="#fff" />
              ) : !isCameraReady ? (
                <Text style={styles.btnTxt}>Camera Loading...</Text>
              ) : (
                <Text style={styles.btnTxt}>
                  {isDetecting
                    ? "Analyzing..."
                    : isPhotoTaken
                    ? "Photo Captured"
                    : "Take Photo"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Retry button */}
          {!isDetecting && poseResult && (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => {
                  setPoseResult(null);
                  setHandPlacementTarget(null);
                  setDetectionStatus("detecting");
                  setInstruction("Position camera to see person lying down, then tap 'Take Photo'");
                  setIsPhotoTaken(false);
                  setCapturedPhotoUri(null);
                }}
              >
                <Text style={styles.btnTxt}>Take Another Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CPR Metronome Controls */}
          {detectionStatus === "hands_correct" && (
            <View style={styles.cprControls}>
              <Text style={styles.label}>CPR Rate: {bpm} /min</Text>
              <Slider
                minimumValue={100}
                maximumValue={120}
                step={1}
                value={bpm}
                onValueChange={(v) => setBpm(Math.round(v))}
                style={styles.slider}
              />
              {!running ? (
                <TouchableOpacity style={styles.btnSuccess} onPress={startCpr}>
                  <Text style={styles.btnTxt}>Start CPR</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.btnDanger} onPress={stopCpr}>
                  <Text style={styles.btnTxt}>Stop CPR</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(detectionStatus) },
              ]}
            />
            <Text style={styles.statusText}>
              {detectionStatus.replace("_", " ").toUpperCase()}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// Helper function for status color
const getStatusColor = (status: DetectionStatus): string => {
  switch (status) {
    case "detecting":
      return "#3b82f6";
    case "person_found":
      return "#22c55e";
    case "hands_correct":
      return "#22c55e";
    case "hands_adjust":
      return "#f59e0b";
    case "hands_incorrect":
      return "#ef4444";
    case "no_person":
      return "#6b7280";
    case "not_lying_down":
      return "#f59e0b";
    default:
      return "#3b82f6";
  }
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  needPerm: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backBtnText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  placeholder: {
    width: 60,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  bottomBar: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlRow: {
    marginBottom: 16,
  },
  cprControls: {
    backgroundColor: colors.surfaceElevated,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  slider: {
    width: "100%",
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
  btnSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#9ca3af",
    marginTop: 8,
  },
  btnTxt: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 14,
  },
  frozenIndicator: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.surface + "cc",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    zIndex: 1000,
  },
  frozenText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "bold",
  },
});
