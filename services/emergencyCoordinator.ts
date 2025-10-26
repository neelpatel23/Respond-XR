// services/emergencyCoordinator.ts
import { geminiService, GeminiResponse } from './gemini';
import { medicalDispatcherService, DispatcherInput, DispatcherResponse, ClaudeInput } from './medicalDispatcher';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export interface EmergencySession {
  sessionId: string;
  startTime: number;
  mode: 'airway' | 'cpr' | 'pulse' | 'seizure';
  isActive: boolean;
  lastAnalysis?: GeminiResponse;
  lastGuidance?: DispatcherResponse;
  userFeedback?: string;
}

export interface CoordinatorResult {
  geminiAnalysis: GeminiResponse;
  dispatcherInput: ClaudeInput;
  dispatcherResponse: DispatcherResponse;
  shouldSpeak: boolean;
  shouldVibrate: boolean;
}

class EmergencyCoordinatorService {
  private currentSession: EmergencySession | null = null;
  private isProcessing = false;

  /**
   * Starts a new emergency session
   */
  startEmergencySession(mode: 'airway' | 'cpr' | 'pulse' | 'seizure'): EmergencySession {
    const session: EmergencySession = {
      sessionId: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      mode,
      isActive: true
    };

    this.currentSession = session;
    medicalDispatcherService.reset();
    
    console.log(`🚨 Emergency session started: ${session.sessionId} (${mode})`);
    return session;
  }

