import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  View,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../constants/theme';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { geminiService } from '../services/gemini';

interface SimpleCPRVoiceButtonProps {
  compact?: boolean;
  /** Minimal styling - no strong background, fits inline with other buttons */
  inline?: boolean;
}

export const SimpleCPRVoiceButton: React.FC<SimpleCPRVoiceButtonProps> = ({ compact, inline }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [geminiResponse, setGeminiResponse] = useState('');
  const [maxTokens, setMaxTokens] = useState(1024);
  const playbackCancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      // Simple cleanup
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  // Clear chat function and stop any playing audio
  const clearChat = async () => {
    // Cancel any ongoing buffered playback
    playbackCancelledRef.current = true;
    
    // Stop any currently playing audio
    try {
      const { AudioService } = await import('../services/audioService');
      await AudioService.stopAudio();
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
    
    // Clear states and reset token limit
    setUserQuestion('');
    setGeminiResponse('');
    setIsProcessing(false);
    setIsPlaying(false);
    setMaxTokens(1024); // Reset for next question
    
    // Stop recording if active
    if (recording) {
      recording.stopAndUnloadAsync().catch(() => {});
      setRecording(null);
    }
    setIsRecording(false);
  };

  // Simple start recording - like it used to work
  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...');
      
      // Reset maxOutputTokens to avoid rate limiting on new questions
      setMaxTokens(1024);
      console.log('🔄 Reset maxOutputTokens to 1024 for new question');
      
      // Clean up any existing recording first
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.log('Cleaned up existing recording');
        }
        setRecording(null);
      }
      
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission required', 'Please enable microphone access.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();

      setRecording(rec);
      setIsRecording(true);
      setUserQuestion('');
      setGeminiResponse('');
      
      console.log('🎤 Recording started');
    } catch (err) {
      console.error('Recording error:', err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  // Simple stop recording and process - like it used to work
  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('🛑 Stopping recording...');
      setIsRecording(false);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) {
        Alert.alert('Error', 'No audio recorded.');
        setRecording(null);
        return;
      }

      // Process the audio
      await handleVoiceToResponse(uri);
      setRecording(null);
    } catch (err) {
      console.error('Stop recording error:', err);
      Alert.alert('Error', 'Failed to stop recording.');
      setRecording(null);
      setIsRecording(false);
    }
  };

  // Process voice to response using Gemini STT and TTS
  const handleVoiceToResponse = async (audioUri: string) => {
    try {
      setIsProcessing(true);

      // Step 1: Read audio file as base64
      let audioBase64: string;
      let mimeType = 'audio/mp4'; // expo-av m4a = AAC in MP4 container

      if (audioUri.startsWith('file://')) {
        // Native: use expo-file-system (expo-av records m4a on iOS, m4a/3gp on Android)
        audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
          encoding: 'base64',
        });
        const pathLower = audioUri.toLowerCase();
        if (pathLower.endsWith('.m4a') || pathLower.endsWith('.mp4')) mimeType = 'audio/mp4';
        else if (pathLower.endsWith('.mp3')) mimeType = 'audio/mp3';
        else if (pathLower.endsWith('.wav')) mimeType = 'audio/wav';
      } else {
        // Web: fetch blob and convert to base64
        const response = await fetch(audioUri);
        const blob = await response.blob();
        audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result?.includes(',') ? result.split(',')[1] : result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Step 2: Speech to Text with Gemini multimodal API
      const text = await geminiService.speechToText(audioBase64, mimeType);

      if (!text.trim()) {
        Alert.alert('No speech detected', 'Try speaking clearly and try again. Make sure you\'re in a quiet environment.');
        setIsProcessing(false);
        return;
      }
      
      setUserQuestion(text);
      
      // Step 3: Get response from Gemini and speak it with Gemini
      await askGemini(text);

    } catch (err) {
      console.error('Voice processing error:', err);
      Alert.alert('Error', 'Speech recognition failed.');
      setIsProcessing(false);
    }
  };

  // Fallback response when API is unavailable
  const getFallbackResponse = (question: string): string => {
    const q = question.toLowerCase();
    if (q.includes('cpr') || q.includes('heart') || q.includes('unconscious')) {
      return 'For CPR: Call 911 first. Place the person on their back. Put the heel of one hand on the center of their chest, place your other hand on top. Push hard and fast, 2 inches deep, 100 to 120 times per minute. After 30 compressions, give 2 rescue breaths. Continue until help arrives.';
    }
    if (q.includes('choking') || q.includes('airway')) {
      return 'For choking: Call 911. Stand behind the person, wrap your arms around their waist. Make a fist with one hand, place it above their navel. Grab your fist with your other hand and give quick upward thrusts. Repeat until the object is dislodged or help arrives.';
    }
    if (q.includes('bleeding') || q.includes('blood')) {
      return 'For severe bleeding: Call 911. Apply direct pressure with a clean cloth or gauze. Keep pressure on the wound for at least 10 minutes. If blood soaks through, add more cloth on top—do not remove the first layer. Elevate the injured area if possible.';
    }
    return 'In any emergency, call 911 first. Stay calm and follow the dispatcher\'s instructions. For CPR: 30 compressions at 100-120 per minute, then 2 breaths. For choking: perform the Heimlich maneuver. If you need more specific guidance, please try again when the connection is better.';
  };

  // Ask Gemini for CPR guidance and speak with Gemini TTS
  const askGemini = async (question: string) => {
    try {
      const cprPrompt = `You are an emergency CPR instructor helping save lives.
Provide clear, concise, step-by-step CPR instructions. If the situation sounds like an emergency, get right to the point.
Always remind users to call 911 first in a real emergency.
Use simple, calm language that anyone can follow under stress.
For CPR: 30 compressions (2 inches deep, 100-120 per minute), then 2 breaths.

User question: ${question}

Provide a helpful response (2-4 short paragraphs max):`;

      let reply = '';
      try {
        reply = await geminiService.generateText(cprPrompt, { maxTokens });
      } catch (apiErr) {
        console.warn('Gemini API failed, using fallback:', apiErr);
        reply = getFallbackResponse(question);
      }

      const finalReply = reply.trim() || getFallbackResponse(question);
      setGeminiResponse(finalReply);

      try {
        await speakWithGemini(finalReply);
      } catch (ttsErr) {
        console.warn('TTS failed, response still shown:', ttsErr);
        // User still sees the text
      }
    } catch (err) {
      console.error('Voice assistant error:', err);
      const fallback = getFallbackResponse(question);
      setGeminiResponse(fallback);
      try {
        await speakWithGemini(fallback);
      } catch {
        // At least they see the text
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Clean text for TTS by removing markdown and unwanted characters
  const cleanTextForTTS = (text: string): string => {
    return text
      // Remove markdown bold (**text**)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      // Remove markdown italic (*text*)
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove standalone asterisks
      .replace(/\*/g, '')
      // Remove markdown strikethrough (~~text~~)
      .replace(/~~([^~]+)~~/g, '$1')
      // Remove standalone tildes
      .replace(/~/g, '')
      // Remove markdown headers (# ## ###)
      .replace(/^#{1,6}\s*/gm, '')
      // Remove horizontal rules (--- or ***)
      .replace(/^[-*]{3,}$/gm, '')
      // Remove standalone dashes at start of lines (bullet points)
      .replace(/^[\s]*[-•]\s*/gm, '')
      // Remove extra dashes and hyphens that aren't part of words
      .replace(/\s--+\s/g, ', ')
      .replace(/--+/g, '-')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Trim whitespace
      .trim();
  };

  // Split text into sentences for buffered processing
  const splitIntoSentences = (text: string): string[] => {
    // Split on sentence endings, keeping the punctuation
    const sentences = text.split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim());
    
    // If no proper sentences found, split by length
    if (sentences.length <= 1 && text.length > 100) {
      const chunks = [];
      const words = text.split(' ');
      let currentChunk = '';
      
      for (const word of words) {
        if (currentChunk.length + word.length > 80) {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = word;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + word;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
      return chunks;
    }
    
    return sentences;
  };

  // Buffered TTS with 2-chunk ahead generation for seamless playback
  const speakWithGemini = async (text: string) => {
    try {
      setIsPlaying(true);
      playbackCancelledRef.current = false;
      
      // Clean the text before processing
      const cleanedText = cleanTextForTTS(text);
      console.log('🔊 Original text:', text.substring(0, 100) + '...');
      console.log('🔊 Cleaned text:', cleanedText.substring(0, 100) + '...');
      
      // Split into sentences for buffered processing
      const sentences = splitIntoSentences(cleanedText);
      console.log('🔊 Processing', sentences.length, 'chunks with 2-ahead buffering');
      
      if (sentences.length === 0) return;
      
      // Get AudioService reference
      const { AudioService } = await import('../services/audioService');
      
      // Audio buffer to store ready chunks
      const audioBuffer: string[] = [];
      
      // Generate first 2 chunks in parallel before starting playback
      const initialChunks = Math.min(2, sentences.length);
      console.log('🔊 Pre-generating first', initialChunks, 'chunks...');
      
      const initialPromises = sentences.slice(0, initialChunks).map(sentence => 
        geminiService.textToSpeech(sentence)
      );
      
      const initialResults = await Promise.allSettled(initialPromises);
      
      // Add successful chunks to buffer
      initialResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          audioBuffer.push(result.value);
          console.log(`✅ Buffered chunk ${index + 1}`);
        }
      });
      
      if (audioBuffer.length === 0) {
        throw new Error('Failed to generate initial audio chunks');
      }
      
      console.log('🚀 Starting playback with', audioBuffer.length, 'chunks buffered');
      let currentChunkIndex = 0;
      
      // Start generating remaining chunks in background
      const remainingPromises = sentences.slice(initialChunks).map(sentence => 
        geminiService.textToSpeech(sentence)
      );
      
      let remainingIndex = 0;
      const remainingResults = remainingPromises.map(async (promise, index) => {
        try {
          const result = await promise;
          console.log(`✅ Generated ahead chunk ${initialChunks + index + 1}`);
          return result;
        } catch (error) {
          console.error(`❌ Failed to generate chunk ${initialChunks + index + 1}:`, error);
          return null;
        }
      });
      
      // Play buffered chunks sequentially
      while (currentChunkIndex < audioBuffer.length || remainingIndex < remainingResults.length) {
        // Check if user cancelled
        if (playbackCancelledRef.current) {
          console.log('🛑 Playback cancelled by user');
          break;
        }
        
        let audioToPlay: string | null = null;
        
        // Use buffered chunk if available
        if (currentChunkIndex < audioBuffer.length) {
          audioToPlay = audioBuffer[currentChunkIndex];
        } 
        // Otherwise wait for next remaining chunk
        else if (remainingIndex < remainingResults.length) {
          audioToPlay = await remainingResults[remainingIndex];
          remainingIndex++;
        }
        
        if (audioToPlay && !playbackCancelledRef.current) {
          console.log(`🔊 Playing chunk ${currentChunkIndex + 1}/${sentences.length}`);
          await AudioService.playAudio(audioToPlay, currentChunkIndex === 0); // Haptic only on first
        }
        
        currentChunkIndex++;
      }
      
      setIsProcessing(false);
      setIsPlaying(false);
      console.log('🎉 Buffered playback completed');
      
    } catch (err) {
      console.error('Buffered TTS error:', err);
      setIsProcessing(false);
      setIsPlaying(false);
    }
  };

  // No helper functions needed - Gemini service handles everything

  return (
    <View style={[s.container, compact && s.containerCompact, inline && s.containerInline]}>
      <TouchableOpacity
        style={[
          s.button,
          compact && s.buttonCompact,
          inline && s.buttonInline,
          isRecording && s.buttonRecording,
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Text style={[s.buttonText, compact && s.buttonTextCompact]} numberOfLines={1} adjustsFontSizeToFit>
          {isRecording ? '🛑 Ask AI' : '🎤 Voice Assistant'}
        </Text>
        {!compact && !isRecording && (
          <Text style={s.buttonSubtext}>Ask questions & get guidance</Text>
        )}
      </TouchableOpacity>

      {userQuestion !== '' && (
        <View style={[s.questionContainer, compact && s.expandedCompact, inline && s.expandedInline]}>
          <Text style={[s.label, compact && s.labelCompact]}>You:</Text>
          <Text style={[s.questionText, compact && s.textCompact]} numberOfLines={compact ? 2 : undefined}>{userQuestion}</Text>
        </View>
      )}

      {(isProcessing || isPlaying) && (
        <View style={[s.loadingContainer, compact && s.loadingCompact]}>
          <ActivityIndicator size={compact ? 'small' : 'large'} color={colors.primary} />
          <Text style={[s.loadingText, compact && s.textCompact]}>
            {isPlaying ? '🔊 Speaking...' : 'Processing...'}
          </Text>
        </View>
      )}

      {geminiResponse !== '' && !isProcessing && (
        <View style={[s.responseContainer, compact && s.expandedCompact, inline && s.expandedInline]}>
          <Text style={[s.label, compact && s.labelCompact]}>AI:</Text>
          <Text style={[s.responseText, compact && s.textCompact]} numberOfLines={compact ? 4 : undefined}>{geminiResponse}</Text>
        </View>
      )}

      {(userQuestion !== '' || geminiResponse !== '' || isPlaying) && (
        <TouchableOpacity 
          style={[s.clearButton, compact && s.clearButtonCompact, isPlaying && s.clearButtonActive]} 
          onPress={clearChat}
        >
          <Text style={[s.clearButtonText, isPlaying && s.clearButtonTextActive]}>{isPlaying ? '🛑' : '✕'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', gap: spacing.md },
  containerCompact: { gap: spacing.xs },
  containerInline: { width: '100%' },
  button: {
    backgroundColor: colors.accentMuted,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonCompact: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonInline: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  buttonRecording: {
    backgroundColor: colors.successMuted,
    borderColor: colors.success,
  },
  buttonText: { 
    ...typography.label, 
    color: colors.text,
    fontSize: 16 
  },
  buttonTextCompact: {
    fontSize: 13,
  },
  buttonSubtext: { 
    ...typography.caption, 
    color: colors.textSecondary, 
    marginTop: 4,
    fontWeight: '500',
  },
  questionContainer: {
    width: '100%',
    backgroundColor: colors.accentMuted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandedCompact: {
    padding: spacing.sm,
    maxHeight: 80,
  },
  expandedInline: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  responseContainer: {
    width: '100%',
    backgroundColor: colors.successMuted,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { 
    ...typography.caption, 
    marginBottom: spacing.sm, 
    color: colors.textSecondary 
  },
  labelCompact: {
    marginBottom: spacing.xs,
    fontSize: 10,
  },
  questionText: { 
    ...typography.body, 
    color: colors.accent 
  },
  responseText: { 
    ...typography.body, 
    color: colors.text 
  },
  textCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  loadingContainer: { alignItems: 'center', gap: spacing.sm },
  loadingCompact: { gap: spacing.xs },
  loadingText: { 
    ...typography.body, 
    color: colors.primary, 
    fontWeight: '600' 
  },
  clearButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonCompact: {
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  clearButtonActive: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  clearButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  clearButtonTextActive: {
    fontSize: 12,
  },
});