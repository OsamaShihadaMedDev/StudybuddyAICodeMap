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
      ? "Exam-aligned with high-yield USMLE resources (e.g., First Aid, guidelines). If visual aids are included, suggested open-source visual references (e.g., Wikimedia Commons, radiology databases) may be used."
      : "Based on standard medical references and clinical guidelines. If visual aids are included, suggested open-source visual references (e.g., Wikimedia Commons, radiology databases) may be used.";

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
- Do NOT use markdown symbols (no #, ##, ###, *, -, or bullet symbols).
- Use plain uppercase section titles on their own line.
- Use numbered lists (1. 2. 3.) for all list items.
- Separate sections with a blank line.
- For the SUMMARY section, bold key terms by wrapping them in double asterisks like **term** (this is the ONLY exception to the no-markdown rule).

OUTPUT FORMAT (follow exactly):

SUMMARY

Write a micro-structured summary in 120-160 words max. Use labeled segments:

Definition: One-line definition of the condition/topic. Bold the disease name.
Mechanism: Core pathophysiology in 1-2 sentences. Bold key mechanisms.
Key Associations: 3-5 short bullet-style associations or etiologies. Bold buzzwords only.

Rules:
1. Keep total length the SAME or shorter than 160 words
2. Use bullet-style phrasing, NOT long paragraphs
3. Bold ONLY the highest-yield terms (diseases, mechanisms, buzzwords) using **term**
4. Do NOT repeat anything that appears in later sections


CLINICAL APPROACH

Group into clinical reasoning flow using arrows and grouping:

Diagnosis:
1. Classic presentation → key finding
2. Confirmatory test → expected result

Workup:
1. First-line investigation → what it shows
2. Additional tests if needed

Management:
1. First-line treatment → drug/dose if relevant
2. If unstable → immediate action
3. If refractory → next step

Complications:
1. Most common complication
2. Most dangerous complication

Rules:
1. Use arrows (→) to show logical flow
2. Keep each step to ONE line
3. No explanations unless essential
4. 4-6 total steps MAX across all groups
5. Preserve Step 2-style reasoning


KEY POINTS

1. First key point (exam trigger format: "If X → think Y" or classic association)
2. Second key point
3. Continue (aim for 6-8 points MAX)

Rules:
1. Each point = 1-line high-yield association ONLY
2. No explanations
3. Focus on classic presentations, buzzwords, associations, "If X → think Y" patterns
4. Do NOT restate summary or clinical approach content
5. Keep bullets short and scannable


EXAM TRAPS

1. First trap (common confusion or pitfall)
2. Second trap
3. Continue (3-6 points MAX)

Rules:
1. Each bullet highlights a common exam confusion or diagnostic pitfall
2. Focus on: similar conditions often confused, diagnostic traps, Step 2 trick patterns
3. Keep each line short, no long explanations
4. High-yield only


VISUAL AIDS

This section MUST be included if the topic involves ANY of the following:
1. Histology or pathology changes (time-based or structural)
2. Radiologic findings (X-ray, CT, MRI)
3. ECG patterns
4. Named visual signs (e.g., "spike and dome", "ground-glass")
5. Morphological progression (e.g., stages of disease)
6. Classic exam images frequently tested

If NONE of the above apply, skip this section entirely.

For each visual (1-3 max), use this exact format:

[Title of visual]
What it shows (very short)
Why it matters (exam-focused, 1 line)
Search: "optimized search phrase"

Example:
Coagulative necrosis (early MI histology)
Eosinophilic myocytes with loss of nuclei
Key early histologic change (4-24h)
Search: "coagulative necrosis myocardial infarction histology"

Rules:
1. Do NOT generate or fabricate image URLs
2. Do NOT claim specific sources
3. Keep total section very concise (max 3 items)
4. Prioritize high-yield visuals only
5. Use timeline-based ordering when showing disease progression


FLASHCARDS

Generate exactly 4-5 flashcards. MUST include:
- At least 1 "next best step" question
- At least 1 mechanism-based question  
- At least 1 diagnosis-style question
Prefer clinical vignette format when possible.

Each question MUST start with a tag in brackets indicating the cognitive task:
[Diagnosis] / [Mechanism] / [Next Step] / [Complication] / [Association]

Q: [Next Step] A patient presents with...
A: Short, precise answer in 1-2 sentences max

Q: [Mechanism] What is the underlying...
A: Answer

Q: [Diagnosis] A 45-year-old presents with...
A: Answer

Keep Q/A concise. Do not repeat Key Points verbatim.


REFERENCE NOTE

${referenceNote}

GLOBAL CONSTRAINTS:
- Do NOT add any introduction, closing remarks, or meta-commentary.
- Start directly with SUMMARY.
- Do NOT increase verbosity unnecessarily.
- Avoid redundancy across sections.
- Maintain concise, high-yield output throughout.
- Do NOT add sections beyond those specified above.`;

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
