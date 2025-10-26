// services/audioService.ts
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export class AudioService {
  private static isInitialized = false;
  private static currentSound: Audio.Sound | null = null;

  /**
   * Initialize audio session with consistent settings across the app
   */
  static async initializeAudio(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        // Configure for media playback through speakers
      });
      
      this.isInitialized = true;
      console.log('✅ AudioService initialized with consistent settings');
    } catch (error) {
      console.error('❌ AudioService initialization failed:', error);
    }
  }

  /**
   * Configure audio session for speaker output
   */
  static async configureSpeakerOutput(): Promise<void> {
    try {
      // Ensure audio is initialized first
      await this.initializeAudio();
      
      // Re-configure specifically for speaker output
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('🔊 Audio configured for speaker output');
    } catch (error) {
      console.error('❌ Speaker configuration failed:', error);
    }
  }

  /**
   * Stop any currently playing audio
   */
  static async stopAudio(): Promise<void> {
    try {
      if (this.currentSound) {
        console.log('🛑 Stopping current audio playback...');
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
        this.currentSound = null;
        console.log('🛑 Audio stopped successfully');
      }
    } catch (error) {
      console.error('❌ Error stopping audio:', error);
      this.currentSound = null;
    }
  }

  /**
   * Check if audio is currently playing
   */
  static isPlaying(): boolean {
    return this.currentSound !== null;
  }

  /**
   * Play audio with maximum volume and haptic feedback
   */
  static async playAudio(base64Audio: string, withHaptic: boolean = true): Promise<void> {
    try {
      // Stop any currently playing audio first
      await this.stopAudio();
      
      // Configure for speaker output before playing
      await this.configureSpeakerOutput();

      if (withHaptic) {
        // Haptic feedback to confirm audio playback
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        console.log('🔊 Haptic feedback triggered - audio starting...');
      }

      console.log('🔊 Creating audio player with maximum volume and speaker routing...');
      
      // Create audio player with maximum volume
      const { sound } = await Audio.Sound.createAsync(
        { uri: base64Audio },
        { 
          shouldPlay: true,
          volume: 1.0,  // Maximum volume
          rate: 1.0,
          shouldCorrectPitch: true,
        }
      );
      
      // Store reference to current sound
      this.currentSound = sound;
      
      // Ensure maximum volume is set
      await sound.setVolumeAsync(1.0);
      console.log('🔊 Volume set to maximum (1.0)');
      
      // Wait for playback to finish
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('🔊 Audio played successfully');
            sound.unloadAsync();
            this.currentSound = null; // Clear reference when finished
            resolve();
          }
        });
      });
      
    } catch (error) {
      console.error('❌ AudioService playback error:', error);
      this.currentSound = null; // Clear reference on error
      throw error;
    }
  }
}
