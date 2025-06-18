
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTextToSpeech = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const convertToSpeech = async (text: string) => {
    setIsLoading(true);
    try {
      console.log('🎵 Converting text to speech...');
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text }
      });

      if (error) {
        console.error('❌ TTS Error:', error);
        throw new Error(error.message || 'Failed to convert text to speech');
      }

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      console.log('✅ TTS successful, creating audio element...');
      
      // Convert base64 to blob
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Stop current audio if playing
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      // Create new audio element
      const audio = new Audio(audioUrl);
      setCurrentAudio(audio);
      
      audio.onloadstart = () => console.log('🎵 Audio loading...');
      audio.oncanplay = () => console.log('✅ Audio ready to play');
      audio.onplay = () => setIsPlaying(true);
      audio.onpause = () => setIsPlaying(false);
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      // Play the audio
      await audio.play();
      console.log('🎵 Audio playing...');
      
    } catch (error) {
      console.error('❌ TTS conversion failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return {
    convertToSpeech,
    stopAudio,
    isLoading,
    isPlaying
  };
};
