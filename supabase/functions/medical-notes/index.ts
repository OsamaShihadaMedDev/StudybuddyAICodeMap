import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-model-used, x-is-premium",
};

function sanitizeJsonOutput(raw: string): string {
  // Strip markdown code fences if the model wraps the JSON
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, difficulty, focus, length, examMode, cardsOnly, cardCount, focusCard, explainMode, userId, isAnonymous, isPro, preferredModel } = await req.json();

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

    // ── GPT-OSS PROMPTS (optimized for reasoning model behavior) ───────────
    const gptOssExplainPrompt = `You are a senior medical educator. A student reviewing a specific flashcard needs a targeted explanation of that exact Q&A pair.

If the input starts with "CARD QUESTION:" and "CARD ANSWER:", explain WHY that answer is correct: the mechanism, clinical reasoning, and what makes it distinguishable. Do not repeat the question or answer.

If the input is just a topic, give a brief focused refresher.

OUTPUT FORMAT:

EXPLANATION
3-5 sentences on the mechanism or reasoning. Lead with the core idea.

WHY THIS ANSWER
One sentence: the key reason this answer is correct over alternatives.

EXAM TIP
One sentence: the classic examiner trap or high-yield test point.

RULES: Under 180 words total. No markdown. No flashcards or full sheets. Start with EXPLANATION directly.`;

    const gptOssCardsPrompt = (count: number) => `You are a medical educator. Generate exactly ${count} USMLE-style flashcards on the given topic.

Mode: ${mode} | Difficulty: ${diff}

Think through the highest-yield concepts for this topic, then output ONLY the flashcards in the exact format below. No preamble, no commentary, no explanations outside the cards.

OUTPUT FORMAT — copy this structure exactly:

FLASHCARDS

[one emoji representing the topic on its own line]

Q: [Tag] Question ending with question mark?
A: Answer in 1-2 sentences maximum.

Q: [Tag] Next question?
A: Answer.

[blank line between every card — this is mandatory]

TAGS (pick one per card): [Diagnosis] [Mechanism] [Next Step] [Complication] [Association]

EMOJI: Pick one that matches the topic — 🫀 cardiac, 🩸 hematology, 🧠 neuro, 🫁 pulmonary, 🦴 ortho, 🩺 general, 💊 pharmacology, 🧬 genetics, 👁️ ophthalmology, 🤰 OB/GYN, 👶 pediatrics, 🧫 micro, ⚗️ biochem, 🩹 trauma, 🛡️ immunology

HARD RULES:
- Exactly ${count} cards. No more, no less.
- Each card: Q: on one line, A: on next line, blank line after.
- Tags in square brackets at start of every Q: line.
- Questions end with ?
- Answers: 1-2 sentences only — never more.
- No "Q:" or "A:" anywhere inside question or answer text.
- No numbering. No headers between cards. No explanations.
- Mix clinical vignettes and concept recall cards.`;

    const gptOssSheetPrompt = `You are a senior medical educator and USMLE question writer. Generate a high-yield, exam-ready study sheet that reads like it was written by an experienced clinician — rich, precise, and immediately useful.

Mode: ${mode} | Difficulty: ${diff} | Focus: ${foc} | Length: ${len}

Before writing anything: identify the core medical concept from the input, reason through the highest-yield facts a student needs for exams and clinical practice, then generate the full output below.

FORMATTING RULES (non-negotiable):
- Return ONLY a valid JSON object. No markdown fences, no preamble, no
  commentary, no text before or after the JSON.
- Use **double asterisks** inside string values to bold key terms in the
  summary field only. The renderer handles this.
- Use arrows (→) inside string values to show clinical flow.
- Numbered list items inside array fields: do NOT include the leading
  number (e.g. "1."). Each array element is already one item.

OUTPUT — return exactly this JSON shape:

{
  "topicEmoji": "<one emoji matching the topic>",
  "summary": "<dense clinical snapshot as a single JSON string. MANDATORY STRUCTURE: each sub-section MUST start on its own line using \\n before the label. Exact format:\\nDefinition: **Bold disease name** one sentence.\\nMechanism / Pathophysiology: 2-3 sentences on core defect. Bold **key mechanisms**.\\nKey Associations / Features:\\n1. **Buzzword** → clinical meaning\\n2. **Classic presentation** → distinguishing feature\\nDiagnosis: Gold standard → what it shows.\\nManagement: First-line → drug + rationale.\\nDo NOT merge these into one paragraph. Each label starts after a \\n.>",
  "memoryHooks": [
    "<mnemonic one-liner 1>",
    "<mnemonic one-liner 2>",
    "<mnemonic one-liner 3>"
  ],
  "clinicalApproach": "<clinical decision tree — Diagnosis, Workup, Management, Complications subsections — same content as before as a single string with newlines>",
  "keyPoints": [
    "<If X → think Y one-liner 1>",
    "<If X → think Y one-liner 2>"
  ],
  "examTraps": [
    "<trap one-liner 1>",
    "<trap one-liner 2>"
  ],
  "flashcards": [
    {
      "tag": "Next Step",
      "question": "<full vignette question text>",
      "answer": "<1-2 sentence answer>"
    }
  ],
  "referenceNote": "${referenceNote}"
}

RULES FOR ARRAYS:
- memoryHooks: 3-5 items
- keyPoints: 6-10 items
- examTraps: 4-6 items
- flashcards: exactly 5 items, required mix: 2x Next Step, 1x Diagnosis,
  1x Mechanism, 1x Complication. All clinical vignettes.

EMOJI OPTIONS:
🫀 cardiac, 🩸 hematology, 🧠 neuro, 🫁 pulmonary, 🦴 ortho, 🩺 general,
💊 pharmacology, 🧬 genetics, 👁️ ophthalmology, 🤰 OB/GYN, 👶 pediatrics,
🧫 micro, ⚗️ biochem, 🩹 trauma, 🛡️ immunology

Start your response with { and end with }. Nothing else.`;

    // ── HAIKU 4.5 PROMPTS (Claude-native, based on GPT-OSS with input normalization) ──

    const haikuExplainPrompt = `You are a senior medical educator giving a targeted mid-study clarification.

The student is reviewing a specific flashcard and needs a deeper explanation of that exact question and answer — NOT a general overview of the topic.

If the input starts with "CARD QUESTION:" and "CARD ANSWER:", focus exclusively on explaining WHY that answer is correct: the underlying mechanism, the clinical reasoning, what makes it distinguishable from wrong answers, and what examiners test about it. Do not repeat the question or answer verbatim.

If the input is just a topic name, give a brief high-yield refresher on that topic.

OUTPUT FORMAT (follow exactly, no other sections):

EXPLANATION

3-5 sentences explaining the mechanism or reasoning behind this specific concept. Lead with the core idea. No jargon unless necessary.

WHY THIS ANSWER

One sentence: the single most important reason this answer is correct over alternatives.

EXAM TIP

One sentence: what examiners specifically test or the classic trap on this concept.

RULES:
- Total output under 180 words.
- No flashcards, no full study sheet, no memory hooks section, no reference note.
- No markdown symbols (no #, *, -, **).
- Use plain uppercase section headers exactly as shown above.
- Start directly with EXPLANATION. No preamble.`;

    const haikuCardsPrompt = (count: number) => `You are a medical educator. Generate exactly ${count} USMLE-style flashcards on the given topic.

Mode: ${mode} | Difficulty: ${diff}

INPUT HANDLING:
The user input may be one of three types:
1. Raw medical notes — extract the core topic(s) and generate flashcards based on them.
2. A study request (e.g., "I want to study myocardial infarction") — interpret as a request to generate flashcards on that topic.
3. A direct topic name (e.g., "Nephrotic syndrome") — treat as the topic directly.

Internally normalize the input into a clear medical topic, then generate the flashcards below.

OUTPUT FORMAT — copy this structure exactly:

FLASHCARDS

[one emoji representing the topic on its own line]

Q: [Tag] Question ending with question mark?
A: Answer in 1-2 sentences maximum.

Q: [Tag] Next question?
A: Answer.

[blank line between every card — this is mandatory]

TAGS (pick one per card): [Diagnosis] [Mechanism] [Next Step] [Complication] [Association]

EMOJI: Pick one that matches the topic — 🫀 cardiac, 🩸 hematology, 🧠 neuro, 🫁 pulmonary, 🦴 ortho, 🩺 general, 💊 pharmacology, 🧬 genetics, 👁️ ophthalmology, 🤰 OB/GYN, 👶 pediatrics, 🧫 micro, ⚗️ biochem, 🩹 trauma, 🛡️ immunology

HARD RULES:
- Exactly ${count} cards. No more, no less.
- Each card: Q: on one line, A: on next line, blank line after.
- Tags in square brackets at start of every Q: line.
- Questions end with ?
- Answers: 1-2 sentences only — never more.
- No "Q:" or "A:" anywhere inside question or answer text.
- No numbering. No headers between cards. No explanations.
- Mix clinical vignettes and concept recall cards.`;

    const haikuSheetPrompt = `You are a senior medical educator and USMLE question writer. Generate a high-yield, exam-ready study sheet that reads like it was written by an experienced clinician — rich, precise, and immediately useful.

Mode: ${mode} | Difficulty: ${diff} | Focus: ${foc} | Length: ${len}

INPUT HANDLING:
The user input may be one of three types:
1. Raw medical notes — extract the core topic(s) and generate study material based on them.
2. A study request (e.g., "I want to study myocardial infarction") — interpret as a request to generate high-yield study material on that topic.
3. A direct topic name (e.g., "Nephrotic syndrome") — treat as the topic directly.

Internally normalize the input into a clear medical topic or concept, then generate the full output below.

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

FORMATTING RULES (non-negotiable):
- Return ONLY a valid JSON object. No markdown fences, no preamble, no
  commentary, no text before or after the JSON.
- Use **double asterisks** inside string values to bold key terms in the
  summary field only. The renderer handles this.
- Use arrows (→) inside string values to show clinical flow.
- Numbered list items inside array fields: do NOT include the leading
  number (e.g. "1."). Each array element is already one item.

OUTPUT — return exactly this JSON shape:

{
  "topicEmoji": "<one emoji matching the topic>",
  "summary": "<dense clinical snapshot as a single JSON string. MANDATORY STRUCTURE: each sub-section MUST start on its own line using \\n before the label. Exact format:\\nDefinition: **Bold disease name** one sentence.\\nMechanism / Pathophysiology: 2-3 sentences on core defect. Bold **key mechanisms**.\\nKey Associations / Features:\\n1. **Buzzword** → clinical meaning\\n2. **Classic presentation** → distinguishing feature\\nDiagnosis: Gold standard → what it shows.\\nManagement: First-line → drug + rationale.\\nDo NOT merge these into one paragraph. Each label starts after a \\n.>",
  "memoryHooks": [
    "<mnemonic one-liner 1>",
    "<mnemonic one-liner 2>",
    "<mnemonic one-liner 3>"
  ],
  "clinicalApproach": "<clinical decision tree — Diagnosis, Workup, Management, Complications subsections — same content as before as a single string with newlines>",
  "keyPoints": [
    "<If X → think Y one-liner 1>",
    "<If X → think Y one-liner 2>"
  ],
  "examTraps": [
    "<trap one-liner 1>",
    "<trap one-liner 2>"
  ],
  "flashcards": [
    {
      "tag": "Next Step",
      "question": "<full vignette question text>",
      "answer": "<1-2 sentence answer>"
    }
  ],
  "referenceNote": "${referenceNote}"
}

RULES FOR ARRAYS:
- memoryHooks: 3-5 items
- keyPoints: 6-10 items
- examTraps: 4-6 items
- flashcards: exactly 5 items, required mix: 2x Next Step, 1x Diagnosis,
  1x Mechanism, 1x Complication. All clinical vignettes.

EMOJI OPTIONS:
🫀 cardiac, 🩸 hematology, 🧠 neuro, 🫁 pulmonary, 🦴 ortho, 🩺 general,
💊 pharmacology, 🧬 genetics, 👁️ ophthalmology, 🤰 OB/GYN, 👶 pediatrics,
🧫 micro, ⚗️ biochem, 🩹 trauma, 🛡️ immunology

Start your response with { and end with }. Nothing else.`;

    const userContent = focusCard && !cardsOnly
      ? `Focus specifically on this concept: ${focusCard}\n\nTopic: ${notes}`
      : notes;

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // ── MODEL SELECTION LOGIC ──────────────────────────────────────────────
    // Pro + Claude toggle → Claude Haiku 4.5
    // Free/anon hook (first 1-3 gens) → Claude Haiku 4.5 (premium hook)
    // After hook exhausted → GPT-OSS 20B
    // Pro default → GPT-OSS 20B

    const ANON_PREMIUM_LIMIT = 1;
    const FREE_PREMIUM_LIMIT = 3;

    let model: string;
    let isPremiumGeneration = false;

    if (isPro) {
      if (preferredModel === "claude") {
        model = "anthropic/claude-haiku-4.5";
        isPremiumGeneration = true;
      } else {
        model = "openai/gpt-oss-20b";
        isPremiumGeneration = false;
      }
    } else {
      const premiumLimit = isAnonymous ? ANON_PREMIUM_LIMIT : FREE_PREMIUM_LIMIT;
      let currentPremiumUsed = 0;

      if (userId) {
        const { data: profileData } = await (await import("https://esm.sh/@supabase/supabase-js@2"))
          .createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          )
          .from("profiles")
          .select("premium_used")
          .eq("id", userId)
          .maybeSingle();
        currentPremiumUsed = profileData?.premium_used ?? 0;
      }

      if (currentPremiumUsed < premiumLimit) {
        model = "anthropic/claude-haiku-4.5";
        isPremiumGeneration = true;

        if (userId) {
          await (await import("https://esm.sh/@supabase/supabase-js@2"))
            .createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            )
            .from("profiles")
            .update({ premium_used: currentPremiumUsed + 1 })
            .eq("id", userId);
        }
      } else {
        model = "openai/gpt-oss-20b";
        isPremiumGeneration = false;
      }
    }

    // ── PROMPT SELECTION ───────────────────────────────────────────────────
    const isHaiku = model === "anthropic/claude-haiku-4.5";

    if (explainMode) {
      systemPrompt = isHaiku ? haikuExplainPrompt : gptOssExplainPrompt;
    } else if (cardsOnly) {
      const count = Math.min(Math.max(parseInt(cardCount) || 12, 5), 20);
      systemPrompt = isHaiku ? haikuCardsPrompt(count) : gptOssCardsPrompt(count);
    } else {
      systemPrompt = isHaiku ? haikuSheetPrompt : gptOssSheetPrompt;
    }

    const providerRouting = model.startsWith("openai/gpt-oss")
      ? { provider: { order: ["Cerebras", "Groq"], allow_fallbacks: true } }
      : model === "anthropic/claude-haiku-4.5"
      ? { provider: { order: ["Anthropic"], allow_fallbacks: true } }
      : {};

    console.log("[MODEL_USED]:", model, "| isPremium:", isPremiumGeneration);

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
          ...providerRouting,
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
        console.error("AI 400 error:", t);
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
      console.error("AI error:", response.status, t);
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
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Model-Used": model,
        "X-Is-Premium": isPremiumGeneration ? "true" : "false",
      },
    });
  } catch (e) {
    console.error("medical-notes error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
