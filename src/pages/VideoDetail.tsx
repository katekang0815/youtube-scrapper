
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Play, Clock, FileText, Volume2, VolumeX } from 'lucide-react';
import { YouTubeAPI } from '@/services/youtubeApi';
import type { TranscriptItem } from '@/types/youtube';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useToast } from '@/hooks/use-toast';

const VideoDetail: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { convertToSpeech, stopAudio, isLoading: ttsLoading, isPlaying } = useTextToSpeech();
  const { toast } = useToast();

  useEffect(() => {
    if (videoId) fetchTranscript(videoId);
  }, [videoId]);

  const fetchTranscript = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Use a placeholder key since we'll be using Supabase edge function for transcript
      const youtube = new YouTubeAPI('placeholder');
      const data = await youtube.getVideoTranscript(id);
      console.log("📝 transcript response:", data);
      setTranscript(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  };

  const handlePlayScript = async () => {
    console.log('🎵 Play button clicked');
    console.log('🎵 Current state - isPlaying:', isPlaying, 'ttsLoading:', ttsLoading);
    
    if (isPlaying) {
      console.log('🎵 Stopping audio...');
      stopAudio();
      return;
    }

    if (transcript.length === 0) {
      console.log('❌ No transcript available');
      toast({
        title: "No transcript available",
        description: "Cannot play audio for videos without transcripts.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🎵 Converting transcript to speech...');
      // Create a summary of the transcript
      const transcriptText = transcript.map(item => item.text).join(' ');
      const summary = transcriptText.length > 1000 
        ? transcriptText.substring(0, 1000) + '...' 
        : transcriptText;

      console.log('🎵 Transcript summary length:', summary.length);
      
      await convertToSpeech(summary);
      
      toast({
        title: "Playing transcript summary",
        description: "Audio playback started successfully."
      });
    } catch (error) {
      console.error('❌ TTS Error:', error);
      toast({
        title: "Audio conversion failed",
        description: (error as Error).message || "Failed to convert transcript to speech.",
        variant: "destructive"
      });
    }
  };

  if (!videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Video not found</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="mb-6 hover:bg-red-50 hover:border-red-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Player */}
          <Card className="bg-white/90 backdrop-blur-sm border-gray-200/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-red-600" />
                Video Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          <Card className="bg-white/90 backdrop-blur-sm border-gray-200/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-600" />
                Transcript Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
                  <span className="ml-2">Loading transcript…</span>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!isLoading && !error && transcript.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No transcript available for this video.</p>
                </div>
              )}

              {transcript.length > 0 && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {transcript.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                    >
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.start)}
                      </Badge>
                      <p className="leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator className="my-8" />
        
        <div className="flex flex-col items-center gap-4">
          <p className="text-center text-gray-500 text-sm">Video ID: {videoId}</p>
          
          <Button onClick={handlePlayScript}>
            {isPlaying ? (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Stop Audio
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                {ttsLoading ? 'Converting...' : 'Play Script Summary'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
