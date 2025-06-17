
export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  publishedAt: string;
  description: string;
  viewCount: string;
  duration: string;
}

export interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      channelTitle: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
      publishedAt: string;
      description: string;
    };
  }>;
}

export interface VideoStatistics {
  viewCount: string;
  likeCount: string;
  commentCount: string;
}

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}
