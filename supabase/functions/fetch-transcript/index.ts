import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// pull in your OAuth secrets from Supabase ENV
const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REFRESH_TOKEN = Deno.env.get("GOOGLE_REFRESH_TOKEN");

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  throw new Error(
    "Missing one of GOOGLE_CLIENT_ID / SECRET / REFRESH_TOKEN in environment"
  );
}

async function getAccessToken(): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type:    "refresh_token",
    }),
  });
  const j = await resp.json();
  if (!j.access_token) throw new Error("Could not refresh Google access token");
  return j.access_token;
}

serve(async (req) => {
  // handle CORS preflight
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

    // get a fresh Google OAuth token
    const token = await getAccessToken();

    // 1) list captions to find the ID
    const listRes = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
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
    const captionId = listJson.items[0].id;

    // 2) download as SRT
    const dlRes = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!dlRes.ok) {
      throw new Error(`Caption download failed: ${dlRes.statusText}`);
    }
    const srt = await dlRes.text();

    // 3) parse SRT blocks into JSON
    const segments: Array<{ text: string; start: number }> = [];
    srt.split(/\r?\n\r?\n/).forEach((block) => {
      const lines = block.split(/\r?\n/);
      if (lines.length >= 3) {
        // parse “00:00:05,000 --> 00:00:10,000”
        const [time] = lines[1].split(" --> ");
        const [h, m, s] = time
          .replace(",", ":")
          .split(/[:,]/)
          .map(Number);
        const start = h * 3600 + m * 60 + s;
        const text = lines.slice(2).join(" ").trim();
        if (text) segments.push({ text, start });
      }
    });

    return new Response(JSON.stringify(segments), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in fetch-transcript:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});