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
import { setAudioModeAsync } from "expo-audio";

// Import our services and components
import {
  pulseDetectionService,
  PulseDetectionResult,
  PulseTarget,
  PulsePosition,
} from "../services/pulseDetection";
import { colors, spacing, borderRadius } from "../constants/theme";
import { PulseOverlay } from "./ar/PulseOverlay";
import { PulseGuide } from "./ar/PulseGuide";
import { PulseInstructionOverlay } from "./ar/PulseInstructionOverlay";

type PulseDetectionStatus =
  | "detecting"
  | "person_found"
  | "pulse_position_found"
  | "finger_correct"
  | "finger_adjust"
  | "finger_incorrect"
  | "no_person";

interface XRPulseModalProps {
  visible: boolean;
  onClose: () => void;
}

export function XRPulseModal({ visible, onClose }: XRPulseModalProps) {
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

  // Pulse detection results
  const [pulseResult, setPulseResult] = useState<PulseDetectionResult | null>(null);
  const [pulseTarget, setPulseTarget] = useState<PulseTarget | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<PulseDetectionStatus>("detecting");
  const [instruction, setInstruction] = useState("Initializing camera and AI models...");

  // Pulse position management
  const [currentPosition, setCurrentPosition] = useState<PulsePosition>("carotid");
  const positions: PulsePosition[] = ["carotid", "brachial", "radial"];

  // Pulse timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(10);
  const timerRef = useRef<number | null>(null);

  // Instruction overlay state
  const [isInstructionMinimized, setIsInstructionMinimized] = useState(false);

  // Initialize pulse detection service
  useEffect(() => {
    if (!visible) return;
    
    const initializePulseDetection = async () => {
      try {
        setInstruction("Loading AI models...");
        await pulseDetectionService.initialize();
        setIsInitialized(true);
        setInstruction("Position camera to see person, then tap 'Take Photo'");
        setDetectionStatus("detecting");
      } catch (error) {
        console.error("Failed to initialize pulse detection:", error);
        setInstruction("Failed to load AI models. Please restart the app.");
        Alert.alert(
          "Initialization Error",
          "Failed to load pulse detection models. Please restart the app."
        );
      }
    };

    initializePulseDetection();

    return () => {
      pulseDetectionService.dispose();
    };
  }, [visible]);

  // Audio setup
  useEffect(() => {
    if (visible) {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    return () => stopTimer();
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
      setPulseResult(null);
      setPulseTarget(null);
      setDetectionStatus("detecting");
      setInstruction("Initializing camera and AI models...");
      setCurrentPosition("carotid");
      setIsInstructionMinimized(false);
      stopTimer();
    }
  }, [visible]);

  // Pulse timer functions
  const startTimer = useCallback(() => {
    if (timerActive) return;
    setTimerActive(true);
    setTimerSeconds(10);
    
    Speech.speak("Starting pulse check. Count the beats.", { rate: 1.0, pitch: 1.0 });
    
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          // Timer finished
          setTimerActive(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Speech.speak("Time up. Did you feel a pulse?", { rate: 1.0, pitch: 1.0 });
          return 0;
        }
        
        // Haptic feedback every second
        if (prev <= 5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        
        return prev - 1;
      });
    }, 1000) as unknown as number;
  }, [timerActive]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setTimerActive(false);
    setTimerSeconds(10);
    Speech.stop();
  }, []);

  // Pulse position cycling
  const cyclePosition = useCallback(() => {
    const currentIndex = positions.indexOf(currentPosition);
    const nextIndex = (currentIndex + 1) % positions.length;
    const nextPosition = positions[nextIndex];
    
    setCurrentPosition(nextPosition);
    
    // Update target for new position if we have detection results
    if (pulseResult) {
      const newTarget = pulseDetectionService.calculatePulseTarget(
        pulseResult,
        nextPosition
      );
      setPulseTarget(newTarget);
      updateDetectionStatusForPosition(pulseResult, nextPosition);
    }
    
    // Announce position change
    const positionName = pulseDetectionService.getPositionInstructions(nextPosition).title;
    Speech.speak(`Switched to ${positionName}`, { rate: 1.0, pitch: 1.0 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [currentPosition, pulseResult]);

  // Pulse detection function
  const detectPulse = useCallback(async () => {
    if (!isInitialized || !isDetecting || !isCameraReady) return;

    if (!cameraRef.current) {
      console.log("Camera not ready, retrying in 1 second...");
      setTimeout(() => {
        if (isDetecting) detectPulse();
      }, 1000);
      return;
    }

    try {
      console.log("Taking photo for pulse detection...");

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo.base64 || !photo.uri) {
        console.log("No photo captured, retrying...");
        setTimeout(() => {
          if (isDetecting) detectPulse();
        }, 1000);
        return;
      }

      console.log("Photo captured, freezing camera view...");
      setCapturedPhotoUri(photo.uri);
      setIsPhotoTaken(true);

      console.log("Running pulse detection on frozen image...");
      const result = await pulseDetectionService.detectPulse(photo.base64, currentPosition);
      setPulseResult(result);

      updateDetectionStatusForPosition(result, currentPosition);
      setIsDetecting(false);
    } catch (error) {
      console.error("Pulse detection error:", error);
      setInstruction("Failed to capture photo. Please try again.");
      setIsDetecting(false);
    }
  }, [isInitialized, isDetecting, isCameraReady, currentPosition]);

  // Update detection status based on pulse result
  const updateDetectionStatusForPosition = useCallback(
    (result: PulseDetectionResult, position: PulsePosition) => {
      if (!result.isPersonDetected) {
        setDetectionStatus("no_person");
        setInstruction("Position camera to see person, then tap 'Take Photo'");
        setPulseTarget(null);
        return;
      }

      const target = pulseDetectionService.calculatePulseTarget(result, position);
      setPulseTarget(target);

      if (!target) {
        setDetectionStatus("person_found");
        const positionInfo = pulseDetectionService.getPositionInstructions(position);
        setInstruction(`Person detected. Adjust angle to see ${positionInfo.title.toLowerCase()}`);
        return;
      }

      setDetectionStatus("pulse_position_found");
      const positionInfo = pulseDetectionService.getPositionInstructions(position);
      setInstruction(`${positionInfo.title} detected. Place fingers on the target marker`);

      if (target) {
        const accuracy = pulseDetectionService.calculateFingerPlacementAccuracy(
          target,
          result.fingerPositions,
          imageWidth,
          imageHeight
        );

        switch (accuracy) {
          case "correct":
            setDetectionStatus("finger_correct");
            setInstruction(`Perfect placement! ${positionInfo.technique}`);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case "adjust":
            setDetectionStatus("finger_adjust");
            setInstruction("Move fingers closer to the target marker");
            break;
          case "incorrect":
            setDetectionStatus("finger_incorrect");
            setInstruction(`Place 2-3 fingers on the target marker. ${positionInfo.technique}`);
            break;
        }
      }
    },
    [imageWidth, imageHeight]
  );

  // Start/stop detection
  const toggleDetection = useCallback(() => {
    if (isDetecting) {
      setIsDetecting(false);
      setInstruction("Detection stopped");
    } else {
      setIsDetecting(true);
      setInstruction("Starting pulse detection...");
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

  // Run pulse detection when detection is enabled
  useEffect(() => {
    if (isDetecting && isInitialized) {
      detectPulse();
    }
  }, [isDetecting, isInitialized, detectPulse]);

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
            We need camera access for XR pulse guidance.
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
          <Text style={styles.title}>XR Pulse Guidance</Text>
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
          {isPhotoTaken && pulseResult && (
            <>
              <PulseOverlay
                keypoints={pulseResult?.keypoints || []}
                pulsePoints={pulseResult.pulsePoints}
                currentPosition={currentPosition}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                visible={true}
              />
              <PulseGuide
                target={pulseTarget}
                imageWidth={imageWidth}
                imageHeight={imageHeight}
                accuracy={
                  detectionStatus === "finger_correct"
                    ? "correct"
                    : detectionStatus === "finger_adjust"
                    ? "adjust"
                    : "incorrect"
                }
                visible={pulseTarget !== null}
              />
              <PulseInstructionOverlay
                instruction={instruction}
                status={detectionStatus}
                confidence={pulseResult?.confidence}
                currentPosition={currentPosition}
                timerActive={timerActive}
                timerSeconds={timerSeconds}
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

          {/* Position Cycling Controls */}
          {pulseResult && (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={cyclePosition}
              >
                <Text style={styles.btnTxt}>
                  Switch Position ({currentPosition.charAt(0).toUpperCase() + currentPosition.slice(1)})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Retry button */}
          {!isDetecting && pulseResult && (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => {
                  setPulseResult(null);
                  setPulseTarget(null);
                  setDetectionStatus("detecting");
                  setInstruction("Position camera to see person, then tap 'Take Photo'");
                  setIsPhotoTaken(false);
                  setCapturedPhotoUri(null);
                  stopTimer();
                }}
              >
                <Text style={styles.btnTxt}>Take Another Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pulse Timer Controls */}
          {(detectionStatus === "finger_correct" || detectionStatus === "finger_adjust") && (
            <View style={styles.pulseControls}>
              <Text style={styles.label}>
                Pulse Check Timer: {pulseDetectionService.getPositionInstructions(currentPosition).title}
              </Text>
              {!timerActive ? (
                <TouchableOpacity style={styles.btnSuccess} onPress={startTimer}>
                  <Text style={styles.btnTxt}>Start 10-Second Timer</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.timerDisplay}>
                  <TouchableOpacity style={styles.btnDanger} onPress={stopTimer}>
                    <Text style={styles.btnTxt}>Stop Timer ({timerSeconds}s)</Text>
                  </TouchableOpacity>
                </View>
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
const getStatusColor = (status: PulseDetectionStatus): string => {
  switch (status) {
    case "detecting":
      return "#3b82f6";
    case "person_found":
      return "#22c55e";
    case "pulse_position_found":
      return "#22c55e";
    case "finger_correct":
      return "#22c55e";
    case "finger_adjust":
      return "#f59e0b";
    case "finger_incorrect":
      return "#ef4444";
    case "no_person":
      return "#6b7280";
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
    fontWeight: "bold",
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
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlRow: {
    marginBottom: 16,
  },
  pulseControls: {
    backgroundColor: colors.surfaceElevated,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  timerDisplay: {
    alignItems: "center",
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
