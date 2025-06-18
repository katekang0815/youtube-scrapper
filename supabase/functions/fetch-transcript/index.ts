
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1) Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 2) Parse request body
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

    // 3) List available caption tracks via timedtext
    const listRes = await fetch(
      `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`
    );
    if (!listRes.ok) {
      throw new Error(`Timedtext list failed: ${listRes.status}`);
    }
    const listXml = await listRes.text();
    const xmlDoc = new DOMParser().parseFromString(listXml, "text/xml");
    const trackElems = Array.from(xmlDoc.getElementsByTagName("track"));

    if (trackElems.length === 0) {
      // no captions available
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Pick an English track if possible
    const chosenTrack =
      trackElems.find((t) => t.getAttribute("lang_code") === "en") ||
      trackElems[0];
    const langCode = chosenTrack.getAttribute("lang_code");

    // 5) Fetch the transcript in JSON3 format
    const txRes = await fetch(
      `https://www.youtube.com/api/timedtext?lang=${langCode}&v=${videoId}&fmt=json3`
    );
    if (!txRes.ok) {
      throw new Error(`Timedtext fetch failed: ${txRes.status}`);
    }
    const txJson = await txRes.json();

    // 6) Normalize into { text, start } segments
    const segments = (txJson.events || [])
      .filter((e: any) => Array.isArray(e.segs))
      .map((e: any) => ({
        text: e.segs.map((s: any) => (s.utf8 ?? s.text) || "").join(""),
        start: Math.floor(e.tStartMs / 1000),
      }))
      .filter((seg: any) => seg.text);

    // 7) Return JSON response
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