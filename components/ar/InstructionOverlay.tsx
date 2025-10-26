// components/ar/InstructionOverlay.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface InstructionOverlayProps {
  instruction: string;
  status:
    | "detecting"
    | "person_found"
    | "hands_correct"
    | "hands_adjust"
    | "hands_incorrect"
    | "no_person"
    | "not_lying_down";
  confidence?: number;
  visible?: boolean;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const InstructionOverlay: React.FC<InstructionOverlayProps> = ({
  instruction,
  status,
  confidence,
  visible = true,
  isMinimized = false,
  onToggleMinimize,
}) => {
  if (!visible) {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case "detecting":
        return "#3b82f6"; // Blue
      case "person_found":
        return "#22c55e"; // Green
      case "hands_correct":
        return "#22c55e"; // Green
      case "hands_adjust":
        return "#f59e0b"; // Yellow
      case "hands_incorrect":
        return "#ef4444"; // Red
      case "no_person":
        return "#6b7280"; // Gray
      case "not_lying_down":
        return "#f59e0b"; // Yellow
      default:
        return "#3b82f6"; // Blue
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "detecting":
        return "🔍";
      case "person_found":
        return "✅";
      case "hands_correct":
        return "🎯";
      case "hands_adjust":
        return "⚠️";
      case "hands_incorrect":
        return "❌";
      case "no_person":
        return "👤";
      case "not_lying_down":
        return "🔄";
      default:
        return "ℹ️";
    }
  };

  // Show minimized version when isMinimized is true
  if (isMinimized) {
    return (
      <View style={styles.minimizedContainer}>
        <TouchableOpacity
          style={[styles.minimizedButton, { backgroundColor: getStatusColor() }]}
          onPress={onToggleMinimize}
          activeOpacity={0.8}
        >
          <Text style={styles.minimizedText}>📋 CPR Guidance</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.instructionCard,
          {
            backgroundColor: getStatusColor(),
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.statusContent}>
            <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
            <Text style={styles.statusText}>
              {status.replace("_", " ").toUpperCase()}
            </Text>
          </View>
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

        <Text style={styles.instructionText}>{instruction}</Text>

        {confidence !== undefined && (
          <View style={styles.confidenceContainer}>
            <Text style={styles.confidenceLabel}>Confidence:</Text>
            <Text style={styles.confidenceValue}>
              {Math.round(confidence * 100)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50, // Smaller, more precise positioning
    left: 20,
    right: 20,
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
  },
  instructionCard: {
    padding: 12, // Smaller padding
    borderRadius: 10, // Smaller border radius
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  statusIcon: {
    fontSize: 16, // Smaller icon
    marginRight: 6,
  },
  statusText: {
    color: "white",
    fontSize: 12, // Smaller text
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  instructionText: {
    color: "white",
    fontSize: 14, // Smaller text
    fontWeight: "600",
    lineHeight: 18, // Smaller line height
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
  },
  confidenceLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 10, // Smaller text
    marginRight: 6,
  },
  confidenceValue: {
    color: "white",
    fontSize: 10, // Smaller text
    fontWeight: "bold",
  },
});
