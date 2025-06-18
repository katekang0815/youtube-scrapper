
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Key, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SearchFormProps {
  onSearch: (keyword: string, apiKey: string) => void;
  isLoading: boolean;
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [keyword, setKeyword] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim() && apiKey.trim()) {
      onSearch(keyword.trim(), apiKey.trim());
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
          YouTube Trend Scrapper
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Find the top 10 most viewed videos from the last 24 hours
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="keyword" className="text-sm font-medium text-gray-700">
              Search Keyword
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="keyword"
                type="text"
                placeholder="Enter search keyword..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-10 h-12 border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Google Cloud API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your YouTube Data API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-12 border-gray-300 focus:border-red-500 focus:ring-red-500"
              required
            />
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <span>Need an API key?</span>
                  <a 
                    href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline"
                  >
                    Get it here <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium transition-all duration-200"
            disabled={isLoading || !keyword.trim() || !apiKey.trim()}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Searching...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find Videos
              </div>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SearchForm;
