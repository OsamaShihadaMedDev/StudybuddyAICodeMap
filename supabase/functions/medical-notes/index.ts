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
    const { notes, difficulty, focus, length, examMode } = await req.json();

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

    const mode = examMode || "General";
    const diff = difficulty || "Basic";
    const foc = focus || "Quick Revision";
    const len = length || "Concise";

    const referenceNote = mode.startsWith("USMLE")
      ? "Exam-aligned with high-yield USMLE resources (e.g., First Aid, guidelines)."
      : "Based on standard medical references and clinical guidelines.";

    const systemPrompt = `You are an expert medical educator creating polished, exam-ready study material.

Mode: ${mode}
Difficulty Level: ${diff}
Study Focus: ${foc}
Output Length: ${len}

MODE RULES:
- USMLE Step 1: Focus on mechanisms, pathophysiology, biochemical pathways, and classic associations.
- USMLE Step 2: Focus on diagnosis, clinical management, next best steps, and patient scenarios.
- General: Provide a balanced clinical overview.

FOCUS RULES:
- Quick Revision: Concise high-yield facts only.
- Deep Understanding: Brief but clear explanations of mechanisms.
- Clinical Reasoning: Application-based scenarios and clinical decision-making.

DIFFICULTY controls depth of detail. LENGTH controls amount of detail.

STRICT FORMATTING RULES:
- Do NOT use markdown symbols (no #, ##, ###, **, *, -, or bullet symbols).
- Use plain uppercase section titles on their own line.
- Use numbered lists (1. 2. 3.) for all list items.
- Separate sections with a blank line.
- For the SUMMARY section, bold key terms by wrapping them in double asterisks like **term** (this is the ONLY exception to the no-markdown rule).

OUTPUT FORMAT (follow exactly):

SUMMARY

Write a concise, structured summary in 120-160 words max. Use short paragraphs. Bold key terms only (diseases, mechanisms, buzzwords) using **term**. Avoid dense textbook-style writing. Focus on high-yield, testable concepts.


CLINICAL APPROACH

4-6 concise numbered bullets MAX. Focus on:
1. Diagnostic approach
2. Next best step in management
3. First-line treatment
4. What to do if patient is unstable (if relevant)
Keep content actionable and exam-focused. Do NOT repeat summary content.


KEY POINTS

1. First key point (short, high-yield, one sentence)
2. Second key point
3. Continue (aim for 6-8 points MAX)

Each point must be unique. Do NOT restate summary or clinical approach content. Prioritize high-yield associations and exam facts. Keep bullets short and scannable.


VISUAL EXPLANATIONS

List 3-6 key visual topics from the notes that would benefit from images, diagrams, or anatomical illustrations.
Format as a numbered list. Each item should be a short, searchable medical term or concept.
Example:
1. Thyroid gland anatomy
2. Graves disease exophthalmos
3. Myxedema clinical appearance

Only include this section if the topic involves anatomy, pathology, radiology, dermatology, histology, or other visual subjects. If the topic is purely pharmacological or theoretical, skip this section entirely.


FLASHCARDS

Generate exactly 4-5 flashcards. MUST include:
- At least 1 "next best step" question
- At least 1 mechanism-based question  
- At least 1 diagnosis-style question
Prefer clinical vignette format when possible.

Q: [Clear, specific question]
A: [Short, precise answer in 1-2 sentences max]

Q: [Next question]
A: [Answer]

Keep Q/A concise. Do not repeat Key Points verbatim.


REFERENCE NOTE

${referenceNote}

GLOBAL CONSTRAINTS:
- Do NOT add any introduction, closing remarks, or meta-commentary.
- Start directly with SUMMARY.
- Do NOT increase verbosity unnecessarily.
- Avoid redundancy across sections.
- Maintain concise, high-yield output throughout.`;

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
