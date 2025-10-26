// components/ar/PulseOverlay.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { PulseKeypoint, PulsePosition } from "../../services/pulseDetection";

interface PulseOverlayProps {
  keypoints: PulseKeypoint[];
  pulsePoints: {
    carotid: { x: number; y: number } | null;
    brachial: { x: number; y: number } | null;
    radial: { x: number; y: number } | null;
  };
  currentPosition: PulsePosition;
  imageWidth: number;
  imageHeight: number;
  visible?: boolean;
}

// Color coding for different pulse positions
const PULSE_COLORS = {
  carotid: "#ff4444", // Red - critical/emergency
  brachial: "#44ff44", // Green - children/infants
  radial: "#4444ff", // Blue - conscious patients
};

export const PulseOverlay: React.FC<PulseOverlayProps> = ({
  keypoints,
  pulsePoints,
  currentPosition,
  imageWidth,
  imageHeight,
  visible = true,
}) => {
  if (!visible || keypoints.length === 0) {
    return null;
  }

  const renderKeypoint = (keypoint: PulseKeypoint, index: number) => {
    if (keypoint.score < 0.3) return null;

    return (
      <View
        key={index}
        style={[
          styles.keypoint,
          {
            left: keypoint.x - 3,
            top: keypoint.y - 3,
          },
        ]}
      />
    );
  };

  const renderPulsePoint = (
    position: PulsePosition,
    point: { x: number; y: number } | null
  ) => {
    if (!point) return null;

    const isActive = position === currentPosition;
    const color = PULSE_COLORS[position];

    return (
      <View
        key={position}
        style={[
          styles.pulsePoint,
          isActive ? styles.activePulsePoint : styles.inactivePulsePoint,
          {
            left: point.x * imageWidth - 12,
            top: point.y * imageHeight - 12,
            borderColor: color,
            backgroundColor: isActive ? color : "transparent",
          },
        ]}
      >
        {isActive && (
          <View style={[styles.pulseDot, { backgroundColor: "#ffffff" }]} />
        )}
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { width: imageWidth, height: imageHeight }]}
      pointerEvents="none"
    >
      {/* Render all detected keypoints */}
      {keypoints.map(renderKeypoint)}

      {/* Render pulse points with position-specific styling */}
      {renderPulsePoint("carotid", pulsePoints.carotid)}
      {renderPulsePoint("brachial", pulsePoints.brachial)}
      {renderPulsePoint("radial", pulsePoints.radial)}

      {/* Highlight current position with pulsing animation */}
      {pulsePoints[currentPosition] && (
        <View
          style={[
            styles.currentPositionHighlight,
            {
              left: pulsePoints[currentPosition]!.x * imageWidth - 20,
              top: pulsePoints[currentPosition]!.y * imageHeight - 20,
              borderColor: PULSE_COLORS[currentPosition],
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
  keypoint: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#00ff00",
    borderWidth: 1,
    borderColor: "#ffffff",
    shadowColor: "#00ff00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  pulsePoint: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  activePulsePoint: {
    opacity: 1,
    borderWidth: 3,
  },
  inactivePulsePoint: {
    opacity: 0.6,
    borderWidth: 2,
  },
  pulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  currentPositionHighlight: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    opacity: 0.8,
  },
});
