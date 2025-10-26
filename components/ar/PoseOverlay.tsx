// components/ar/PoseOverlay.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { PoseKeypoint } from "../../services/poseDetection";

interface PoseOverlayProps {
  keypoints: PoseKeypoint[];
  imageWidth: number;
  imageHeight: number;
  visible?: boolean;
}

// MoveNet keypoint connections for drawing skeleton
const POSE_CONNECTIONS = [
  // Head and shoulders
  [5, 6], // left shoulder to right shoulder
  [5, 7], // left shoulder to left elbow
  [6, 8], // right shoulder to right elbow
  [7, 9], // left elbow to left wrist
  [8, 10], // right elbow to right wrist

  // Torso
  [5, 11], // left shoulder to left hip
  [6, 12], // right shoulder to right hip
  [11, 12], // left hip to right hip

  // Legs
  [11, 13], // left hip to left knee
  [12, 14], // right hip to right knee
  [13, 15], // left knee to left ankle
  [14, 16], // right knee to right ankle
];

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  keypoints,
  imageWidth,
  imageHeight,
  visible = true,
}) => {
  if (!visible || keypoints.length === 0) {
    return null;
  }

  const renderKeypoint = (keypoint: PoseKeypoint, index: number) => {
    if (keypoint.score < 0.3) return null;

    return (
      <View
        key={index}
        style={[
          styles.keypoint,
          {
            left: keypoint.x - 4,
            top: keypoint.y - 4,
          },
        ]}
      />
    );
  };

  const renderConnection = (connection: number[]) => {
    const [startIdx, endIdx] = connection;
    const startPoint = keypoints[startIdx];
    const endPoint = keypoints[endIdx];

    if (
      !startPoint ||
      !endPoint ||
      startPoint.score < 0.3 ||
      endPoint.score < 0.3
    ) {
      return null;
    }

    const length = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) +
        Math.pow(endPoint.y - startPoint.y, 2)
    );
    const angle =
      (Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x) * 180) /
      Math.PI;

    return (
      <View
        key={`${startIdx}-${endIdx}`}
        style={[
          styles.connection,
          {
            left: startPoint.x,
            top: startPoint.y,
            width: length,
            transform: [{ rotate: `${angle}deg` }],
          },
        ]}
      />
    );
  };

  return (
    <View
      style={[styles.container, { width: imageWidth, height: imageHeight }]}
      pointerEvents="none"
    >
      {/* Render skeleton connections */}
      {POSE_CONNECTIONS.map(renderConnection)}

      {/* Render keypoints */}
      {keypoints.map(renderKeypoint)}
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
    width: 4, // Smaller, more precise
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00ff00",
    borderWidth: 1,
    borderColor: "#ffffff",
    shadowColor: "#00ff00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
  },
  connection: {
    position: "absolute",
    height: 1, // Thinner lines for more precision
    backgroundColor: "#00ff00",
    opacity: 0.6,
    transformOrigin: "0 50%",
    shadowColor: "#00ff00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
});
