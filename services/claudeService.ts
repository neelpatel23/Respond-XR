// services/claudeService.ts
import Anthropic from '@anthropic-ai/sdk';
import { ClaudeInput, DispatcherResponse } from './medicalDispatcher';

export interface ClaudeServiceConfig {
  apiKey: string;
  model?: string;
}

class ClaudeService {
  private anthropic: Anthropic | null = null;
  private apiKey: string = '';
  private model: string = 'claude-3-5-sonnet-20241022';

  constructor() {
    // Initialize with API key from environment
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (this.apiKey) {
      this.initialize();
    }
  }

  /**
   * Initialize Claude service with API key
   */
  initialize(apiKey?: string): void {
    const key = apiKey || this.apiKey;
    if (!key) {
      console.warn('⚠️ Claude API key not provided');
      return;
    }

    this.apiKey = key;
    this.anthropic = new Anthropic({ apiKey: key });
    console.log('✅ Claude service initialized');
  }

  /**
   * Send dispatcher input to Claude and get medical guidance response
   */
  async getDispatcherResponse(claudeInput: ClaudeInput): Promise<DispatcherResponse> {
    if (!this.anthropic) {
      throw new Error('Claude service not initialized. Please provide API key.');
    }

    try {
      console.log('🤖 Sending request to Claude...');
      console.log('📝 System prompt:', claudeInput.systemPrompt.substring(0, 200) + '...');
      console.log('💬 User message:', claudeInput.userMessage.substring(0, 200) + '...');

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more consistent medical guidance
        system: claudeInput.systemPrompt,
        messages: [
          {
            role: 'user',
            content: claudeInput.userMessage
          }
        ]
      });

      const responseText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      
      if (!responseText) {
        throw new Error('No response text from Claude');
      }

      console.log('✅ Claude response received:', responseText.substring(0, 200) + '...');

      // Parse Claude's JSON response
      const dispatcherResponse = this.parseClaudeResponse(responseText);
      
      console.log('🎯 Parsed dispatcher response:', dispatcherResponse);
      
      return dispatcherResponse;

    } catch (error) {
      console.error('❌ Claude API error:', error);
      
      // Return fallback response if Claude fails
      return this.getFallbackResponse(claudeInput.context.currentMode);
    }
  }

  /**
   * Parse Claude's JSON response into DispatcherResponse format
   */
  private parseClaudeResponse(responseText: string): DispatcherResponse {
    try {
      // Extract JSON from response (Claude might include extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and format the response
      return {
        guidance: {
          primary: parsed.guidance?.primary || 'Continue with the procedure',
          secondary: parsed.guidance?.secondary || '',
          urgency: parsed.guidance?.urgency || 'medium'
        },
        corrections: parsed.corrections || {},
        nextAction: {
          action: parsed.nextAction?.action || 'Continue monitoring',
          timing: parsed.nextAction?.timing || 5,
          priority: parsed.nextAction?.priority || 3
        },
        voiceGuidance: {
          speak: parsed.voiceGuidance?.speak || 'Good work, continue',
          tone: parsed.voiceGuidance?.tone || 'encouraging'
        },
        hapticFeedback: {
          type: parsed.hapticFeedback?.type || 'light',
          pattern: parsed.hapticFeedback?.pattern || [100]
        }
      };

    } catch (error) {
      console.error('❌ Failed to parse Claude response:', error);
      console.log('📝 Raw response:', responseText);
      
      // Return a basic response if parsing fails
      return {
        guidance: {
          primary: 'Continue with the procedure',
          secondary: 'Follow the visual guidance',
          urgency: 'medium'
        },
        corrections: {},
        nextAction: {
          action: 'Continue monitoring',
          timing: 5,
          priority: 3
        },
        voiceGuidance: {
          speak: 'Good work, continue',
          tone: 'encouraging'
        },
        hapticFeedback: {
          type: 'light',
          pattern: [100]
        }
      };
    }
  }

  /**
   * Get fallback response when Claude is unavailable
   */
  private getFallbackResponse(mode: 'airway' | 'cpr' | 'pulse' | 'seizure'): DispatcherResponse {
    const fallbackResponses = {
      airway: {
        guidance: {
          primary: "Maintain airway position",
          secondary: "Keep head tilted back",
          urgency: "high" as const
        },
        corrections: {},
        nextAction: {
          action: "Check breathing",
          timing: 5,
          priority: 4
        },
        voiceGuidance: {
          speak: "Good airway position, continue",
          tone: "encouraging" as const
        },
        hapticFeedback: {
          type: "success" as const,
          pattern: [100, 50, 100]
        }
      },
      cpr: {
        guidance: {
          primary: "Continue chest compressions",
          secondary: "Maintain proper rhythm",
          urgency: "critical" as const
        },
        corrections: {},
        nextAction: {
          action: "Continue compressions",
          timing: 30,
          priority: 5
        },
        voiceGuidance: {
          speak: "Excellent compressions, keep going",
          tone: "encouraging" as const
        },
        hapticFeedback: {
          type: "success" as const,
          pattern: [100, 50, 100]
        }
      },
      pulse: {
        guidance: {
          primary: "Check pulse carefully",
          secondary: "Feel for 10 seconds",
          urgency: "high" as const
        },
        corrections: {},
        nextAction: {
          action: "Continue pulse check",
          timing: 10,
          priority: 4
        },
        voiceGuidance: {
          speak: "Good pulse check technique",
          tone: "calm" as const
        },
        hapticFeedback: {
          type: "light" as const,
          pattern: [100]
        }
      },
      seizure: {
        guidance: {
          primary: "Protect head and body",
          secondary: "Clear surrounding area",
          urgency: "high" as const
        },
        corrections: {},
        nextAction: {
          action: "Monitor position",
          timing: 5,
          priority: 3
        },
        voiceGuidance: {
          speak: "Good protective positioning",
          tone: "calm" as const
        },
        hapticFeedback: {
          type: "medium" as const,
          pattern: [100, 100]
        }
      }
    };

    return fallbackResponses[mode];
  }

  /**
   * Check if Claude service is properly initialized
   */
  isInitialized(): boolean {
    return this.anthropic !== null && this.apiKey !== '';
  }

  /**
   * Get current model being used
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Set a different model
   */
  setModel(model: string): void {
    this.model = model;
    console.log(`🔄 Claude model changed to: ${model}`);
  }
}

export const claudeService = new ClaudeService();
