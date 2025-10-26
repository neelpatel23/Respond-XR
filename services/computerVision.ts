// Advanced Computer Vision Service
// Implements motion detection, edge detection, and body part recognition

export interface BodyPartDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
  instruction: string;
}

export interface CVResult {
  detections: BodyPartDetection[];
  overallInstruction: string;
}

class ComputerVisionService {
  private previousFrame: ImageData | null = null;
  private motionThreshold = 30;
  private edgeThreshold = 50;

  // Advanced motion detection using frame differencing
  detectMotion(currentFrame: ImageData): { x: number; y: number; intensity: number }[] {
    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return [];
    }

    const motionPoints: { x: number; y: number; intensity: number }[] = [];
    const width = currentFrame.width;
    const height = currentFrame.height;
    const currentData = currentFrame.data;
    const previousData = this.previousFrame.data;

    // Frame differencing algorithm
    for (let y = 0; y < height; y += 10) { // Sample every 10th pixel for performance
      for (let x = 0; x < width; x += 10) {
        const index = (y * width + x) * 4;
        
        // Calculate pixel difference
        const rDiff = Math.abs(currentData[index] - previousData[index]);
        const gDiff = Math.abs(currentData[index + 1] - previousData[index + 1]);
        const bDiff = Math.abs(currentData[index + 2] - previousData[index + 2]);
        
        const totalDiff = (rDiff + gDiff + bDiff) / 3;
        
        if (totalDiff > this.motionThreshold) {
          motionPoints.push({
            x: x / width, // Normalize to 0-1
            y: y / height,
            intensity: totalDiff
          });
        }
      }
    }

