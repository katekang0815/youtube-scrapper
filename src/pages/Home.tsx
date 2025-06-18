
import React, { useState } from 'react';
import { YouTubeVideo } from '@/types/youtube';
import { YouTubeAPI } from '@/services/youtubeApi';
import SearchForm from '@/components/SearchForm';
import VideoCard from '@/components/VideoCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Home: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async (keyword: string, apiKey: string) => {
    setIsLoading(true);
    setError(null);
    setVideos([]);

    try {
      const youtubeApi = new YouTubeAPI(apiKey);
      const searchResults = await youtubeApi.searchVideos(keyword);
      
      setVideos(searchResults);
      
      if (searchResults.length === 0) {
        toast({
          title: "No videos found",
          description: "No videos were found for your search criteria in the last 24 hours.",
          variant: "default"
        });
      } else {
        toast({
          title: "Search completed",
          description: `Found ${searchResults.length} videos for "${keyword}"`,
          variant: "default"
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Search failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="container mx-auto px-4 py-8">
        <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        
        {error && (
          <div className="mt-8 max-w-2xl mx-auto">
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {videos.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Top 10 Most Viewed Videos (Last 24 Hours)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && videos.length === 0 && !error && (
          <div className="mt-12 text-center text-gray-500">
            <p>Enter a search keyword and your API key to find trending videos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
