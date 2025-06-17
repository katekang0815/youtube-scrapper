import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = Deno.env();
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
async function getAccessToken() {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });
  const json = await resp.json();
  if (!json.access_token) throw new Error("OAuth token failed");
  return json.access_token;
}
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  try {
    const { videoId } = await req.json();
    if (!videoId) throw new Error("Missing videoId");
    const token = await getAccessToken();
    // 1) List captions to get the caption ID
    const listRes = await fetch(`https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const listJson = await listRes.json();
    if (!listJson.items?.length) throw new Error("No captions available");
    const captionId = listJson.items[0].id;
    // 2) Download that caption track in SRT format
    const downloadRes = await fetch(`https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=srt`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const srt = await downloadRes.text();
    // 3) Parse SRT into segments
    const segments = [];
    srt.split(/\r?\n\r?\n/).forEach((block)=>{
      const lines = block.split(/\r?\n/);
      if (lines.length >= 3) {
        // lines[1] is the timing
        const [time] = lines[1].split(" --> ");
        const [h, m, s] = time.split(/[:,]/).map(Number);
        const start = h * 3600 + m * 60 + s;
        const text = lines.slice(2).join(" ").trim();
        if (text) segments.push({
          text,
          start
        });
      }
    });
    return new Response(JSON.stringify(segments), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({
      error: e.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