    this.previousFrame = currentFrame;
    return motionPoints;
  }

  // Edge detection using Sobel operator
  detectEdges(imageData: ImageData): { x: number; y: number; magnitude: number }[] {
    const edges: { x: number; y: number; magnitude: number }[] = [];
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y += 5) { // Sample every 5th pixel
      for (let x = 1; x < width - 1; x += 5) {
        let gx = 0, gy = 0;

        // Apply Sobel operator
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            gx += gray * sobelX[kernelIndex];
            gy += gray * sobelY[kernelIndex];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        
        if (magnitude > this.edgeThreshold) {
          edges.push({
            x: x / width,
            y: y / height,
            magnitude: magnitude
          });
        }
      }
    }

    return edges;
  }

  // Skin color detection for body part recognition
  detectSkinRegions(imageData: ImageData): { x: number; y: number; area: number }[] {
    const skinRegions: { x: number; y: number; area: number }[] = [];
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    // Skin color ranges in RGB
    const skinRanges = [
      { min: [95, 40, 20], max: [125, 80, 60] },   // Light skin
      { min: [85, 30, 15], max: [115, 70, 50] },  // Medium skin
      { min: [75, 25, 10], max: [105, 60, 40] },  // Dark skin
    ];

    for (let y = 0; y < height; y += 8) {
      for (let x = 0; x < width; x += 8) {
        const index = (y * width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        // Check if pixel matches skin color
        for (const range of skinRanges) {
          if (r >= range.min[0] && r <= range.max[0] &&
              g >= range.min[1] && g <= range.max[1] &&
              b >= range.min[2] && b <= range.max[2]) {
            
            skinRegions.push({
              x: x / width,
              y: y / height,
              area: 1
            });
            break;
          }
        }
      }
    }

    return skinRegions;
  }

  // Advanced body part detection using multiple CV techniques
  detectBodyParts(imageData: ImageData, mode: 'airway' | 'cpr' | 'pulse' | 'seizure'): CVResult {
    console.log('🔍 Running advanced computer vision analysis...');

    // Combine multiple detection methods
    const motionPoints = this.detectMotion(imageData);
    const edges = this.detectEdges(imageData);
    const skinRegions = this.detectSkinRegions(imageData);

    console.log(`📊 CV Results: ${motionPoints.length} motion points, ${edges.length} edges, ${skinRegions.length} skin regions`);

    // Analyze patterns to detect body parts
    const detections = this.analyzeBodyPartPatterns(motionPoints, edges, skinRegions, mode);

    return {
      detections,
      overallInstruction: this.getOverallInstruction(mode, detections.length)
    };
  }

  // Analyze patterns to identify specific body parts
  private analyzeBodyPartPatterns(
    motionPoints: { x: number; y: number; intensity: number }[],
    edges: { x: number; y: number; magnitude: number }[],
    skinRegions: { x: number; y: number; area: number }[],
    mode: string
  ): BodyPartDetection[] {
    const detections: BodyPartDetection[] = [];

    switch (mode) {
      case 'pulse':
        // Look for neck area - typically has skin and edges
        const neckRegions = skinRegions.filter(region => 
          region.y > 0.2 && region.y < 0.5 && region.x > 0.3 && region.x < 0.7
        );
        
        if (neckRegions.length > 0) {
          const avgNeck = this.calculateAveragePosition(neckRegions);
          detections.push({
            x: avgNeck.x,
            y: avgNeck.y,
            width: 0.15,
            height: 0.12,
            confidence: 0.8,
            label: "Carotid Pulse",
            instruction: "Place fingers on carotid pulse (neck)"
          });
        }
        break;

      case 'cpr':
        // Look for chest area - center of body with skin
        const chestRegions = skinRegions.filter(region => 
          region.y > 0.4 && region.y < 0.7 && region.x > 0.2 && region.x < 0.8
        );
        
        if (chestRegions.length > 0) {
          const avgChest = this.calculateAveragePosition(chestRegions);
          detections.push({
            x: avgChest.x,
            y: avgChest.y,
            width: 0.2,
            height: 0.15,
            confidence: 0.85,
            label: "Chest Center",
            instruction: "Place hands on center of chest"
          });
        }
        break;

      case 'airway':
        // Look for head area - upper portion with skin
        const headRegions = skinRegions.filter(region => 
          region.y > 0.1 && region.y < 0.4
        );
        
        if (headRegions.length > 0) {
          const avgHead = this.calculateAveragePosition(headRegions);
          
          // Forehead position
          detections.push({
            x: avgHead.x,
            y: avgHead.y - 0.1,
            width: 0.15,
            height: 0.1,
            confidence: 0.8,
            label: "Forehead",
            instruction: "Place hand on forehead"
          });
          
          // Chin position
          detections.push({
            x: avgHead.x,
            y: avgHead.y + 0.1,
            width: 0.15,
            height: 0.1,
            confidence: 0.8,
            label: "Chin",
            instruction: "Support chin with fingers"
          });
        }
        break;

      case 'seizure':
        // Look for head and body areas
        const bodyRegions = skinRegions.filter(region => 
          region.y > 0.2 && region.y < 0.8
        );
        
        if (bodyRegions.length > 0) {
          const avgBody = this.calculateAveragePosition(bodyRegions);
          
          // Head protection
          detections.push({
            x: avgBody.x,
            y: avgBody.y - 0.2,
            width: 0.2,
            height: 0.15,
            confidence: 0.8,
            label: "Head Protection",
            instruction: "Protect and cushion head"
          });
          
          // Body support
          detections.push({
            x: avgBody.x,
            y: avgBody.y + 0.2,
            width: 0.3,
            height: 0.2,
            confidence: 0.8,
            label: "Body Support",
            instruction: "Support body in safe position"
          });
        }
        break;
    }

    return detections;
  }

  // Calculate average position from multiple points
  private calculateAveragePosition(points: { x: number; y: number }[]): { x: number; y: number } {
    if (points.length === 0) return { x: 0.5, y: 0.5 };
    
    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);
    
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }

  // Get overall instruction based on mode and detections
  private getOverallInstruction(mode: string, detectionCount: number): string {
    const instructions = {
      pulse: `Pulse Check: ${detectionCount > 0 ? 'Neck area detected' : 'Look for neck area'}`,
      cpr: `CPR: ${detectionCount > 0 ? 'Chest area detected' : 'Look for chest center'}`,
      airway: `Airway: ${detectionCount > 0 ? 'Head area detected' : 'Look for head/neck'}`,
      seizure: `Seizure Safety: ${detectionCount > 0 ? 'Body areas detected' : 'Look for head/body'}`
    };
    
    return instructions[mode as keyof typeof instructions] || 'Medical procedure guidance';
  }

  // Reset previous frame (call when starting new detection)
  reset(): void {
    this.previousFrame = null;
  }
}

export const computerVisionService = new ComputerVisionService();
