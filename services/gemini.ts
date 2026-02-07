// services/gemini.ts
import { API_CONFIG } from "../config/api";

export interface DetectionResult {
  x: number; y: number; width: number; height: number;
  confidence: number; label: string; instruction: string;
}

export interface GeminiResponse {
  detections: DetectionResult[];
  overallInstruction: string;
  rawTextAnalysis?: string;
}

class GeminiService {
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";
  
  // Model selection based on emergency mode complexity
  private readonly GEMINI_2_5_FLASH_LITE = "models/gemini-2.5-flash-8b";
  private readonly GEMINI_2_5_PRO = "models/gemini-2.5-pro";

  constructor() {
    this.apiKey = API_CONFIG.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      console.warn("Gemini API key not configured. Set EXPO_PUBLIC_GEMINI_API_KEY in .env");
    }
  }

  /**
   * Select appropriate Gemini model based on emergency mode complexity
   */
  private getModelForMode(mode: "airway" | "cpr" | "pulse" | "seizure"): string {
    switch (mode) {
      case "airway":
      case "seizure":
        // Use Gemini 2.5 Flash-Lite for simpler tasks (faster, lightweight)
        console.log(`🚀 Using Gemini 2.5 Flash-Lite for ${mode} mode`);
        return this.GEMINI_2_5_FLASH_LITE;
      
      case "cpr":
      case "pulse":
        // Use Gemini 2.5 Flash for complex tasks (higher accuracy needed)
        console.log(`🎯 Using Gemini 2.5 Flash for ${mode} mode`);
        return this.GEMINI_2_5_PRO;
      
      default:
        console.log(`⚠️ Unknown mode ${mode}, defaulting to Gemini 2.5 Flash`);
        return this.GEMINI_2_5_FLASH_LITE;
    }
  }

  async analyzeMedicalScene(
    imageBase64: string,
    mode: "airway" | "cpr" | "pulse" | "seizure"
  ): Promise<GeminiResponse> {
    // if (!isApiKeyConfigured()) {
    //   console.warn("Gemini API key not configured, using fallback response");
    //   return this.getFallbackResponse(mode);
    // }

    console.log("🎯 XR Feature: No rate limiting - making immediate API call");

    const modelName = this.getModelForMode(mode);
    const prompt = this.getPromptForMode(mode);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    };

    try {
      console.log("Sending image analysis request to Gemini...");
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log("Gemini API Response Status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error:", errorText);
        // Return fallback if API fails
        return this.getFallbackResponse(mode);
      }

      const data = await response.json();
      console.log("Gemini API Success!");
      console.log("Raw Gemini response:", JSON.stringify(data, null, 2));
      return this.parseGeminiResponse(data, mode);
    } catch (error) {
      console.error("Gemini API error:", error);
      return this.getFallbackResponse(mode);
    }
  }



  private getPromptForMode(mode: string): string {
    const basePrompt = `You are a medical AI that detects body parts for emergency procedures. Look at the image and find the EXACT location of the required body part. Return JSON:
    {
      "detections": [
        {
          "x": 0.5, "y": 0.3, "width": 0.2, "height": 0.15,
          "confidence": 0.85, "label": "Body Part", "instruction": "Place here"
        }
      ],
      "overallInstruction": "Brief guidance"
    }
    Coordinates: (0,0)=top-left, (1,1)=bottom-right. Only detect if person visible.`;

    switch (mode) {
      case "airway":
        // Optimized for Gemini 2.5 Flash-Lite - concise and direct
        return (
          basePrompt +
          ` AIRWAY: Locate HEAD and NECK. Detect FOREHEAD and CHIN for head-tilt/chin-lift maneuver.`
        );
      case "cpr":
        // Optimized for Gemini 2.5 Flash - detailed and precise
        return (
          basePrompt +
          ` CPR: Find the person's CHEST/TORSO. Detect the CENTER of the chest where compressions should be performed. Look for the sternum area between the nipples. Do not select the stomach or ribs. Be extremely accurate with placement - this is life-critical. If hands are already positioned, verify correct sternum placement.`
        );
      case "pulse":
        // Optimized for Gemini 2.5 Flash - detailed anatomical precision
        return (
          basePrompt +
          ` PULSE: Locate the CAROTID PULSE precisely. Find the groove between the windpipe (trachea) and the sternocleidomastoid muscle on the side of the neck. This is critical for detecting circulation. Accuracy is essential.`
        );
      case "seizure":
        // Optimized for Gemini 2.5 Flash-Lite - quick safety assessment
        return (
          basePrompt +
          ` SEIZURE: Identify HEAD and BODY protection zones. Detect areas needing cushioning and support.`
        );
      default:
        return basePrompt;
    }
  }

  private parseGeminiResponse(data: any, mode: string): GeminiResponse {
    try {
      console.log("Parsing Gemini response:", JSON.stringify(data, null, 2));

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        console.log("No text in response, checking for safety issues...");

        // Check if response was blocked due to safety
        if (data.candidates?.[0]?.finishReason === "SAFETY") {
          console.log("Response blocked due to safety concerns");
          return this.getFallbackResponse(mode);
        }

        // Check if response hit token limit
        if (data.candidates?.[0]?.finishReason === "MAX_TOKENS") {
          console.log("Response hit token limit, using fallback");
          return this.getFallbackResponse(mode);
        }

        // Check if there are any other finish reasons
        const finishReason = data.candidates?.[0]?.finishReason;
        console.log("Finish reason:", finishReason);

        throw new Error("No response text from Gemini");
      }

      // Extract JSON from the response
      console.log("📄 Raw text response:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log("❌ No JSON found in response, using fallback");
        return this.getFallbackResponse(mode);
      }
      console.log("🔍 Found JSON in response:", jsonMatch[0]);

      const parsed = JSON.parse(jsonMatch[0]);
      console.log(
        "✅ Successfully parsed Gemini response:",
        JSON.stringify(parsed, null, 2)
      );
      console.log("📊 Detections found:", parsed.detections?.length || 0);
      console.log("📝 Overall instruction:", parsed.overallInstruction);
      return parsed;
    } catch (error) {
      console.error("Failed to parse Gemini response:", error);
      return this.getFallbackResponse(mode);
    }
  }

  private getFallbackResponse(mode: string): GeminiResponse {
    console.log(`🔄 Using fallback response for ${mode} mode`);
    console.log(`📢 FALLBACK RESPONSE WILL STILL TRIGGER CLAUDE + FISH AUDIO`);
    const fallbacks = {
      airway: {
        detections: [
          {
            x: 0.4,
            y: 0.2,
            width: 0.2,
            height: 0.15,
            confidence: 0.8,
            label: "Forehead Hand",
            instruction: "Place hand on forehead for head-tilt",
          },
          {
            x: 0.35,
            y: 0.35,
            width: 0.2,
            height: 0.12,
            confidence: 0.8,
            label: "Chin Hand",
            instruction: "Support chin with fingers for chin-lift",
          },
        ],
        overallInstruction:
          "Head-tilt/chin-lift: Place one hand on forehead, other under chin",
      },
      cpr: {
        detections: [
          {
            x: 0.4,
            y: 0.5,
            width: 0.2,
            height: 0.15,
            confidence: 0.8,
            label: "Hand Placement",
            instruction: "Place hands on lower half of sternum",
          },
        ],
        overallInstruction:
          "CPR: Place hands on center of chest, lower half of sternum",
      },
      pulse: {
        detections: [
          {
            x: 0.2,
            y: 0.3,
            width: 0.15,
            height: 0.12,
            confidence: 0.8,
            label: "Carotid Pulse",
            instruction: "Place fingers on carotid pulse (neck)",
          },
          {
            x: 0.15,
            y: 0.6,
            width: 0.12,
            height: 0.1,
            confidence: 0.8,
            label: "Radial Pulse",
            instruction: "Feel radial pulse (wrist)",
          },
        ],
        overallInstruction:
          "Pulse Check: Try carotid (neck) or radial (wrist) pulse",
      },
      seizure: {
        detections: [
          {
            x: 0.4,
            y: 0.25,
            width: 0.2,
            height: 0.15,
            confidence: 0.8,
            label: "Head Protection",
            instruction: "Protect and cushion head area",
          },
          {
            x: 0.3,
            y: 0.6,
            width: 0.4,
            height: 0.2,
            confidence: 0.8,
            label: "Body Support",
            instruction: "Support body in safe position",
          },
        ],
        overallInstruction:
          "Seizure Safety: Protect head, support body, clear area",
      },
    };
    return (fallbacks as any)[mode] || (fallbacks as any).airway;
  }

  /**
   * Convert speech to text using Gemini's multimodal API (audio understanding)
   * Uses the same API key as the rest of the app - no separate Speech API needed.
   */
  async speechToText(audioBase64: string, mimeType: string = 'audio/mp4'): Promise<string> {
    try {
      console.log('🎤 Transcribing audio with Gemini multimodal API...');

      const requestBody = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe the speech in this audio. Return only the exact words spoken, nothing else. If there is no speech, return "silence".',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      };

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini STT API error:', response.status, errText);
        throw new Error(`Gemini transcription error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      // Normalize "silence" or empty responses
      const transcript = text.toLowerCase() === 'silence' ? '' : text;
      console.log('✅ Gemini transcription result:', transcript || '(empty)');
      return transcript;
    } catch (error) {
      console.error('❌ Gemini transcription error:', error);
      throw error;
    }
  }

  /**
   * Generate text from Gemini - robust with retries, model fallback, and error handling.
   * Used by voice assistant and other text-generation features.
   */
  async generateText(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    if (!this.apiKey?.trim()) {
      console.warn("Gemini API key not set");
      throw new Error("API key not configured");
    }

    const maxTokens = Math.min(options?.maxTokens ?? 1024, 8192);
    const temperature = Math.max(0, Math.min(1, options?.temperature ?? 0.1));
    const models = ["models/gemini-2.5-flash", "models/gemini-1.5-flash", "models/gemini-1.5-pro"];

    const makeRequest = async (model: string): Promise<string> => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );

      const body = await response.text();
      let data: Record<string, unknown>;
      try {
        data = body ? JSON.parse(body) : {};
      } catch {
        data = {};
      }

      if (!response.ok) {
        const err = data as { error?: { message?: string; code?: number } };
        const errMsg = err?.error?.message || body?.slice(0, 200) || `HTTP ${response.status}`;
        console.warn(`Gemini ${model} error:`, response.status, errMsg);
        throw new Error(errMsg);
      }

      const cand = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0];
      const text = cand?.content?.parts?.[0]?.text?.trim() || "";
      return text;
    };

    let lastError: Error | null = null;
    for (const model of models) {
      try {
        const result = await makeRequest(model);
        if (result) return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message;
        const is400 = msg.includes("400") || msg.includes("Invalid") || msg.includes("not found");
        if (is400) continue; // try next model
        const isRetryable = msg.includes("429") || msg.includes("503") || msg.includes("500");
        if (isRetryable) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        throw lastError;
      }
    }
    if (lastError) throw lastError;
    return "";
  }

  /**
   * Convert text to speech using Gemini Text-to-Speech API
   */
  async textToSpeech(text: string): Promise<string> {
    try {
      console.log('🔊 Converting text to speech with Gemini...');
      
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: 'en-US',
              name: 'en-US-Journey-F',
              ssmlGender: 'FEMALE',
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
              pitch: 0.0,
              volumeGainDb: 0.0,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini TTS API error: ${response.status}`);
      }

      const data = await response.json();
      const audioContent = data.audioContent;
      
      if (!audioContent) {
        throw new Error('No audio content received from Gemini TTS');
      }
      
      // Convert base64 to data URI for audio playback
      const audioDataUri = `data:audio/mp3;base64,${audioContent}`;
      
      console.log('✅ Gemini TTS audio generated');
      return audioDataUri;
      
    } catch (error) {
      console.error('❌ Gemini TTS error:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
