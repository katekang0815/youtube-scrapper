
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { videoId } = await req.json();

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

    // First, get the video page to extract transcript data
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoPageResponse = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!videoPageResponse.ok) {
      throw new Error('Failed to fetch video page');
    }

    const videoPageHtml = await videoPageResponse.text();
    
    // Extract caption tracks from the video page
    const captionTrackRegex = /"captionTracks":\s*(\[.*?\])/;
    const match = videoPageHtml.match(captionTrackRegex);
    
    if (!match) {
      console.log('No caption tracks found in video page');
      return new Response(
        JSON.stringify([]),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const captionTracks = JSON.parse(match[1]);
    console.log('Found caption tracks:', captionTracks.length);
    
    if (captionTracks.length === 0) {
      return new Response(
        JSON.stringify([]),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the first available caption track (usually English or auto-generated)
    const captionTrack = captionTracks.find((track: any) => 
      track.languageCode === 'en' || track.languageCode.startsWith('en')
    ) || captionTracks[0];

    if (!captionTrack || !captionTrack.baseUrl) {
      throw new Error('No valid caption track found');
    }

    console.log('Using caption track:', captionTrack.languageCode);

    // Fetch the transcript XML
    const transcriptResponse = await fetch(captionTrack.baseUrl);
    
    if (!transcriptResponse.ok) {
      throw new Error('Failed to fetch transcript data');
    }

    const transcriptXml = await transcriptResponse.text();
    
    // Parse the XML to extract transcript items
    const textRegex = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
    const transcriptItems = [];
    let xmlMatch;
    
    while ((xmlMatch = textRegex.exec(transcriptXml)) !== null) {
      const start = Math.floor(parseFloat(xmlMatch[1]));
      const duration = Math.floor(parseFloat(xmlMatch[2]));
      const text = xmlMatch[3]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      
      if (text) {
        transcriptItems.push({
          text,
          start,
          duration
        });
      }
    }

    console.log('Successfully parsed transcript with', transcriptItems.length, 'items');

    return new Response(
      JSON.stringify(transcriptItems),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Error fetching transcript:', error);
    
    // Handle specific error cases
    let errorMessage = 'Failed to fetch transcript';
    let statusCode = 500;

    if (error.message?.includes('No transcript found') || error.message?.includes('No valid caption track')) {
      errorMessage = 'No transcript available for this video';
      statusCode = 404;
    } else if (error.message?.includes('Video unavailable') || error.message?.includes('Failed to fetch video page')) {
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
