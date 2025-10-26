// services/medicalDispatcher.ts
import { GeminiResponse, DetectionResult } from './gemini';

export interface DispatcherInput {
  geminiAnalysis: GeminiResponse;
  currentMode: 'airway' | 'cpr' | 'pulse' | 'seizure';
  userContext: {
    timestamp: string;
    sessionId: string;
    previousGuidance?: string;
    userFeedback?: string;
  };
  emergencyContext: {
    isActive: boolean;
    timeElapsed: number; // seconds since emergency started
    procedureStep: number; // current step in the procedure
  };
}

export interface DispatcherResponse {
  guidance: {
    primary: string; // Main instruction for user
    secondary?: string; // Additional context or warning
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };
  corrections: {
    position?: {
      x: number;
      y: number;
      instruction: string;
    };
    technique?: {
      issue: string;
      correction: string;
    };
  };
  nextAction: {
    action: string;
    timing: number; // seconds to wait before next check
    priority: number; // 1-5 scale
  };
  voiceGuidance: {
    speak: string; // What to say to user
    tone: 'calm' | 'urgent' | 'encouraging' | 'warning';
  };
  hapticFeedback: {
    type: 'light' | 'medium' | 'heavy' | 'success' | 'error';
    pattern: number[]; // Pattern of vibrations
  };
}

export interface ClaudeInput {
  systemPrompt: string;
  userMessage: string;
  context: DispatcherInput;
  expectedOutput: string;
}

class MedicalDispatcherService {
  private sessionId: string;
  private emergencyStartTime: number;
  private procedureStep: number = 0;
  private previousGuidance: string = '';

  constructor() {
    this.sessionId = this.generateSessionId();
    this.emergencyStartTime = Date.now();
  }

  /**
   * Formats Gemini analysis results for Claude model input
   */
  formatForClaude(
    geminiResponse: GeminiResponse,
    mode: 'airway' | 'cpr' | 'pulse' | 'seizure',
    userFeedback?: string
  ): ClaudeInput {
    const dispatcherInput: DispatcherInput = {
      geminiAnalysis: geminiResponse,
      currentMode: mode,
      userContext: {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        previousGuidance: this.previousGuidance,
        userFeedback: userFeedback
      },
      emergencyContext: {
        isActive: true,
        timeElapsed: Math.floor((Date.now() - this.emergencyStartTime) / 1000),
        procedureStep: this.procedureStep
      }
    };

    return {
      systemPrompt: this.getSystemPrompt(mode),
      userMessage: this.formatUserMessage(dispatcherInput),
      context: dispatcherInput,
      expectedOutput: this.getExpectedOutputFormat()
    };
  }

  /**
   * Generates system prompt for Claude based on medical procedure mode
   */
  private getSystemPrompt(mode: string): string {
    const basePrompt = `You are an AI medical dispatcher providing real-time guidance for emergency medical procedures. You receive visual analysis from a computer vision system (Gemini) and must provide clear, actionable instructions to help users perform life-saving techniques correctly.

Your role:
1. Analyze the raw text description from Gemini about what it sees in the camera
2. Use Gemini's analysis to understand the scene context and current situation
3. Provide specific corrections for hand placement, technique, or positioning based on the description
4. Give encouraging but urgent guidance
5. Identify when the user is performing the procedure correctly
6. Suggest next steps in the emergency protocol

You will receive:
- Raw text analysis from Gemini describing what it sees in the camera
- Use this description to provide the most accurate guidance

Guidelines for voice guidance:
- Keep voice instructions conversational and natural (15-25 words)
- Use encouraging language when user is doing well
- Be urgent but calm when corrections are needed
- Focus on the most critical aspects first
- Provide specific, actionable feedback
- Use "you" and "your" to make it personal
- Include reassuring phrases like "Good job" or "Keep going" when appropriate`;

    const modeSpecificPrompts = {
      airway: `AIRWAY MANAGEMENT: Focus on head-tilt/chin-lift technique. Check for proper hand placement on forehead and under chin. Ensure airway is open.`,
      cpr: `CPR COMPRESSIONS: Monitor hand placement on center of chest, compression depth, and rate. Ensure proper body position and technique.`,
      pulse: `PULSE CHECK: Guide finger placement on carotid artery. Check for proper pressure and positioning. Monitor for pulse detection.`,
      seizure: `SEIZURE SAFETY: Ensure head protection, body positioning, and safety measures. Monitor for proper protective positioning.`
    };

    return `${basePrompt}\n\n${modeSpecificPrompts[mode as keyof typeof modeSpecificPrompts] || basePrompt}`;
  }

