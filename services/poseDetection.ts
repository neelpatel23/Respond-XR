// services/poseDetection.ts
import { geminiService } from "./gemini";

export interface PoseKeypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

export interface PoseDetectionResult {
  keypoints: PoseKeypoint[];
  chestCenter: { x: number; y: number } | null;
  isPersonLyingDown: boolean;
  confidence: number;
  handPositions: { left: PoseKeypoint | null; right: PoseKeypoint | null };
}

export interface HandPlacementTarget {
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  confidence: number;
}

class PoseDetectionService {
  private isInitialized = false;
  private isInitializing = false;

  async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;
    console.log("🤖 Initializing Gemini Vision API for pose detection...");

    try {
      // Gemini service is already initialized in the app
      // We just need to mark this service as ready
      this.isInitialized = true;
      this.isInitializing = false;
      console.log(
        "🎯 Pose detection service initialized successfully with Gemini Vision API"
      );
    } catch (error) {
      console.error("❌ Failed to initialize pose detection:", error);
      this.isInitializing = false;
      throw error;
    }
  }

  async detectPose(imageBase64: string): Promise<PoseDetectionResult> {
    if (!this.isInitialized) {
      throw new Error("Pose detection service not initialized");
    }

    try {
      // Use Gemini Vision API to analyze the image for pose detection
      const result = await geminiService.analyzeMedicalScene(
        imageBase64,
        "cpr"
      );

      // Convert Gemini detections to pose keypoints
      const keypoints = this.convertGeminiDetectionsToKeypoints(
        result.detections
      );

      // Calculate chest center from detections
      const chestCenter = this.calculateChestCenterFromDetections(
        result.detections
      );

      // Determine if person is lying down based on detections
      const isPersonLyingDown = this.isPersonLyingDownFromDetections(
        result.detections
      );

      // Get hand positions from detections
      const handPositions = this.getHandPositionsFromDetections(
        result.detections
      );

      return {
        keypoints,
        chestCenter,
        isPersonLyingDown,
        confidence:
          result.detections.length > 0
            ? Math.max(...result.detections.map((d) => d.confidence))
            : 0,
        handPositions,
      };
    } catch (error) {
      console.error("❌ Pose detection error:", error);
      throw error;
    }
  }

  // Convert Gemini detections to pose keypoints
  private convertGeminiDetectionsToKeypoints(
    detections: any[]
  ): PoseKeypoint[] {
    return detections.map((detection, index) => ({
      x: detection.x,
      y: detection.y,
      score: detection.confidence,
      name: detection.label,
    }));
  }

  // Calculate chest center from Gemini detections
  private calculateChestCenterFromDetections(
    detections: any[]
  ): { x: number; y: number } | null {
    // Look for chest/sternum detection
    const chestDetection = detections.find(
      (d) =>
        d.label.toLowerCase().includes("chest") ||
        d.label.toLowerCase().includes("sternum") ||
        d.label.toLowerCase().includes("hand")
    );

    if (chestDetection) {
      return {
        x: chestDetection.x,
        y: chestDetection.y,
      };
    }

    // Fallback: use center of all detections
    if (detections.length > 0) {
      const avgX =
        detections.reduce((sum, d) => sum + d.x, 0) / detections.length;
      const avgY =
        detections.reduce((sum, d) => sum + d.y, 0) / detections.length;
      return { x: avgX, y: avgY };
    }

    return null;
  }

  // Determine if person is lying down from Gemini detections
  private isPersonLyingDownFromDetections(detections: any[]): boolean {
    // Look for body/chest detections that suggest horizontal orientation
    const bodyDetections = detections.filter(
      (d) =>
        d.label.toLowerCase().includes("chest") ||
        d.label.toLowerCase().includes("body") ||
        d.label.toLowerCase().includes("person")
    );

    // If we have body detections, assume person is lying down for CPR
    // In a real implementation, you might analyze the bounding box aspect ratio
    return bodyDetections.length > 0;
  }

  // Get hand positions from Gemini detections
  private getHandPositionsFromDetections(detections: any[]): {
    left: PoseKeypoint | null;
    right: PoseKeypoint | null;
  } {
    const handDetections = detections.filter(
      (d) =>
        d.label.toLowerCase().includes("hand") ||
        d.label.toLowerCase().includes("wrist")
    );

    // For simplicity, we'll use the first two hand detections
    // In a real implementation, you might distinguish left/right based on position
    const leftHand = handDetections[0]
      ? {
          x: handDetections[0].x,
          y: handDetections[0].y,
          score: handDetections[0].confidence,
          name: "left_hand",
        }
      : null;

    const rightHand = handDetections[1]
      ? {
          x: handDetections[1].x,
          y: handDetections[1].y,
          score: handDetections[1].confidence,
          name: "right_hand",
        }
      : null;

    return {
      left: leftHand,
      right: rightHand,
    };
  }

  calculateHandPlacementTarget(
    poseResult: PoseDetectionResult
  ): HandPlacementTarget | null {
    if (!poseResult.chestCenter || !poseResult.isPersonLyingDown) {
      return null;
    }

    return {
      x: poseResult.chestCenter.x,
      y: poseResult.chestCenter.y,
      confidence: poseResult.confidence,
    };
  }

  calculateHandPlacementAccuracy(
    target: HandPlacementTarget,
    handPositions: { left: PoseKeypoint | null; right: PoseKeypoint | null },
    imageWidth: number,
    imageHeight: number
  ): "correct" | "adjust" | "incorrect" {
    const threshold = 50; // pixels
    const targetPixels = {
      x: target.x * imageWidth,
      y: target.y * imageHeight,
    };

    let minDistance = Infinity;
    let hasHands = false;

    // Check left hand
    if (handPositions.left) {
      hasHands = true;
      const distance = Math.sqrt(
        Math.pow(handPositions.left.x - targetPixels.x, 2) +
          Math.pow(handPositions.left.y - targetPixels.y, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }

    // Check right hand
    if (handPositions.right) {
      hasHands = true;
      const distance = Math.sqrt(
        Math.pow(handPositions.right.x - targetPixels.x, 2) +
          Math.pow(handPositions.right.y - targetPixels.y, 2)
      );
      minDistance = Math.min(minDistance, distance);
    }

    if (!hasHands) {
      return "incorrect";
    }

    if (minDistance <= threshold) {
      return "correct";
    } else if (minDistance <= threshold * 2) {
      return "adjust";
    } else {
      return "incorrect";
    }
  }

  async dispose(): Promise<void> {
    // No cleanup needed for Gemini API
    this.isInitialized = false;
    console.log("🧹 Pose detection service disposed");
  }
}

export const poseDetectionService = new PoseDetectionService();
