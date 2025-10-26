// services/fishService.ts
import { Audio } from 'expo-av';

export interface FishServiceConfig {
  apiKey: string;
  voiceId?: string;
  model?: string;
}

class FishService {
  private apiKey: string = '';
  private voiceId: string = '';
  private model: string = 's1';

  constructor() {
    // Initialize with API key from environment
    this.apiKey = process.env.FISH_API_KEY || '';
    if (this.apiKey) {
      console.log('✅ Fish service initialized');
    }
  }

  /**
   * Initialize Fish service with API key
   */
  initialize(apiKey?: string, voiceId?: string, model?: string): void {
    const key = apiKey || this.apiKey;
    if (!key) {
      console.warn('⚠️ Fish API key not provided');
      return;
    }

    this.apiKey = key;
    this.voiceId = voiceId || '';
    this.model = model || 's1';
    console.log('✅ Fish service initialized with API key');
  }

  /**
   * Convert text to speech using Fish API with direct audio playback
   */
  async textToSpeech(text: string): Promise<void> {
    console.log('🎤 Fish TTS called with text:', text.substring(0, 50) + '...');
    console.log('🎤 Fish API key exists:', !!this.apiKey);
    console.log('🎤 Fish service initialized:', this.isInitialized());

    if (!this.apiKey) {
      console.warn('⚠️ Fish service not initialized. Please provide API key.');
      return;
    }

    if (!text || text.trim().length === 0) {
      console.log('⚠️ No text provided for TTS');
      return;
    }

    try {
      console.log('🎤 STEP 1: Converting text to speech with Fish API...');
      console.log('📝 Full text length:', text.length);
      console.log('📝 Text preview:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

      const requestBody: any = {
        text: text.trim(),
        format: 'mp3',
        model: this.model,
      };

      // Add voice ID if provided
      if (this.voiceId) {
        requestBody.reference_id = this.voiceId;
      }

      console.log('🎤 STEP 2: Making Fish API request...');
      console.log('🎤 Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎤 STEP 3: Fish API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fish TTS API error:', errorText);
        throw new Error(`Fish TTS API error: ${response.status} ${errorText}`);
      }

      console.log('✅ STEP 4: Fish TTS response received successfully');

      // Get the audio data directly from Fish API
      console.log('🎤 STEP 5: Converting response to audio blob...');
      const audioBlob = await response.blob();
      console.log('🎤 Audio blob size:', audioBlob.size, 'bytes');
      
      // Convert blob to base64 for direct playback
      console.log('🎤 STEP 6: Converting blob to base64...');
      const base64Audio = await this.blobToBase64(audioBlob);
      console.log('🎤 Base64 audio length:', base64Audio.length, 'characters');
      
      // Play audio using Fish API's audio format directly
      console.log('🎤 STEP 7: Starting audio playback...');
      await this.playFishAudio(base64Audio);
      console.log('🎤 STEP 8: Audio playback completed!');

    } catch (error) {
      console.error('❌ Fish TTS error:', error);
      throw error;
    }
  }

  /**
   * Convert blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Play Fish API audio using expo-av
   */
  private async playFishAudio(base64Audio: string): Promise<void> {
    try {
      console.log('🔊 Playing Fish API audio...');
      
      // Configure audio session for speaker output and maximum volume playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      
      // Create audio player using Expo Audio with maximum volume
      const { sound } = await Audio.Sound.createAsync(
        { uri: base64Audio },
        { 
          shouldPlay: true,
          volume: 1.0,  // Maximum volume
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );
      
      // Ensure maximum volume is set
      await sound.setVolumeAsync(1.0);
      
      // Wait for playback to finish
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('🔊 Fish API audio played successfully!');
            sound.unloadAsync();
            resolve();
          }
        });
      });
      
      console.log('🔊 Fish API audio playback completed!');
      
    } catch (error) {
      console.error('❌ Error playing Fish API audio:', error);
      throw error;
    }
  }

  /**
   * Convert speech to text using Fish API
   */
  async speechToText(audioUri: string, language: string = 'en'): Promise<string> {
    if (!this.apiKey) {
      console.warn('⚠️ Fish service not initialized. Please provide API key.');
      return '';
    }

    try {
      console.log('🎤 Converting speech to text with Fish API...');

      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'speech.wav',
        type: 'audio/wav',
      } as any);
      formData.append('language', language);

      const response = await fetch('https://api.fish.audio/v1/asr', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Fish STT API error:', errorText);
        throw new Error(`Fish STT API error: ${response.status} ${errorText}`);
      }

      const rawText = await response.text();
      let sttData;
      
      try {
        sttData = JSON.parse(rawText);
      } catch {
        console.error('❌ Fish STT response not JSON:', rawText);
        throw new Error('Invalid JSON response from Fish STT');
      }

      if (sttData.text) {
        console.log('✅ Fish STT result:', sttData.text);
        return sttData.text;
      } else {
        console.warn('⚠️ No text in Fish STT response:', sttData);
        return '';
      }

    } catch (error) {
      console.error('❌ Fish STT error:', error);
      throw error;
    }
  }

  /**
   * Check if Fish service is properly initialized
   */
  isInitialized(): boolean {
    return this.apiKey !== '';
  }

  /**
   * Get current configuration
   */
  getConfig(): FishServiceConfig {
    return {
      apiKey: this.apiKey,
      voiceId: this.voiceId,
      model: this.model,
    };
  }

  /**
   * Set a different voice ID
   */
  setVoiceId(voiceId: string): void {
    this.voiceId = voiceId;
    console.log(`🔄 Fish voice ID changed to: ${voiceId}`);
  }

  /**
   * Set a different model
   */
  setModel(model: string): void {
    this.model = model;
    console.log(`🔄 Fish model changed to: ${model}`);
  }
}

export const fishService = new FishService();