  /**
   * Formats the user message with context for Claude
   */
  private formatUserMessage(input: DispatcherInput): string {
    const { geminiAnalysis, currentMode, userContext, emergencyContext } = input;
    
    return `EMERGENCY MEDICAL GUIDANCE REQUEST

Current Procedure: ${currentMode.toUpperCase()}
Time in Emergency: ${emergencyContext.timeElapsed} seconds
Procedure Step: ${emergencyContext.procedureStep}

${this.formatGeminiAnalysis(geminiAnalysis)}

USER CONTEXT:
${userContext.userFeedback ? `User Feedback: ${userContext.userFeedback}` : 'No user feedback provided'}
${userContext.previousGuidance ? `Previous Guidance: ${userContext.previousGuidance}` : 'First analysis'}

Please provide specific guidance for the user based on the visual analysis.`;
  }

  /**
   * Formats Gemini analysis results into readable text for Claude
   */
  private formatGeminiAnalysis(analysis: GeminiResponse): string {
    // Send only the raw text analysis from Gemini
    if (analysis.rawTextAnalysis) {
      return `GEMINI VISUAL ANALYSIS:\n${analysis.rawTextAnalysis}`;
    }
    
    // Fallback to overall instruction if no raw analysis available
    return `GEMINI ANALYSIS: ${analysis.overallInstruction}`;
  }

  /**
   * Defines the expected output format for Claude
   */
  private getExpectedOutputFormat(): string {
    return `Please respond with a JSON object containing:
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
    "speak": "Good job! Keep your hands centered on the chest and maintain steady compressions",
    "tone": "encouraging"
  },
  "hapticFeedback": {
    "type": "success",
    "pattern": [100, 50, 100]
  }
}

IMPORTANT: Make the "speak" field conversational and natural for voice output. Use encouraging, personal language that sounds like a real medical dispatcher talking to someone.`;
  }

  /**
   * Updates the procedure step and guidance history
   */
  updateProcedureStep(step: number, guidance: string): void {
    this.procedureStep = step;
    this.previousGuidance = guidance;
  }

  /**
   * Resets the dispatcher for a new emergency session
   */
  reset(): void {
    this.sessionId = this.generateSessionId();
    this.emergencyStartTime = Date.now();
    this.procedureStep = 0;
    this.previousGuidance = '';
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    return `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates a mock dispatcher response for testing (when Claude is not connected)
   */
  createMockResponse(
    geminiResponse: GeminiResponse,
    mode: 'airway' | 'cpr' | 'pulse' | 'seizure'
  ): DispatcherResponse {
    const mockResponses = {
      airway: {
        guidance: {
          primary: "Place one hand on forehead, other under chin",
          secondary: "Ensure head is tilted back to open airway",
          urgency: "high" as const
        },
        corrections: {
          position: {
            x: 0.4,
            y: 0.25,
            instruction: "Move hand to forehead area"
          }
        },
        nextAction: {
          action: "Check for breathing",
          timing: 5,
          priority: 4
        },
        voiceGuidance: {
          speak: "Perfect! You've got the airway position right. Now gently tilt the head back a bit more",
          tone: "encouraging" as const
        },
        hapticFeedback: {
          type: "success" as const,
          pattern: [100, 50, 100]
        }
      },
      cpr: {
        guidance: {
          primary: "Place hands on center of chest",
          secondary: "Keep arms straight and compress 2 inches deep",
          urgency: "critical" as const
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
          speak: "Excellent work! Your compressions look great. Keep up that steady rhythm",
          tone: "encouraging" as const
        },
        hapticFeedback: {
          type: "success" as const,
          pattern: [100, 50, 100]
        }
      },
      pulse: {
        guidance: {
          primary: "Place fingers on carotid pulse",
          secondary: "Feel for pulse for 10 seconds",
          urgency: "high" as const
        },
        corrections: {
          position: {
            x: 0.3,
            y: 0.4,
            instruction: "Move fingers to side of neck"
          }
        },
        nextAction: {
          action: "Check for pulse for 10 seconds",
          timing: 10,
          priority: 4
        },
        voiceGuidance: {
          speak: "Good placement! Now feel carefully for the pulse. Take your time",
          tone: "calm" as const
        },
        hapticFeedback: {
          type: "light" as const,
          pattern: [100]
        }
      },
      seizure: {
        guidance: {
          primary: "Protect head and support body",
          secondary: "Clear area and cushion head",
          urgency: "high" as const
        },
        corrections: {
          position: {
            x: 0.4,
            y: 0.3,
            instruction: "Place cushion under head"
          }
        },
        nextAction: {
          action: "Monitor breathing and position",
          timing: 5,
          priority: 3
        },
        voiceGuidance: {
          speak: "Good job! Keep the head protected and make sure the area is clear",
          tone: "calm" as const
        },
        hapticFeedback: {
          type: "medium" as const,
          pattern: [100, 100]
        }
      }
    };

    return mockResponses[mode];
  }
}

export const medicalDispatcherService = new MedicalDispatcherService();
