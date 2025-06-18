import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1) CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 2) Parse request
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

    // 3) List available tracks via timedtext
    const listRes = await fetch(
      `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`
    );
    if (!listRes.ok) {
      throw new Error(`Timedtext list failed: ${listRes.status}`);
    }
    const listXml = await listRes.text();

    // 4) Regex-extract all <track … /> tags
    const trackMatches = Array.from(
      listXml.matchAll(/<track\s+([^>]+?)\/?>/g)
    );
    if (trackMatches.length === 0) {
      // No caption tracks
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Build a small array of { lang_code }
    const tracks = trackMatches
      .map((m) => {
        const attrs = m[1];
        const langMatch = attrs.match(/lang_code="([^"]+)"/);
        return langMatch ? langMatch[1] : null;
      })
      .filter((lang): lang is string => !!lang);

    if (tracks.length === 0) {
      // No parsable lang_code
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Prefer English, else take the first
    const lang = tracks.includes("en") ? "en" : tracks[0];

    // 7) Fetch the JSON3 transcript
    const txRes = await fetch(
      `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`
    );
    if (!txRes.ok) {
      throw new Error(`Timedtext fetch failed: ${txRes.status}`);
    }
    const txJson = await txRes.json();

    // 8) Normalize into [{ text, start }]
    const segments = (txJson.events || [])
      .filter((e: any) => Array.isArray(e.segs))
      .map((e: any) => ({
        text: e.segs.map((s: any) => (s.utf8 ?? s.text) || "").join(""),
        start: Math.floor(e.tStartMs / 1000),
      }))
      .filter((seg: any) => seg.text);

    // 9) Return JSON
    return new Response(JSON.stringify(segments), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error in fetch-transcript:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});