  /**
   * Processes camera image through Gemini and Claude for real-time guidance
   */
  async processEmergencyImage(
    imageBase64: string,
    userFeedback?: string
  ): Promise<CoordinatorResult> {
    if (!this.currentSession || this.isProcessing) {
      throw new Error('No active emergency session or already processing');
    }

    this.isProcessing = true;

    try {
      console.log('🔍 Processing emergency image...');
      
      // Double-check session is still valid
      if (!this.currentSession) {
        throw new Error('Emergency session ended during processing');
      }
      
      // Step 1: Analyze with Gemini
      const geminiAnalysis = await geminiService.analyzeMedicalScene(
        imageBase64, 
        this.currentSession.mode
      );

      console.log('🤖 Gemini analysis complete:', geminiAnalysis);

      // Double-check session is still valid after Gemini call
      if (!this.currentSession) {
        throw new Error('Emergency session ended during processing');
      }

      // Step 2: Format for Claude input
      const dispatcherInput = medicalDispatcherService.formatForClaude(
        geminiAnalysis,
        this.currentSession.mode,
        userFeedback
      );

      console.log('📝 Formatted for Claude:', JSON.stringify(dispatcherInput, null, 2));

      // Double-check session is still valid before Claude call
      if (!this.currentSession) {
        throw new Error('Emergency session ended during processing');
      }

      // Step 3: Use Gemini analysis for voice guidance
      console.log('🎤 Using Gemini analysis for voice guidance...');
      const voiceGuidance = geminiAnalysis.overallInstruction || 
        `Continue with ${this.currentSession.mode} procedure. Stay calm and follow proper technique.`;
      
      // Create dispatcher response with Gemini voice guidance
      const dispatcherResponse: DispatcherResponse = {
        guidance: {
          primary: geminiAnalysis.overallInstruction,
          secondary: 'Continue monitoring the situation',
          urgency: 'medium' as const
        },
        corrections: {
          // Add position corrections if detections are available
          position: geminiAnalysis.detections.length > 0 ? {
            x: geminiAnalysis.detections[0].x,
            y: geminiAnalysis.detections[0].y,
            instruction: geminiAnalysis.detections[0].instruction
          } : undefined
        },
        nextAction: {
          action: 'Continue current procedure',
          timing: 30,
          priority: 3
        },
        voiceGuidance: {
          speak: voiceGuidance,
          tone: 'calm' as const
        },
        hapticFeedback: {
          type: 'medium' as const,
          pattern: [200, 100, 200]
        }
      };
      
      console.log('✅ Gemini voice guidance generated:', voiceGuidance);

      // Double-check session is still valid before updating
      if (!this.currentSession) {
        throw new Error('Emergency session ended during processing');
      }

      // Step 4: Update session
      this.currentSession.lastAnalysis = geminiAnalysis;
      this.currentSession.lastGuidance = dispatcherResponse;

      // Step 5: Execute feedback (speech, haptics)
      console.log('🎯 About to call executeFeedback with dispatcherResponse:', {
        hasResponse: !!dispatcherResponse,
        hasVoiceGuidance: !!dispatcherResponse?.voiceGuidance,
        speakText: dispatcherResponse?.voiceGuidance?.speak
      });
      await this.executeFeedback(dispatcherResponse);

      return {
        geminiAnalysis,
        dispatcherInput,
        dispatcherResponse,
        shouldSpeak: true,
        shouldVibrate: true
      };

    } catch (error) {
      console.error('❌ Emergency processing error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
      
      // Clean up session if it was marked as inactive during processing
      if (this.currentSession && !this.currentSession.isActive) {
        console.log('🧹 Cleaning up inactive session after processing');
        this.currentSession = null;
      }
    }
  }

  /**
   * Executes the dispatcher's feedback (speech via Gemini TTS, haptics)
   */
  private async executeFeedback(response: DispatcherResponse): Promise<void> {
    try {
      console.log('🎯 executeFeedback called with response:', {
        hasVoiceGuidance: !!response.voiceGuidance,
        speakText: response.voiceGuidance?.speak
      });

      // Speech feedback via Gemini TTS
      if (response.voiceGuidance.speak) {
        console.log('🔊 STARTING Gemini TTS - Text:', response.voiceGuidance.speak.substring(0, 100) + '...');
        
        try {
          // Get TTS audio from Gemini
          const audioDataUri = await geminiService.textToSpeech(response.voiceGuidance.speak);
          
          // Play audio using expo-av
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
          });
          
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioDataUri },
            { 
              shouldPlay: true,
              volume: 1.0,
              rate: 1.0,
              shouldCorrectPitch: true,
            }
          );
          
          await sound.setVolumeAsync(1.0);
          
          await new Promise<void>((resolve) => {
            sound.setOnPlaybackStatusUpdate((status: any) => {
              if (status.isLoaded && status.didJustFinish) {
                console.log('🔊 COMPLETED Gemini TTS call');
                sound.unloadAsync();
                resolve();
              }
            });
          });
          
        } catch (ttsError) {
          console.error('❌ Gemini TTS error:', ttsError);
          // Continue with haptic feedback even if TTS fails
        }
      } else {
        console.log('⚠️ No voice guidance text provided');
      }

      // Haptic feedback
      if (response.hapticFeedback.pattern.length > 0) {
        await this.executeHapticPattern(response.hapticFeedback);
      }

    } catch (error) {
      console.error('❌ Feedback execution error:', error);
    }
  }

  /**
   * Executes haptic feedback pattern
   */
  private async executeHapticPattern(haptic: { type: string; pattern: number[] }): Promise<void> {
    const hapticType = haptic.type as 'light' | 'medium' | 'heavy' | 'success' | 'error';
    
    for (let i = 0; i < haptic.pattern.length; i++) {
      const duration = haptic.pattern[i];
      
      switch (hapticType) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }

      // Wait between haptic patterns
      if (i < haptic.pattern.length - 1) {
        await new Promise(resolve => setTimeout(resolve, duration));
      }
    }
  }

  /**
   * Updates user feedback for the current session
   */
  updateUserFeedback(feedback: string): void {
    if (this.currentSession) {
      this.currentSession.userFeedback = feedback;
    }
  }

  /**
   * Gets the current session
   */
  getCurrentSession(): EmergencySession | null {
    return this.currentSession;
  }

  /**
   * Ends the current emergency session
   */
  endEmergencySession(): void {
    if (this.currentSession) {
      this.currentSession.isActive = false;
      console.log(`🏁 Emergency session ended: ${this.currentSession.sessionId}`);
      
      // Wait for any ongoing processing to complete
      if (this.isProcessing) {
        console.log('⏳ Waiting for processing to complete before ending session...');
        // Don't set to null immediately if processing is ongoing
        // The session will be cleaned up when processing finishes
        return;
      }
    }
    this.currentSession = null;
  }

  /**
   * Creates a JSON file for Claude input (for debugging/testing)
   */
  async exportClaudeInput(): Promise<string> {
    if (!this.currentSession?.lastAnalysis) {
      throw new Error('No analysis data to export');
    }

    const dispatcherInput = medicalDispatcherService.formatForClaude(
      this.currentSession.lastAnalysis,
      this.currentSession.mode,
      this.currentSession.userFeedback
    );

    const exportData = {
      timestamp: new Date().toISOString(),
      sessionId: this.currentSession.sessionId,
      mode: this.currentSession.mode,
      claudeInput: dispatcherInput,
      geminiAnalysis: this.currentSession.lastAnalysis,
      emergencyContext: {
        timeElapsed: Math.floor((Date.now() - this.currentSession.startTime) / 1000),
        isActive: this.currentSession.isActive
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Send data to Gemini API for real-time medical guidance
   */
  async sendToGemini(claudeInput: ClaudeInput): Promise<DispatcherResponse> {
    try {
      console.log('📤 Sending to Gemini API for dispatcher guidance...');
      
      // Create a medical dispatcher prompt for Gemini
      const dispatcherPrompt = `You are an emergency medical dispatcher providing real-time guidance.
Based on the following medical analysis, provide clear, actionable instructions.

Current Mode: ${claudeInput.context.currentMode}
Scene Analysis: ${claudeInput.context.geminiAnalysis.overallInstruction}
Detections: ${claudeInput.context.geminiAnalysis.detections.map(d => `${d.label}: ${d.instruction}`).join(', ')}
User Message: ${claudeInput.userMessage}

Provide a JSON response with this exact format:
{
  "guidance": {
    "primary": "Main instruction (keep under 50 words)",
    "secondary": "Additional guidance (optional, under 30 words)"
  },
  "urgency": "low|medium|high",
  "voiceGuidance": {
    "speak": "What to say out loud (clear, calm, under 100 words)"
  }
}`;

      const { GEMINI_API_KEY } = await import('../constants/config');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: dispatcherPrompt }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini dispatcher API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        console.log('✅ Gemini dispatcher response received');
        return parsedResponse;
      } else {
        throw new Error('No valid JSON found in Gemini response');
      }
      
    } catch (error) {
      console.error('❌ Gemini dispatcher API error:', error);
      // Return fallback response
      return medicalDispatcherService.createMockResponse(
        claudeInput.context.geminiAnalysis,
        claudeInput.context.currentMode
      );
    }
  }
}

export const emergencyCoordinatorService = new EmergencyCoordinatorService();
