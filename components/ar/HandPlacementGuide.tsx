// components/ar/HandPlacementGuide.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { HandPlacementTarget } from "../../services/poseDetection";

interface HandPlacementGuideProps {
  target: HandPlacementTarget | null;
  imageWidth: number;
  imageHeight: number;
  accuracy: "correct" | "adjust" | "incorrect";
  visible?: boolean;
}

export const HandPlacementGuide: React.FC<HandPlacementGuideProps> = ({
  target,
  imageWidth,
  imageHeight,
  accuracy,
  visible = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing animation for the target marker
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Scale animation based on accuracy
    const scaleAnimation = Animated.timing(scaleAnim, {
      toValue: accuracy === "correct" ? 1.1 : 1,
      duration: 200,
      useNativeDriver: true,
    });

    pulseAnimation.start();
    scaleAnimation.start();

    return () => {
      pulseAnimation.stop();
      scaleAnimation.stop();
    };
  }, [pulseAnim, scaleAnim, accuracy]);

  if (!visible || !target) {
    return null;
  }

  const targetPixels = {
    x: target.x * imageWidth,
    y: target.y * imageHeight,
  };

  const getColorForAccuracy = () => {
    switch (accuracy) {
      case "correct":
        return "#22c55e"; // Green
      case "adjust":
        return "#f59e0b"; // Yellow
      case "incorrect":
        return "#ef4444"; // Red
      default:
        return "#3b82f6"; // Blue
    }
  };

  const getInstructionText = () => {
    switch (accuracy) {
      case "correct":
        return "Perfect! Keep hands here";
      case "adjust":
        return "Move hands closer to target";
      case "incorrect":
        return "Place hands on target";
      default:
        return "Position hands here";
    }
  };

  return (
    <View
      style={[styles.container, { width: imageWidth, height: imageHeight }]}
      pointerEvents="none"
    >
      {/* Target marker */}
      <Animated.View
        style={[
          styles.targetMarker,
          {
            left: targetPixels.x - 15, // Smaller, more precise
            top: targetPixels.y - 15,
            backgroundColor: getColorForAccuracy(),
            transform: [{ scale: pulseAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.targetInner}>
          <Text style={styles.targetText}>+</Text>
        </View>
      </Animated.View>

      {/* Hand outline guide */}
      <View
        style={[
          styles.handOutline,
          {
            left: targetPixels.x - 20, // Smaller, more precise
            top: targetPixels.y - 10,
            borderColor: getColorForAccuracy(),
          },
        ]}
      >
        <View
          style={[styles.handStack, { borderColor: getColorForAccuracy() }]}
        >
          <View
            style={[
              styles.handLayer,
              { backgroundColor: getColorForAccuracy() },
            ]}
          />
          <View
            style={[
              styles.handLayer,
              styles.handLayerTop,
              { backgroundColor: getColorForAccuracy() },
            ]}
          />
        </View>
      </View>

      {/* Instruction text */}
      <View
        style={[
          styles.instructionContainer,
          {
            left: targetPixels.x - 60, // Smaller, more precise
            top: targetPixels.y + 40, // Closer to target
            backgroundColor: getColorForAccuracy(),
          },
        ]}
      >
        <Text style={styles.instructionText}>{getInstructionText()}</Text>
      </View>

      {/* Confidence indicator */}
      {target.confidence > 0 && (
        <View
          style={[
            styles.confidenceIndicator,
            {
              left: targetPixels.x + 20, // Smaller, more precise
              top: targetPixels.y - 15,
            },
          ]}
        >
          <Text style={styles.confidenceText}>
            {Math.round(target.confidence * 100)}%
          </Text>
        </View>
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
    width: 30, // Smaller, more precise
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  targetInner: {
    width: 20, // Smaller inner circle
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  targetText: {
    fontSize: 12, // Smaller text
    color: "#000",
    fontWeight: "bold",
  },
  handOutline: {
    position: "absolute",
    width: 40, // Smaller, more precise
    height: 20,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  handStack: {
    width: 35, // Smaller hand stack
    height: 15,
    borderWidth: 1,
    borderRadius: 3,
    position: "relative",
  },
  handLayer: {
    position: "absolute",
    width: 30, // Smaller to match hand stack
    height: 6,
    borderRadius: 2,
    opacity: 0.7,
  },
  handLayerTop: {
    top: 8, // Adjusted for smaller size
    opacity: 0.5,
  },
  instructionContainer: {
    position: "absolute",
    paddingHorizontal: 8, // Smaller padding
    paddingVertical: 4,
    borderRadius: 12, // Smaller border radius
    minWidth: 120, // Smaller minimum width
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  instructionText: {
    color: "white",
    fontSize: 10, // Smaller text
    fontWeight: "bold",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  confidenceIndicator: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6, // Smaller padding
    paddingVertical: 3,
    borderRadius: 6, // Smaller border radius
  },
  confidenceText: {
    color: "white",
    fontSize: 8, // Smaller text
    fontWeight: "bold",
  },
});
