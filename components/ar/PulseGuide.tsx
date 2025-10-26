// components/ar/PulseGuide.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PulseTarget } from "../../services/pulseDetection";

interface PulseGuideProps {
  target: PulseTarget | null;
  imageWidth: number;
  imageHeight: number;
  accuracy: "correct" | "adjust" | "incorrect";
  visible?: boolean;
}

export const PulseGuide: React.FC<PulseGuideProps> = ({
  target,
  imageWidth,
  imageHeight,
  accuracy,
  visible = true,
}) => {
  if (!visible || !target) {
    return null;
  }

  const targetX = target.x * imageWidth;
  const targetY = target.y * imageHeight;

  const getAccuracyColor = () => {
    switch (accuracy) {
      case "correct":
        return "#22c55e"; // Green
      case "adjust":
        return "#f59e0b"; // Orange
      case "incorrect":
        return "#ef4444"; // Red
      default:
        return "#3b82f6"; // Blue
    }
  };

  const getAccuracyMessage = () => {
    switch (accuracy) {
      case "correct":
        return "✓ Perfect placement!";
      case "adjust":
        return "⚠ Adjust finger position";
      case "incorrect":
        return "✗ Place fingers on target";
      default:
        return "Position fingers on target";
    }
  };

  const getPositionName = () => {
    switch (target.position) {
      case "carotid":
        return "Carotid (Neck)";
      case "brachial":
        return "Brachial (Upper Arm)";
      case "radial":
        return "Radial (Wrist)";
    }
  };

  return (
    <View
      style={[styles.container, { width: imageWidth, height: imageHeight }]}
      pointerEvents="none"
    >
      {/* Main target marker */}
      <View
        style={[
          styles.targetMarker,
          {
            left: targetX - 25,
            top: targetY - 25,
            borderColor: getAccuracyColor(),
          },
        ]}
      >
        {/* Inner targeting circle */}
        <View
          style={[
            styles.innerCircle,
            {
              borderColor: getAccuracyColor(),
            },
          ]}
        />

        {/* Two-finger placement guides */}
        <View style={[styles.fingerGuide, styles.finger1]} />
        <View style={[styles.fingerGuide, styles.finger2]} />
      </View>

      {/* Crosshairs for precision */}
      <View
        style={[
          styles.crosshair,
          styles.crosshairHorizontal,
          {
            left: targetX - 15,
            top: targetY - 1,
            backgroundColor: getAccuracyColor(),
          },
        ]}
      />
      <View
        style={[
          styles.crosshair,
          styles.crosshairVertical,
          {
            left: targetX - 1,
            top: targetY - 15,
            backgroundColor: getAccuracyColor(),
          },
        ]}
      />

      {/* Position label */}
      <View
        style={[
          styles.positionLabel,
          {
            left: targetX - 60,
            top: targetY - 60,
            backgroundColor: getAccuracyColor(),
          },
        ]}
      >
        <Text style={styles.positionLabelText}>{getPositionName()}</Text>
      </View>

      {/* Accuracy feedback */}
      <View
        style={[
          styles.accuracyFeedback,
          {
            left: targetX - 80,
            top: targetY + 40,
            backgroundColor: getAccuracyColor(),
          },
        ]}
      >
        <Text style={styles.accuracyText}>{getAccuracyMessage()}</Text>
      </View>

      {/* Pulsing animation for active target */}
      {accuracy !== "correct" && (
        <View
          style={[
            styles.pulsingRing,
            {
              left: targetX - 35,
              top: targetY - 35,
              borderColor: getAccuracyColor(),
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  targetMarker: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  innerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  fingerGuide: {
    position: "absolute",
    width: 8,
    height: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  finger1: {
    left: -2,
    top: -8,
  },
  finger2: {
    left: 6,
    top: -8,
  },
  crosshair: {
    position: "absolute",
    opacity: 0.8,
  },
  crosshairHorizontal: {
    width: 30,
    height: 2,
  },
  crosshairVertical: {
    width: 2,
    height: 30,
  },
  positionLabel: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  positionLabelText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  accuracyFeedback: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  accuracyText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  pulsingRing: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    opacity: 0.6,
  },
});
