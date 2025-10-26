// services/claudeExport.ts
import { emergencyCoordinatorService } from './emergencyCoordinator';

/**
 * Utility functions for exporting Claude input data
 * This helps with debugging and testing the dispatcher system
 */

export interface ClaudeExportData {
  timestamp: string;
  sessionId: string;
  mode: string;
  claudeInput: any;
  geminiAnalysis: any;
  emergencyContext: {
    timeElapsed: number;
    isActive: boolean;
  };
}

/**
 * Exports the current Claude input data as a JSON string
 * Useful for debugging and testing the dispatcher system
 */
export async function exportClaudeInput(): Promise<string> {
  try {
    const exportData = await emergencyCoordinatorService.exportClaudeInput();
    return exportData;
  } catch (error) {
    console.error('❌ Failed to export Claude input:', error);
    return JSON.stringify({ error: 'Failed to export Claude input' }, null, 2);
  }
}

/**
 * Creates a sample Claude input for testing
 */
export function createSampleClaudeInput(): string {
  const sampleData: ClaudeExportData = {
    timestamp: new Date().toISOString(),
    sessionId: 'sample_emergency_123',
    mode: 'cpr',
    claudeInput: {
      systemPrompt: `You are an AI medical dispatcher providing real-time guidance for emergency medical procedures. You receive visual analysis data from a computer vision system and must provide clear, actionable instructions to help users perform life-saving techniques correctly.

Your role:
1. Analyze the visual detection data from the camera
2. Provide specific corrections for hand placement, technique, or positioning
3. Give encouraging but urgent guidance
4. Identify when the user is performing the procedure correctly
5. Suggest next steps in the emergency protocol

Guidelines:
- Be concise but clear (under 20 words per instruction)
- Use encouraging language when user is doing well
- Be urgent but not panicky when corrections are needed
- Focus on the most critical aspects first
- Provide specific, actionable feedback

CPR COMPRESSIONS: Monitor hand placement on center of chest, compression depth, and rate. Ensure proper body position and technique.`,
      userMessage: `EMERGENCY MEDICAL GUIDANCE REQUEST

Current Procedure: CPR
Time in Emergency: 45 seconds
Procedure Step: 2

VISUAL ANALYSIS DATA:
Overall Instruction: CPR: Place hands on center of chest, lower half of sternum

Detected Areas:
1. Hand Placement
   Position: (40.0%, 50.0%)
   Size: 20.0% x 15.0%
   Confidence: 80.0%
   Instruction: Place hands on center of chest

USER CONTEXT:
User Feedback: User performing procedure
Previous Guidance: Good hand placement! Keep the rhythm steady

Please provide specific guidance for the user based on the visual analysis.`,
      context: {
        geminiAnalysis: {
          detections: [
            {
              x: 0.4,
              y: 0.5,
              width: 0.2,
              height: 0.15,
              confidence: 0.8,
              label: "Hand Placement",
              instruction: "Place hands on center of chest"
            }
          ],
          overallInstruction: "CPR: Place hands on center of chest, lower half of sternum"
        },
        currentMode: 'cpr',
        userContext: {
          timestamp: new Date().toISOString(),
          sessionId: 'sample_emergency_123',
          previousGuidance: 'Good hand placement! Keep the rhythm steady',
          userFeedback: 'User performing procedure'
        },
        emergencyContext: {
          isActive: true,
          timeElapsed: 45,
          procedureStep: 2
        }
      },
      expectedOutput: `Please respond with a JSON object containing:
{
  "guidance": {
    "primary": "Main instruction for the user",
    "secondary": "Additional context or warning (optional)",
    "urgency": "low|medium|high|critical"
  },
  "corrections": {
    "position": {
      "x": 0.5,
      "y": 0.3,
      "instruction": "Move hands to this position"
    },
    "technique": {
      "issue": "Hands too high",
      "correction": "Move hands lower on chest"
    }
  },
  "nextAction": {
    "action": "Continue compressions",
    "timing": 30,
    "priority": 3
  },
  "voiceGuidance": {
    "speak": "Good! Keep going!",
    "tone": "encouraging"
  },
  "hapticFeedback": {
    "type": "success",
    "pattern": [100, 50, 100]
  }
}`
      },
      geminiAnalysis: {
        detections: [
          {
            x: 0.4,
            y: 0.5,
            width: 0.2,
            height: 0.15,
            confidence: 0.8,
            label: "Hand Placement",
            instruction: "Place hands on center of chest"
          }
        ],
        overallInstruction: "CPR: Place hands on center of chest, lower half of sternum"
      },
      emergencyContext: {
        timeElapsed: 45,
        isActive: true
      }
    };

    return JSON.stringify(sampleData, null, 2);
  }

/**
 * Logs the current Claude input to console for debugging
 */
export async function logClaudeInput(): Promise<void> {
  try {
    const claudeInput = await exportClaudeInput();
    console.log('📝 Claude Input Data:');
    console.log(claudeInput);
  } catch (error) {
    console.error('❌ Failed to log Claude input:', error);
  }
}

/**
 * Creates a mock dispatcher response for testing
 */
export function createMockDispatcherResponse(): any {
  return {
    guidance: {
      primary: "Place hands on center of chest",
      secondary: "Keep arms straight and compress 2 inches deep",
      urgency: "critical"
    },
    corrections: {
      position: {
        x: 0.4,
        y: 0.5,
        instruction: "Move hands to center of chest"
      }
    },
    nextAction: {
      action: "Continue compressions at 100-120 BPM",
      timing: 30,
      priority: 5
    },
    voiceGuidance: {
      speak: "Excellent! Keep the rhythm steady",
      tone: "encouraging"
    },
    hapticFeedback: {
      type: "success",
      pattern: [100, 50, 100]
    }
  };
}
