import React, { useState, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  View,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { geminiService } from '../services/gemini';

interface SimpleCPRVoiceButtonProps {
  // No API keys needed - using Gemini service
}


export const SimpleCPRVoiceButton: React.FC<SimpleCPRVoiceButtonProps> = () => {
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

      // Step 1: Convert audio to base64 for Gemini STT
      const response = await fetch(audioUri);
      const audioBlob = await response.blob();
      const audioBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            // Remove data URL prefix to get just the base64
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          } else {
            reject(new Error('Failed to convert audio to base64'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Step 2: Speech to Text with Gemini API
      const text = await geminiService.speechToText(audioBase64);
      
      if (!text.trim()) {
        Alert.alert('Error', 'No speech recognized.');
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

  // Ask Gemini for CPR guidance and speak with Gemini TTS
  const askGemini = async (question: string) => {
    try {
      // Create a CPR-focused prompt for Gemini
      const cprPrompt = `You are an emergency CPR instructor helping save lives.
Provide clear, concise, step-by-step CPR instructions. if the situation sounds like an emergancy, get right to the point
Always remind users to call 911 first in a real emergency.
Use simple, calm language that anyone can follow under stress.
For CPR: 30 compressions (2 inches deep, 100-120 per minute), then 2 breaths.

User question: ${question}

Provide a helpful response:`;

      // Use Gemini for the medical response
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
              parts: [{ text: cprPrompt }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: maxTokens,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
      
      // Log token usage for monitoring
      console.log(`📊 Used ${maxTokens} maxOutputTokens for this response`);
      
      setGeminiResponse(reply);

      // Speak response with Gemini TTS
      await speakWithGemini(reply);

    } catch (err) {
      console.error('Gemini error:', err);
      Alert.alert('Error', 'Failed to get response from Gemini.');
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
    <View style={s.container}>
      <TouchableOpacity
        style={[s.button, isRecording && { backgroundColor: '#22c55e' }]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Text style={s.buttonText} numberOfLines={1} adjustsFontSizeToFit>
          {isRecording ? '🛑 Ask AI' : '🎤 Start Voice Assistant'}
        </Text>
        {!isRecording && (
          <Text style={s.buttonSubtext}>Ask questions & get guidance</Text>
        )}
      </TouchableOpacity>

      {userQuestion !== '' && (
        <View style={s.questionContainer}>
          <Text style={s.label}>You said:</Text>
          <Text style={s.questionText}>{userQuestion}</Text>
        </View>
      )}

      {(isProcessing || isPlaying) && (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={s.loadingText}>
            {isPlaying ? '🔊 Speaking...' : 'Processing...'}
          </Text>
        </View>
      )}

      {geminiResponse !== '' && !isProcessing && (
        <View style={s.responseContainer}>
          <Text style={s.label}>CPR Instructor (Gemini):</Text>
          <Text style={s.responseText}>{geminiResponse}</Text>
        </View>
      )}

      {(userQuestion !== '' || geminiResponse !== '' || isPlaying) && (
        <TouchableOpacity 
          style={[s.clearButton, isPlaying && s.clearButtonActive]} 
          onPress={clearChat}
        >
          <Text style={[s.clearButtonText, isPlaying && s.clearButtonTextActive]}>
            {isPlaying ? '🛑' : '✕'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { width: '100%', alignItems: 'center', gap: 16 },
  button: {
    backgroundColor: '#ef4444',
    paddingVertical: 28,
    paddingHorizontal: 50,
    borderRadius: 26,
    minWidth: 320,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  buttonSubtext: { 
    color: 'rgba(255, 255, 255, 0.8)', 
    fontSize: 12, 
    fontWeight: '600',
    marginTop: 2,
  },
  questionContainer: {
    width: '100%',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  responseContainer: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#374151' },
  questionText: { fontSize: 16, color: '#1e40af', lineHeight: 24 },
  responseText: { fontSize: 16, color: '#166534', lineHeight: 24 },
  loadingContainer: { alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 16, color: '#ef4444', fontWeight: '600' },
  clearButton: {
    position: 'absolute',
    top: -22,
    right: -22,
    width: 44,
    height: 44,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  clearButtonActive: {
    backgroundColor: 'rgba(185, 28, 28, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 12,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  clearButtonTextActive: {
    fontSize: 18,
  },
});