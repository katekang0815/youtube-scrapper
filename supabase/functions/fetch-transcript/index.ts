
// src/functions/fetch-transcript/index.ts

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
    console.log(`🎯 Processing videoId: ${videoId}`);
    
    if (!videoId) {
      console.log("❌ No videoId provided");
      return new Response(
        JSON.stringify({ error: "Missing videoId in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3) List transcript tracks
    const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    console.log(`📋 Fetching transcript list from: ${listUrl}`);
    
    const listRes = await fetch(listUrl);
    console.log(`📋 List response status: ${listRes.status}`);
    
    if (!listRes.ok) {
      console.log(`❌ Timedtext list failed: ${listRes.status}`);
      throw new Error(`Timedtext list failed: ${listRes.status}`);
    }
    
    const listXml = await listRes.text();
    console.log(`📋 List XML response length: ${listXml.length}`);
    console.log(`📋 List XML content: ${listXml.substring(0, 500)}...`);

    // 4) Extract every <track …> tag
    const trackMatches = Array.from(
      listXml.matchAll(/<track\b[^>]*>/g)
    );
    console.log(`🎵 Found ${trackMatches.length} track matches`);
    
    if (trackMatches.length === 0) {
      console.log("❌ No tracks found - returning empty array");
      // No tracks → empty transcript
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Pull out lang codes (lang_code or lang)
    const tracks = trackMatches
      .map((m, index) => {
        const tag = m[0];
        console.log(`🎵 Track ${index}: ${tag}`);
        
        // prefer lang_code="…"
        const codeMatch = tag.match(/lang_code="([^"]+)"/);
        if (codeMatch) {
          console.log(`🎵 Track ${index} lang_code: ${codeMatch[1]}`);
          return codeMatch[1];
        }
        // fallback to lang="…"
        const langMatch = tag.match(/lang="([^"]+)"/);
        if (langMatch) {
          console.log(`🎵 Track ${index} lang: ${langMatch[1]}`);
          return langMatch[1];
        }
        console.log(`🎵 Track ${index} no lang found`);
        return null;
      })
      .filter((l): l is string => !!l);

    console.log(`🌍 Available languages: ${tracks.join(', ')}`);

    if (tracks.length === 0) {
      console.log("❌ No valid language tracks found");
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6) Choose English (en, en-US, en-GB…) if present, otherwise first track
    const lang =
      tracks.find((l) => l === "en" || l.startsWith("en")) || tracks[0];
    console.log(`🎯 Selected language: ${lang}`);

    // 7) Fetch the transcript in JSON3 format
    const txUrl = `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(
      lang
    )}&v=${videoId}&fmt=json3`;
    console.log(`📝 Fetching transcript from: ${txUrl}`);
    
    const txRes = await fetch(txUrl);
    console.log(`📝 Transcript response status: ${txRes.status}`);
    
    if (!txRes.ok) {
      console.log(`❌ Timedtext fetch failed: ${txRes.status}`);
      throw new Error(`Timedtext fetch failed: ${txRes.status}`);
    }
    
    const txJson = await txRes.json();
    console.log(`📝 Transcript JSON keys: ${Object.keys(txJson)}`);
    console.log(`📝 Events length: ${txJson.events?.length || 0}`);

    // 8) Normalize into [{ text, start }]
    const segments = (txJson.events || [])
      .filter((e: any) => {
        const hasSegs = Array.isArray(e.segs);
        if (!hasSegs) console.log(`⚠️ Event without segs: ${JSON.stringify(e)}`);
        return hasSegs;
      })
      .map((e: any) => ({
        text: e.segs.map((s: any) => s.utf8 || s.text || "").join(""),
        start: Math.floor(e.tStartMs / 1000),
      }))
      .filter((seg: any) => {
        const hasText = !!seg.text;
        if (!hasText) console.log(`⚠️ Segment without text: ${JSON.stringify(seg)}`);
        return hasText;
      });

    console.log(`✅ Final segments count: ${segments.length}`);
    if (segments.length > 0) {
      console.log(`📝 First segment: ${JSON.stringify(segments[0])}`);
      console.log(`📝 Last segment: ${JSON.stringify(segments[segments.length - 1])}`);
    }

    // 9) Return it
    return new Response(JSON.stringify(segments), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("❌ Error in fetch-transcript:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
