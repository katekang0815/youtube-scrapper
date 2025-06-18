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
    // 2) Parse body
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

    // 3) List transcript tracks
    const listRes = await fetch(
      `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`
    );
    if (!listRes.ok) {
      throw new Error(`Timedtext list failed: ${listRes.status}`);
    }
    const listXml = await listRes.text();

    // 4) Extract every <track …> tag
    const trackMatches = Array.from(
      listXml.matchAll(/<track\b[^>]*>/g)
    );
    if (trackMatches.length === 0) {
      // No tracks → empty transcript
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Pull out lang codes (lang_code or lang)
    const tracks = trackMatches
      .map((m) => {
        const tag = m[0];
        // prefer lang_code="…"
        const codeMatch = tag.match(/lang_code="([^"]+)"/);
        if (codeMatch) return codeMatch[1];
        // fallback to lang="…"
        const langMatch = tag.match(/lang="([^"]+)"/);
        return langMatch ? langMatch[1] : null;
      })
      .filter((l): l is string => !!l);

    if (tracks.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Choose English (en, en-US, en-GB…) if present, otherwise first track
    const lang =
      tracks.find((l) => l === "en" || l.startsWith("en")) || tracks[0];

    // 7) Fetch the transcript in JSON3 format
    const txRes = await fetch(
      `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(
        lang
      )}&v=${videoId}&fmt=json3`
    );
    if (!txRes.ok) {
      throw new Error(`Timedtext fetch failed: ${txRes.status}`);
    }
    const txJson = await txRes.json();

    // 8) Normalize into [{ text, start }]
    const segments = (txJson.events || [])
      .filter((e: any) => Array.isArray(e.segs))
      .map((e: any) => ({
        text: e.segs.map((s: any) => s.utf8 || s.text || "").join(""),
        start: Math.floor(e.tStartMs / 1000),
      }))
      .filter((seg: any) => seg.text);

    // 9) Return it
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