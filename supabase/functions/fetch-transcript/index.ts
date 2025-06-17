
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { YoutubeTranscript } from "https://esm.sh/youtube-transcript@1.0.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get("videoId");

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Video ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log('Fetching transcript for video:', videoId);

    // Fetch transcript using youtube-transcript package via ESM
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Transform the data to match our TranscriptItem interface
    const formattedTranscript = transcript.map((item: any) => ({
      text: item.text,
      start: Math.floor(item.offset / 1000), // Convert milliseconds to seconds
      duration: Math.floor(item.duration / 1000) // Convert milliseconds to seconds
    }));

    console.log('Successfully fetched transcript with', formattedTranscript.length, 'items');

    return new Response(
      JSON.stringify(formattedTranscript),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Error fetching transcript:', error);
    
    // Handle specific error cases
    let errorMessage = 'Failed to fetch transcript';
    let statusCode = 500;

    if (error.message?.includes('No transcript found')) {
      errorMessage = 'No transcript available for this video';
      statusCode = 404;
    } else if (error.message?.includes('Video unavailable')) {
      errorMessage = 'Video is unavailable or private';
      statusCode = 404;
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
