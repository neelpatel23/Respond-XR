// services/pulseDetection.ts
import { geminiService } from "./gemini";

export interface PulseKeypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

export type PulsePosition = "carotid" | "brachial" | "radial";

export interface PulseDetectionResult {
  keypoints: PulseKeypoint[];
  pulsePoints: {
    carotid: { x: number; y: number } | null;
    brachial: { x: number; y: number } | null;
    radial: { x: number; y: number } | null;
  };
  recommendedPosition: PulsePosition;
  confidence: number;
  fingerPositions: { left: PulseKeypoint | null; right: PulseKeypoint | null };
  isPersonDetected: boolean;
}

export interface PulseTarget {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  confidence: number;
  position: PulsePosition;
}

class PulseDetectionService {
  private isInitialized = false;
  private isInitializing = false;

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    console.log("🫀 Initializing Gemini Vision API for pulse detection...");

    try {
      // Gemini service is already initialized in the app
      // We just need to mark this service as ready
      this.isInitialized = true;
      this.isInitializing = false;
      console.log(
        "🎯 Pulse detection service initialized successfully with Gemini Vision API"
      );
    } catch (error) {
      console.error("❌ Failed to initialize pulse detection:", error);
      this.isInitializing = false;
      throw error;
    }
  }

  async detectPulse(imageBase64: string, preferredPosition?: PulsePosition): Promise<PulseDetectionResult> {
    if (!this.isInitialized) {
      throw new Error("Pulse detection service not initialized");
    }

    try {
      // Use Gemini Vision API to analyze the image for pulse points
      const result = await geminiService.analyzeMedicalScene(
        imageBase64,
        "pulse"
      );

      // Convert Gemini detections to pulse keypoints
      const keypoints = this.convertGeminiDetectionsToPulseKeypoints(
        result.detections
      );

      // Extract pulse points from detections
      const pulsePoints = this.extractPulsePointsFromDetections(
        result.detections
      );

      // Determine recommended position based on detections and context
      const recommendedPosition = this.determineRecommendedPosition(
        result.detections,
        preferredPosition
      );

      // Get finger positions from detections
      const fingerPositions = this.getFingerPositionsFromDetections(
        result.detections
      );

      // Check if person is detected
      const isPersonDetected = result.detections.length > 0;

      return {
        keypoints,
        pulsePoints,
        recommendedPosition,
        confidence:
          result.detections.length > 0
            ? Math.max(...result.detections.map((d) => d.confidence))
            : 0,
        fingerPositions,
        isPersonDetected,
      };
    } catch (error) {
      console.error("❌ Pulse detection error:", error);
      throw error;
    }
  }

  // Convert Gemini detections to pulse keypoints
  private convertGeminiDetectionsToPulseKeypoints(
    detections: any[]
  ): PulseKeypoint[] {
    return detections.map((detection, index) => ({
      x: detection.x,
      y: detection.y,
      score: detection.confidence,
      name: detection.label,
    }));
  }

  // Extract specific pulse points from Gemini detections
  private extractPulsePointsFromDetections(detections: any[]): {
    carotid: { x: number; y: number } | null;
    brachial: { x: number; y: number } | null;
    radial: { x: number; y: number } | null;
  } {
    const carotidDetection = detections.find(
      (d) =>
        d.label.toLowerCase().includes("carotid") ||
        d.label.toLowerCase().includes("neck") ||
        (d.label.toLowerCase().includes("pulse") && d.y < 0.5)
    );

    const brachialDetection = detections.find(
      (d) =>
        d.label.toLowerCase().includes("brachial") ||
        d.label.toLowerCase().includes("upper arm") ||
        (d.label.toLowerCase().includes("arm") && d.y > 0.3 && d.y < 0.7)
    );

    const radialDetection = detections.find(
      (d) =>
        d.label.toLowerCase().includes("radial") ||
        d.label.toLowerCase().includes("wrist") ||
        (d.label.toLowerCase().includes("pulse") && d.y > 0.6)
    );

    return {
      carotid: carotidDetection
        ? { x: carotidDetection.x, y: carotidDetection.y }
        : null,
      brachial: brachialDetection
        ? { x: brachialDetection.x, y: brachialDetection.y }
        : null,
      radial: radialDetection
        ? { x: radialDetection.x, y: radialDetection.y }
        : null,
    };
  }

  // Determine the best pulse position based on detections
  private determineRecommendedPosition(
    detections: any[],
    preferredPosition?: PulsePosition
  ): PulsePosition {
    // If preferred position is specified and detected, use it
    if (preferredPosition) {
      const hasPreferredPosition = detections.some((d) =>
        d.label.toLowerCase().includes(preferredPosition)
      );
      if (hasPreferredPosition) {
        return preferredPosition;
      }
    }

    // Check for age indicators or body size to recommend appropriate position
    const hasChildIndicators = detections.some(
      (d) =>
        d.label.toLowerCase().includes("child") ||
        d.label.toLowerCase().includes("infant") ||
        d.label.toLowerCase().includes("small")
    );

    const hasAdultIndicators = detections.some(
      (d) =>
        d.label.toLowerCase().includes("adult") ||
        d.label.toLowerCase().includes("large")
    );

    const hasConsciousIndicators = detections.some(
      (d) =>
        d.label.toLowerCase().includes("sitting") ||
        d.label.toLowerCase().includes("conscious") ||
        d.label.toLowerCase().includes("awake")
    );

    // Emergency protocol: prioritize based on medical guidelines
    if (hasChildIndicators) {
      return "brachial"; // Brachial for children/infants
    } else if (hasConsciousIndicators) {
      return "radial"; // Radial for conscious patients
    } else {
      return "carotid"; // Carotid for unconscious adults (emergency default)
    }
  }

  // Get finger positions from detections
  private getFingerPositionsFromDetections(detections: any[]): {
    left: PulseKeypoint | null;
    right: PulseKeypoint | null;
  } {
    const fingerDetections = detections.filter(
      (d) =>
        d.label.toLowerCase().includes("finger") ||
        d.label.toLowerCase().includes("hand")
    );

    // For pulse checking, we typically use 2-3 fingers from one hand
    // We'll look for finger clusters
    const leftFingers = fingerDetections.filter((d) => d.x < 0.5);
    const rightFingers = fingerDetections.filter((d) => d.x >= 0.5);

    const leftFinger = leftFingers.length > 0
      ? {
          x: leftFingers[0].x,
          y: leftFingers[0].y,
          score: leftFingers[0].confidence,
          name: "left_fingers",
        }
      : null;

    const rightFinger = rightFingers.length > 0
      ? {
          x: rightFingers[0].x,
          y: rightFingers[0].y,
          score: rightFingers[0].confidence,
          name: "right_fingers",
        }
      : null;

    return {
      left: leftFinger,
      right: rightFinger,
    };
  }

  calculatePulseTarget(
    poseResult: PulseDetectionResult,
    position: PulsePosition
  ): PulseTarget | null {
    if (!poseResult.isPersonDetected) {
      return null;
    }

    const pulsePoint = poseResult.pulsePoints[position];
    if (!pulsePoint) {
      return null;
    }

    return {
      x: pulsePoint.x,
      y: pulsePoint.y,
      confidence: poseResult.confidence,
      position,
    };
  }

  calculateFingerPlacementAccuracy(
    target: PulseTarget,
    fingerPositions: { left: PulseKeypoint | null; right: PulseKeypoint | null },
    imageWidth: number,
    imageHeight: number
  ): "correct" | "adjust" | "incorrect" {
    // Smaller threshold for pulse detection (fingers are more precise than palms)
    const threshold = 30; // pixels
    const targetPixels = {
      x: target.x * imageWidth,
      y: target.y * imageHeight,
    };

    let minDistance = Infinity;
    let hasFingers = false;

    // Check for fingers near the target
    if (fingerPositions.left) {
      hasFingers = true;
      const distance = Math.sqrt(
        Math.pow(fingerPositions.left.x - targetPixels.x, 2) +
          Math.pow(fingerPositions.left.y - targetPixels.y, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }

    if (fingerPositions.right) {
      hasFingers = true;
      const distance = Math.sqrt(
        Math.pow(fingerPositions.right.x - targetPixels.x, 2) +
          Math.pow(fingerPositions.right.y - targetPixels.y, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }

    if (!hasFingers) {
      return "incorrect";
    }

    if (minDistance <= threshold) {
      return "correct";
    } else if (minDistance <= threshold * 1.5) {
      return "adjust";
    } else {
      return "incorrect";
    }
  }

  // Get position-specific instructions
  getPositionInstructions(position: PulsePosition): {
    title: string;
    technique: string;
    duration: string;
  } {
    switch (position) {
      case "carotid":
        return {
          title: "Carotid Pulse (Neck)",
          technique: "Use 2-3 fingers between the trachea and neck muscle. Press gently - don't use thumb.",
          duration: "Check for up to 10 seconds",
        };
      case "brachial":
        return {
          title: "Brachial Pulse (Upper Arm)",
          technique: "Place 2-3 fingers on the inside of the upper arm, between shoulder and elbow.",
          duration: "Check for up to 10 seconds",
        };
      case "radial":
        return {
          title: "Radial Pulse (Wrist)",
          technique: "Place 2-3 fingers on the thumb side of the wrist, just below the wrist crease.",
          duration: "Check for up to 10 seconds",
        };
    }
  }

  async dispose(): Promise<void> {
    // No cleanup needed for Gemini API
    this.isInitialized = false;
    console.log("🧹 Pulse detection service disposed");
  }
}

export const pulseDetectionService = new PulseDetectionService();
