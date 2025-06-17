
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { YouTubeVideo } from '@/types/youtube';
import { formatDuration, formatViewCount } from '@/services/youtubeApi';
import { useNavigate } from 'react-router-dom';

interface VideoCardProps {
  video: YouTubeVideo;
}

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/video/${video.id}`);
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm border border-gray-200/50"
      onClick={handleClick}
    >
      <CardContent className="p-0">
        <div className="relative">
          <img 
            src={video.thumbnails.medium.url} 
            alt={video.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
          <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
            {formatDuration(video.duration)}
          </Badge>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
            {video.title}
          </h3>
          <p className="text-sm text-gray-600 mb-2">{video.channelTitle}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{formatViewCount(video.viewCount)}</span>
            <span>{timeAgo(video.publishedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoCard;
