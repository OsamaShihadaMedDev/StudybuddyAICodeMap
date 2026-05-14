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
    const { notes, difficulty, focus, length, examMode, quizMode, cardsOnly, cardCount, focusCard, explainMode } = await req.json();

    if (!notes || typeof notes !== "string" || !notes.trim()) {
      return new Response(
        JSON.stringify({ error: "Notes are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mode = examMode || "General";
    const diff = difficulty || "Basic";
    const foc = focus || "Quick Revision";
    const len = length || "Concise";

    const referenceNote = mode.startsWith("USMLE")
      ? "Exam-aligned with high-yield USMLE resources (e.g., First Aid, guidelines)."
      : "Based on standard medical references and clinical guidelines.";

    let systemPrompt: string;

    if (explainMode) {
      systemPrompt = `You are a senior medical educator giving a brief mid-study clarification.

The student is reviewing flashcards and hit a concept they don't fully understand. Give them a short, focused refresher — NOT a full study sheet.

OUTPUT FORMAT (follow exactly, no other sections):

EXPLANATION

A 3-5 sentence plain-language explanation of the concept. Lead with the core mechanism or idea. Avoid jargon unless necessary. No bullet points, no headers within the paragraph.

KEY INSIGHT

One single sentence — the one thing the student must remember to never miss this concept again.

STRICT RULES:
- Total output must be under 150 words.
- No flashcards, no clinical approach, no memory hooks, no exam traps, no reference note.
- No markdown symbols (no #, *, -, **).
- Use plain uppercase section headers exactly as shown above.
- Start directly with EXPLANATION. No preamble.`;
    } else if (cardsOnly) {
      const count = Math.min(Math.max(parseInt(cardCount) || 12, 5), 20);
      systemPrompt = `You are an expert medical educator generating USMLE-style active recall questions.

Mode: ${mode}
Difficulty Level: ${diff}

INPUT HANDLING:
The user input is a medical topic. Normalize it, then generate questions.

Generate exactly ${count} flashcards. Mix of:
- Clinical vignette questions (patient scenario → diagnosis or next step)
- Concept recall (mechanism, association, complication)

STRICT FORMATTING (CRITICAL — violations break the parser):
- No markdown symbols (no #, *, -, **, _).
- Each question MUST start with a tag in brackets: [Diagnosis] / [Mechanism] / [Next Step] / [Complication] / [Association]
- Every question MUST end with a question mark.
- Every answer MUST be 1-2 sentences. NEVER more than 2 sentences.
- NEVER write "Q:" or "A:" inside a question or answer body — those characters mark new card boundaries only.
- Each card MUST be separated by exactly one blank line.
- Do NOT number the cards.
- Do NOT include explanations, headers, or commentary between cards.

OUTPUT FORMAT:

FLASHCARDS

🩸

Q: [Mechanism] What is...
A: Short answer in 1-2 sentences max.

(continue for ${count} total)

EMOJI RULE: After "FLASHCARDS" and before the first Q:, output exactly ONE emoji on its own line representing the topic visually (e.g., 🫀 for cardiac topics, 🩸 for hematology, 🧠 for neuro, 🫁 for pulmonary, 🦴 for ortho, 🩺 for general clinical, 💊 for pharmacology, 🧬 for genetics, 👁️ for ophthalmology, 🦷 for dental, 🤰 for OB/GYN, 👶 for pediatrics, 🧫 for micro, ⚗️ for biochem, 🩹 for trauma/surgery, 🛡️ for immunology). Use only one emoji. Do not surround it with text.

Start directly with FLASHCARDS. No preamble or commentary.`;
    } else if (quizMode) {
      systemPrompt = `You are an expert medical educator generating USMLE-style active recall questions.

Mode: ${mode}
Difficulty Level: ${diff}

INPUT HANDLING:
The user input may be raw notes, a study request, or a direct topic name.
Normalize the input into a clear medical topic, then generate questions.

Generate exactly 5-7 questions. Mix of:
- Clinical vignette questions (patient scenario → diagnosis or next step)
- Concept recall questions (mechanism, association, or complication)

STRICT FORMATTING (CRITICAL — violations break the parser):
- No markdown symbols (no #, *, -, **, _).
- Each question MUST start with a tag in brackets: [Diagnosis] / [Mechanism] / [Next Step] / [Complication] / [Association]
- Every question MUST end with a question mark.
- Every answer MUST be 1-2 sentences. NEVER more than 2 sentences.
- NEVER write "Q:" or "A:" inside a question or answer body — those characters mark new card boundaries only.
- Each card MUST be separated by exactly one blank line.
- Do NOT number the cards.
- Do NOT include explanations, headers, or commentary between cards.

OUTPUT FORMAT (follow exactly):

FLASHCARDS

🩸

Q: [Diagnosis] A clinical vignette question...
A: Short, precise answer in 1-2 sentences max

Q: [Next Step] Another question...
A: Answer

Q: [Mechanism] What is the underlying...
A: Answer

(Continue for 5-7 total questions)

EMOJI RULE: After "FLASHCARDS" and before the first Q:, output exactly ONE emoji on its own line representing the topic visually (e.g., 🫀 for cardiac topics, 🩸 for hematology, 🧠 for neuro, 🫁 for pulmonary, 🦴 for ortho, 🩺 for general clinical, 💊 for pharmacology, 🧬 for genetics, 👁️ for ophthalmology, 🦷 for dental, 🤰 for OB/GYN, 👶 for pediatrics, 🧫 for micro, ⚗️ for biochem, 🩹 for trauma/surgery, 🛡️ for immunology). Use only one emoji. Do not surround it with text.

GLOBAL CONSTRAINTS:
- Generate only questions for active recall. Do not include explanations unless necessary.
- Do NOT add any introduction, closing remarks, or meta-commentary.
- Start directly with FLASHCARDS.
- Keep Q/A concise.`;
    } else {
      systemPrompt = `You are an expert medical educator creating polished, exam-ready study material.

Mode: ${mode}
Difficulty Level: ${diff}
Study Focus: ${foc}
Output Length: ${len}

INPUT HANDLING:
The user input may be one of three types:
1. Raw medical notes — extract the core topic(s) and generate study material based on them.
2. A study request (e.g., "I want to study myocardial infarction") — interpret as a request to generate high-yield study material on that topic.
3. A direct topic name (e.g., "Nephrotic syndrome") — treat as the topic directly.

Before generating output, internally normalize the input into a clear medical topic or concept, then proceed with the structured output below.

MODE RULES:
- USMLE Step 1: Focus on mechanisms, pathophysiology, biochemical pathways, and classic associations.
- USMLE Step 2: Focus on diagnosis, clinical management, next best steps, and patient scenarios.
- General: Provide a balanced clinical overview.

FOCUS RULES:
- Quick Revision: Concise high-yield facts only.
- Deep Understanding: Brief but clear explanations of mechanisms.
- Clinical Reasoning: Application-based scenarios and clinical decision-making.

DIFFICULTY RULES:
- Basic: simple language, minimal jargon, define key terms, suitable for early med students.
- Intermediate: assume Year 3-4 medical student level, standard terminology.
- Advanced: clinician-level depth, full technical terminology, include nuanced distinctions.

LENGTH RULES:
- Concise: minimum viable information, ultra-scannable, shortest possible output.
- Moderate: balanced detail, cover all sections adequately.
- Detailed: expand every section fully, include edge cases and nuances.

STRICT FORMATTING RULES:
- Do NOT use markdown symbols (no #, ##, ###, *, -, or bullet symbols).
- Use plain uppercase section titles on their own line.
- Use numbered lists (1. 2. 3.) for all list items.
- Separate sections with a blank line.
- For the SUMMARY section, bold key terms by wrapping them in double asterisks like **term** (this is the ONLY exception to the no-markdown rule).

OUTPUT FORMAT (follow exactly):

SUMMARY

Adaptive-length micro-structured summary. Scale detail to topic complexity, but ALWAYS stay concise and scannable.

Length logic:
- Small/narrow topic → very concise (few bullets or short blocks)
- Medium topic → moderate detail with clear structure
- Large/complex topic → still concise, prioritize ONLY high-yield concepts, compress aggressively

Mandatory labeled segments:
Definition: One-line definition of the condition/topic. Bold the disease name.
Mechanism / Pathophysiology: Core mechanism in 1-2 sentences. Bold key mechanisms.
Key Associations / Features: Short bullet-style associations or etiologies. Bold buzzwords only.

Optional segments (include ONLY if directly relevant):
Diagnosis: Key diagnostic finding or test.
Management: First-line treatment or critical intervention.

Rules:
1. Each line = one idea. Use bullet-style phrasing, NOT long paragraphs.
2. Bold ONLY the highest-yield terms (diseases, mechanisms, buzzwords) using **term**
3. Do NOT repeat anything that appears in later sections
4. Do NOT increase verbosity for large topics — compress and prioritize instead
5. For large topics: INCLUDE only most tested concepts, classic associations, exam-relevant mechanisms. EXCLUDE rare details and excessive explanations.
6. The summary must always feel concise, scannable, and non-redundant


MEMORY HOOKS

2-4 ultra-concise, sticky learning bullets. These are First Aid-style one-liner associations and "if you remember one thing" insights.

Rules:
1. Each bullet = one association or mechanism shortcut
2. Use arrow format: "X → Y → Z"
3. Focus on classic board-style mnemonics, associations, and mechanisms
4. Do NOT repeat content from Key Points or Summary
5. Keep extremely concise — each line should be instantly memorable

Example style:
"Nephrotic syndrome → protein loss → hypercoagulability"
"MCD = kids + steroid responsive"


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




FLASHCARDS

The FLASHCARDS section MUST begin with one emoji on its own line representing the topic (same rule as above), then a blank line, then the cards.

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
    }

    const userContent = focusCard && !quizMode && !cardsOnly
      ? `Focus specifically on this concept: ${focusCard}\n\nTopic: ${notes}`
      : notes;

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const model = (explainMode || cardsOnly || quizMode)
  ? "google/gemini-2.5-flash-lite"
  : "google/gemini-2.5-flash";

    console.log("[MODEL_USED]:", model);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://studybuddy.app",
          "X-Title": "StudyBuddy",
        },
        body: JSON.stringify({
          model,
          stream: true,
          temperature: 0.7,
          max_tokens: 8192,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 400) {
        const t = await response.text();
        console.error("Gemini 400 error:", t);
        return new Response(
          JSON.stringify({ error: "Bad request to AI service" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Invalid or missing API key" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const event of events) {
          const trimmed = event.trim();
          if (!trimmed) continue;

          const dataLine = trimmed
            .split("\n")
            .find((line) => line.startsWith("data:"));
          if (!dataLine) {
            continue;
          }

          const payload = dataLine.slice(5).trim();
          if (!payload || payload === "[DONE]" || payload.includes("[DONE]")) continue;

          try {
            const parsed = JSON.parse(payload);
            const text = parsed?.choices?.[0]?.delta?.content;
            if (typeof text !== "string" || text.length === 0) continue;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(parsed)}\n\n`)
            );
          } catch {
            // skip unparseable chunks silently
          }
        }
      },
      flush(controller) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      },
    });

    return new Response(response.body!.pipeThrough(transform), {
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
