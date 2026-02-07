// components/ar/PulseInstructionOverlay.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { PulsePosition } from "../../services/pulseDetection";

type PulseDetectionStatus =
  | "detecting"
  | "person_found"
  | "pulse_position_found"
  | "finger_correct"
  | "finger_adjust"
  | "finger_incorrect"
  | "no_person";

interface PulseInstructionOverlayProps {
  instruction: string;
  status: PulseDetectionStatus;
  confidence?: number;
  currentPosition: PulsePosition;
  timerActive: boolean;
  timerSeconds: number;
  visible?: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const PulseInstructionOverlay: React.FC<PulseInstructionOverlayProps> = ({
  instruction,
  status,
  confidence,
  currentPosition,
  timerActive,
  timerSeconds,
  visible = true,
  isMinimized = false,
  onToggleMinimize,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) {
    return null;
  }

  const getStatusColor = () => {
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

  const getPositionInfo = () => {
    switch (currentPosition) {
      case "carotid":
        return {
          name: "Carotid Pulse",
          location: "Side of neck",
          technique: "2-3 fingers, gentle pressure",
          useCase: "Emergency/Unconscious adults",
        };
      case "brachial":
        return {
          name: "Brachial Pulse",
          location: "Inside upper arm",
          technique: "2-3 fingers, between muscles",
          useCase: "Children & infants",
        };
      case "radial":
        return {
          name: "Radial Pulse",
          location: "Thumb side of wrist",
          technique: "2-3 fingers, light pressure",
          useCase: "Conscious patients",
        };
      default:
        return {
          name: "Carotid Pulse",
          location: "Side of neck",
          technique: "2-3 fingers, gentle pressure",
          useCase: "Emergency/Unconscious adults",
        };
    }
  };

  const positionInfo = getPositionInfo();

  // Show minimized version when isMinimized is true
  if (isMinimized) {
    return (
      <Animated.View style={[styles.minimizedContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.minimizedButton, { backgroundColor: getStatusColor() }]}
          onPress={onToggleMinimize}
          activeOpacity={0.8}
        >
          <Text style={styles.minimizedText}>📋 {positionInfo.name}</Text>
          {timerActive && (
            <Text style={styles.minimizedTimer}>{timerSeconds}s</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Status Header with Close Button */}
      <View style={[styles.statusHeader, { backgroundColor: getStatusColor() }]}>
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>Pulse Check - {positionInfo.name}</Text>
          {confidence != null && confidence > 0 ? (
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(confidence * 100)}%
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          {timerActive && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{timerSeconds}s</Text>
            </View>
          )}
          {onToggleMinimize && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onToggleMinimize}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Instruction */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>{instruction}</Text>
      </View>

      {/* Position Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{positionInfo.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Technique:</Text>
          <Text style={styles.detailValue}>{positionInfo.technique}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Best for:</Text>
          <Text style={styles.detailValue}>{positionInfo.useCase}</Text>
        </View>
      </View>

      {/* Timer Progress Bar */}
      {timerActive && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${((10 - timerSeconds) / 10) * 100}%`,
                backgroundColor: timerSeconds > 3 ? "#22c55e" : "#f59e0b",
              },
            ]}
          />
        </View>
      )}

      {/* Important Notes */}
      <View style={styles.notesContainer}>
        <Text style={styles.noteText}>
          ⚠️ Never use your thumb - it has its own pulse
        </Text>
        <Text style={styles.noteText}>
          ⏱️ Check for up to 10 seconds maximum
        </Text>
        {currentPosition === "carotid" && (
          <Text style={styles.noteText}>
            🚨 Don't press both sides of neck simultaneously
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  minimizedContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1000,
  },
  minimizedButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  minimizedText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 8,
  },
  minimizedTimer: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  confidenceText: {
    color: "#ffffff",
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  timerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  instructionContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  instructionText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailLabel: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "600",
    width: 80,
  },
  detailValue: {
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
  },
  progressContainer: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  notesContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 12,
    borderRadius: 8,
  },
  noteText: {
    color: "#e2e8f0",
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
});
