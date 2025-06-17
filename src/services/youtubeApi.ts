import { supabase } from '@/integrations/supabase/client';
import type {
  YouTubeVideo,
  YouTubeSearchResponse,
  TranscriptItem
} from '@/types/youtube';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /** Search for videos (last 24h, sorted by viewCount) */
  async searchVideos(keyword: string): Promise<YouTubeVideo[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const publishedAfter = yesterday.toISOString();

    // 1) search
    const searchRes = await fetch(
      `${YOUTUBE_API_BASE}/search?part=snippet` +
      `&q=${encodeURIComponent(keyword)}` +
      `&type=video` +
      `&publishedAfter=${publishedAfter}` +
      `&order=viewCount` +
      `&maxResults=10` +
      `&key=${this.apiKey}`
    );
    if (!searchRes.ok) {
      throw new Error(`YouTube search failed: ${searchRes.statusText}`);
    }
    const searchData: YouTubeSearchResponse = await searchRes.json();
    if (!searchData.items?.length) return [];

    // 2) stats
    const ids = searchData.items.map(item => item.id.videoId).join(',');
    const statsRes = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=statistics,contentDetails` +
      `&id=${ids}` +
      `&key=${this.apiKey}`
    );
    if (!statsRes.ok) {
      throw new Error(`YouTube stats fetch failed: ${statsRes.statusText}`);
    }
    const statsData = await statsRes.json();

    // 3) merge
    return searchData.items.map((item, i) => {
      const stats = statsData.items?.[i];
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
        publishedAt: item.snippet.publishedAt,
        description: item.snippet.description,
        viewCount: stats?.statistics.viewCount ?? '0',
        duration: stats?.contentDetails.duration ?? 'PT0S'
      };
    })
    .sort((a, b) => parseInt(b.viewCount) - parseInt(a.viewCount));
  }

  /** Fetch a transcript via our Supabase Edge Function */
  async getVideoTranscript(videoId: string): Promise<TranscriptItem[]> {
    const { data, error } = await supabase.functions.invoke('fetch-transcript', {
      body: JSON.stringify({ videoId }),
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Failed to fetch transcript');
    }

    // data is expected to be Array<{ text: string; start: number }>
    return data as TranscriptItem[];
  }
}

/** Helpers you already had below… */
export const formatDuration = (duration: string): string => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1]?.replace('H', '') || '0');
  const minutes = parseInt(match[2]?.replace('M', '') || '0');
  const seconds = parseInt(match[3]?.replace('S', '') || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:` +
           seconds.toString().padStart(2, '0');
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatViewCount = (count: string): string => {
  const num = parseInt(count);
  if (num >= 1_000_000) return `${(num/1_000_000).toFixed(1)}M views`;
  if (num >= 1_000)     return `${(num/1_000).toFixed(1)}K views`;
  return `${num} views`;
};