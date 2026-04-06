import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, difficulty, focus, length } = await req.json();

    if (!notes || typeof notes !== "string" || !notes.trim()) {
      return new Response(
        JSON.stringify({ error: "Notes are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert medical educator creating polished, exam-ready study material.

Difficulty Level: ${difficulty || "Basic"}
Study Focus: ${focus || "Quick Revision"}
Output Length: ${length || "Concise"}

STRICT FORMATTING RULES:
- Do NOT use markdown symbols (no #, ##, ###, **, *, -, or bullet symbols).
- Use plain uppercase section titles on their own line.
- Use numbered lists (1. 2. 3.) for key points.
- Separate sections with a blank line.

OUTPUT FORMAT (follow exactly):

SUMMARY

Write a concise, structured summary in 3-5 short paragraphs. No filler words. Focus on mechanisms, clinical relevance, and high-yield facts.


KEY POINTS

1. First key point (short, high-yield, one sentence)
2. Second key point
3. Continue as needed (aim for 5-10 points)

Each point must be unique and non-repetitive. Do not restate what is already in the summary.


VISUAL EXPLANATIONS

List 3-6 key visual topics from the notes that would benefit from images, diagrams, or anatomical illustrations.
Format as a numbered list. Each item should be a short, searchable medical term or concept.
Example:
1. Thyroid gland anatomy
2. Graves disease exophthalmos
3. Myxedema clinical appearance

Only include this section if the topic involves anatomy, pathology, radiology, dermatology, histology, or other visual subjects. If the topic is purely pharmacological or theoretical, skip this section entirely.


FLASHCARDS

Q: [Clear, specific question]
A: [Short, precise answer in 1-2 sentences max]

Q: [Next question]
A: [Answer]

Rules for flashcards:
- Generate 5-10 flashcards minimum.
- Keep answers short (1-2 sentences).
- Include at least 2 clinical reasoning questions (e.g. "A patient presents with X. What is the most likely diagnosis?").
- Do not repeat information already covered in Key Points verbatim.
- Focus on exam-relevant, high-yield content.

Do NOT add any introduction, closing remarks, or meta-commentary. Start directly with SUMMARY.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: notes },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("medical-notes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
