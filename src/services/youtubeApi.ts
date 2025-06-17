
import { YouTubeVideo, YouTubeSearchResponse, VideoStatistics, TranscriptItem } from '@/types/youtube';
import { supabase } from '@/integrations/supabase/client';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchVideos(keyword: string): Promise<YouTubeVideo[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const publishedAfter = yesterday.toISOString();

    try {
      // Search for videos
      const searchResponse = await fetch(
        `${YOUTUBE_API_BASE}/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(keyword)}&` +
        `type=video&` +
        `publishedAfter=${publishedAfter}&` +
        `order=viewCount&` +
        `maxResults=10&` +
        `key=${this.apiKey}`
      );

      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.statusText}`);
      }

      const searchData: YouTubeSearchResponse = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        return [];
      }

      // Get video IDs for statistics
      const videoIds = searchData.items.map(item => item.id.videoId).join(',');
      
      // Fetch video statistics
      const statsResponse = await fetch(
        `${YOUTUBE_API_BASE}/videos?` +
        `part=statistics,contentDetails&` +
        `id=${videoIds}&` +
        `key=${this.apiKey}`
      );

      if (!statsResponse.ok) {
        throw new Error(`Statistics fetch failed: ${statsResponse.statusText}`);
      }

      const statsData = await statsResponse.json();
      
      // Combine search results with statistics
      const videos: YouTubeVideo[] = searchData.items.map((item, index) => {
        const stats = statsData.items?.[index];
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnails: item.snippet.thumbnails,
          publishedAt: item.snippet.publishedAt,
          description: item.snippet.description,
          viewCount: stats?.statistics?.viewCount || '0',
          duration: stats?.contentDetails?.duration || 'PT0S'
        };
      });

      // Sort by view count (descending)
      return videos.sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount));
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      throw error;
    }
  }

  async getVideoTranscript(videoId: string): Promise<TranscriptItem[]> {
    try {
      console.log('Fetching transcript via Supabase Edge Function for video:', videoId);
  
      const { data, error } = await supabase.functions.invoke('fetch-transcript', {
        body: JSON.stringify({ videoId }),
 
      });
  
      if (error) {
        console.error('Status:', error.status);
        console.error('Message:', error.message);
        console.error('Error from edge function:', error);
        throw new Error(error.message || 'Failed to fetch transcript');
      }
  
      console.log('Successfully fetched transcript with', (data as any[])?.length || 0, 'items');
      return data as TranscriptItem[];
  
    } catch (err) {
      console.error('Error fetching transcript:', err);
      throw err;
    }
  }
}

export const formatDuration = (duration: string): string => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1]?.replace('H', '') || '0');
  const minutes = parseInt(match[2]?.replace('M', '') || '0');
  const seconds = parseInt(match[3]?.replace('S', '') || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatViewCount = (count: string): string => {
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M views`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K views`;
  }
  return `${num} views`;
};
