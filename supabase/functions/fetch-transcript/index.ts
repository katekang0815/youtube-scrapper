import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Load OAuth credentials from environment
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  throw new Error(
    "Missing one of GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in environment"
  );
}

/**
 * Exchange the refresh token for a short-lived access token
 */
async function getAccessToken(): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const j = await resp.json();
  console.log("⚙️ token-refresh response:", j);

  if (!j.access_token) {
    throw new Error(
      `Could not refresh token: ${j.error || j.error_description || JSON.stringify(j)}`
    );
  }

  return j.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Missing videoId in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 1) Refresh Google access token
    const token = await getAccessToken();

    // 2) List available caption tracks
    const listRes = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!listRes.ok) {
      throw new Error(`Caption list request failed: ${listRes.statusText}`);
    }

    const listJson = await listRes.json();
    if (!listJson.items?.length) {
      return new Response(
        JSON.stringify({ error: "No captions available for this video" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use the first available track
    const captionId = listJson.items[0].id;

    // 3) Download caption as SRT
    const downloadRes = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!downloadRes.ok) {
      throw new Error(`Caption download failed: ${downloadRes.statusText}`);
    }

    const srt = await downloadRes.text();

    // 4) Parse SRT into segments
    const segments: Array<{ text: string; start: number }> = [];
    srt.split(/\r?\n\r?\n/).forEach((block) => {
      const lines = block.split(/\r?\n/);
      if (lines.length >= 3) {
        // Parse timing line: "HH:MM:SS,mmm --> HH:MM:SS,mmm"
        const [time] = lines[1].split(" --> ");
        const [h, m, s] = time.replace(",", ":").split(/[:,]/).map(Number);
        const start = h * 3600 + m * 60 + s;
        const text = lines.slice(2).join(" ").trim();
        if (text) {
          segments.push({ text, start });
        }
      }
    });

    return new Response(JSON.stringify(segments), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Error in fetch-transcript:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
