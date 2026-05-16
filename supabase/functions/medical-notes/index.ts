import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-model-used, x-is-premium",
};

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

    // ── GEMINI PROMPTS (unchanged) ─────────────────────────────────────────
    const geminiExplainPrompt = `You are a senior medical educator giving a targeted mid-study clarification.

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

STRICT RULES:
- Total output under 180 words.
- No flashcards, no full study sheet, no memory hooks section, no reference note.
- No markdown symbols (no #, *, -, **).
- Use plain uppercase section headers exactly as shown above.
- Start directly with EXPLANATION. No preamble.`;

    const geminiCardsPrompt = (count: number) => `You are an expert medical educator generating USMLE-style active recall questions.

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

    const geminiSheetPrompt = `You are an expert medical educator creating polished, exam-ready study material.

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
- Use **double asterisks** around key terms in SUMMARY only. This is the ONLY markdown allowed.
- Use numbered lists (1. 2. 3.) for all lists.
- Use arrows (→) to show clinical flow and associations.
- Plain uppercase section headers on their own line.
- No #, *, -, bullet symbols anywhere except numbered lists.
- No preamble. Start directly with SUMMARY.

---

SUMMARY

Write a dense, scannable clinical snapshot. Every line should carry information a student would highlight.

Definition: **Bold the disease name**. One crisp sentence — pathophysiological definition, not a dictionary definition.
Mechanism / Pathophysiology: 2-3 sentences max. Lead with the core defect. Bold **key mechanisms** and **mediators**. Include the cascade if it's high-yield.
Key Associations / Features:
1. **Buzzword/finding** → what it means clinically
2. **Classic presentation** → key distinguishing feature
3. **Risk factor or etiology** → mechanism if relevant
4. (add more only if genuinely high-yield — do not pad)
Diagnosis: Gold standard test → what it shows. Include sensitivity/specificity tradeoffs only if exam-relevant.
Management: First-line → drug class + mechanism if high-yield. Include dose only for commonly tested drugs.

Rules:
- Each labeled segment is its own line or short block — never a paragraph.
- Bold liberally in this section — every buzzword, every key mechanism, every classic association.
- If the topic is large (e.g. heart failure, sepsis), compress ruthlessly — only the most-tested facts.
- No repetition of content that appears in Clinical Approach or Key Points.


MEMORY HOOKS

Write 3-5 mnemonic-style one-liners that a student can recall in 2 seconds during an exam. Think First Aid style.

1. Mechanism chain using → arrows
2. Classic "if you see X think Y" association
3. Drug/treatment shortcut or mnemonic
4. Distinguishing feature vs similar condition
5. (add only if genuinely sticky and non-redundant)

Rules: Arrow format preferred. Each line = one association. Instantly memorable. No overlap with Key Points.
Bad example: "Heart failure is a complex syndrome" — too vague, no value.
Good example: "HFrEF → ↓EF → ACEi + BB + spironolactone → mortality benefit"


CLINICAL APPROACH

Write this like a clinical decision tree. A student should be able to follow this in a real patient encounter.

Diagnosis:
1. Classic presentation → key finding that clinches it
2. Confirmatory test → expected result + why it confirms

Workup:
1. First-line investigation → what it shows and why you order it
2. Second investigation → when to order and what it rules in/out
3. (additional only if high-yield)

Management:
1. First-line treatment → drug/intervention + brief rationale
2. If unstable or severe → immediate action
3. If refractory or treatment fails → escalation step
4. Special population or exception → modification if high-yield

Complications:
1. Most common complication → mechanism if non-obvious
2. Most dangerous complication → why it's lethal and how to recognize it

Rules:
- One line per step. Arrows show logical flow.
- Include specific drug names, not just drug classes.
- Include numbers where they matter (e.g. "IV furosemide 40mg", "MAP < 65", "GCS < 8 → intubate").
- 4-8 steps total across all groups — quality over quantity.


KEY POINTS

Write 6-10 high-yield one-liners in "If X → think Y" exam-trigger format. These should be the exact associations that separate a 240 from a 220 on Step 2.

1. If [classic finding/scenario] → [diagnosis/drug/next step]
2. If [buzzword] → [association]
3. [Condition A] vs [Condition B] → key distinguishing feature
4. [Drug] → [mechanism] → [key side effect or indication]
5. (continue for 6-10 total)

Rules:
- Every point = exactly 1 line. No explanations.
- Focus on what students get wrong or what's classically tested.
- Include at least 2 comparison points (X vs Y).
- No overlap with Memory Hooks or Clinical Approach.


EXAM TRAPS

Write 4-6 specific, clinical pitfalls — the exact mistakes that lose points on Step 2 CK. Each trap should describe both the error and the correct thinking.

1. [Wrong assumption] → [why it's wrong] → [correct approach]
2. [Condition commonly confused with topic] → [key distinguishing feature]
3. [Diagnostic trap] → [what to look for instead]
4. (continue for 4-6 total)

Rules: One line each. Specific and clinical — not generic advice like "don't miss the diagnosis."
Bad: "Be careful not to confuse similar conditions."
Good: "Cardiac tamponade vs tension pneumo → both cause obstructive shock, but tamponade has muffled heart sounds + JVD without tracheal deviation."


FLASHCARDS

[EMOJI — one emoji on its own line, matching the topic. No text around it.]

Generate exactly 5 flashcards. All must be clinical vignettes — real patient scenarios, not abstract concept questions. Each vignette should read like a mini USMLE stem: age, sex, brief history, key findings, then the question.

REQUIRED mix:
- 2 x [Next Step] — what to do next in management
- 1 x [Diagnosis] — identify the condition from a vignette
- 1 x [Mechanism] — explain why something happens
- 1 x [Complication] — identify or manage a complication

FORMAT — copy exactly, including blank lines between cards:

Q: [Next Step] A 67-year-old man with known COPD presents with worsening dyspnea, pursed-lip breathing, and ABG showing pH 7.28, PaCO2 72 mmHg, HCO3 32 mEq/L. He is alert. What is the next best step?
A: Initiate non-invasive positive pressure ventilation (BiPAP); reserve intubation for failure of NIV or altered consciousness.

Q: [Diagnosis] A 52-year-old woman presents with progressive exertional dyspnea, orthopnea, and bilateral crackles. Echo shows EF of 35%. What is the diagnosis?
A: Heart failure with reduced ejection fraction (HFrEF).

Q: [Mechanism] Why does left heart failure cause pulmonary edema?
A: Elevated LVEDP increases pulmonary capillary hydrostatic pressure beyond oncotic pressure, forcing fluid into the alveolar space.

Q: [Next Step] A 44-year-old man with hypertension presents with BP 210/130 and confusion. CT head is negative. What is the next step?
A: IV labetalol or nicardipine to reduce MAP by no more than 25% in the first hour; avoid sudden drops that can cause ischemia.

Q: [Complication] A patient on ACE inhibitor therapy develops sudden lip and tongue swelling without urticaria. What is this and how is it managed?
A: Bradykinin-mediated angioedema; stop the ACE inhibitor immediately, administer fresh frozen plasma or icatibant for severe cases.

HARD RULES — parser depends on these:
- Tags MUST be in square brackets: [Next Step] NOT "Next Step" NOT Next Step.
- Q: on its own line. A: on the next line. Then ONE blank line. Then next Q:.
- Questions end with ?
- Answers: 1-2 sentences only. Never more. Never start with "I would..."
- No "Q:" or "A:" anywhere inside the question or answer text.
- No numbering. No headers between cards.
- EMOJI: 🫀 cardiac, 🩸 hematology, 🧠 neuro, 🫁 pulmonary, 🦴 ortho, 🩺 general, 💊 pharmacology, 🧬 genetics, 👁️ ophthalmology, 🤰 OB/GYN, 👶 pediatrics, 🧫 micro, ⚗️ biochem, 🩹 trauma, 🛡️ immunology


REFERENCE NOTE

${referenceNote}

---
Output ONLY the sections above in order. Start directly with SUMMARY. No introduction, no conclusion, no meta-commentary.`;

    const userContent = focusCard && !cardsOnly
      ? `Focus specifically on this concept: ${focusCard}\n\nTopic: ${notes}`
      : notes;

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    // ── MODEL SELECTION LOGIC ──────────────────────────────────────────────
    // Hook limits: anon = 1 premium gen, free signed-in = 3 premium gens
    // Premium gen = Gemini Flash (best quality, used to hook users)
    // After hook exhausted: GPT-OSS 20B for free/anon, Gemini Flash for Pro
    // Pro default is always Gemini Flash unless they explicitly switch to GPT-OSS

    const ANON_PREMIUM_LIMIT = 1;
    const FREE_PREMIUM_LIMIT = 3;

    let model: string;
    let isPremiumGeneration = false;

    if (isPro) {
      const proModel = preferredModel === "gpt-oss" ? "gpt-oss" : "flash";
      if (proModel === "flash") {
        model = (explainMode || cardsOnly)
          ? "google/gemini-2.5-flash-lite"
          : "google/gemini-2.5-flash";
      } else {
        model = "openai/gpt-oss-20b";
      }
      isPremiumGeneration = proModel === "flash";
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
        model = (explainMode || cardsOnly)
          ? "google/gemini-2.5-flash-lite"
          : "google/gemini-2.5-flash";
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
    const isGemini = model.startsWith("google/gemini");

    if (explainMode) {
      systemPrompt = isGemini ? geminiExplainPrompt : gptOssExplainPrompt;
    } else if (cardsOnly) {
      const count = Math.min(Math.max(parseInt(cardCount) || 12, 5), 20);
      systemPrompt = isGemini ? geminiCardsPrompt(count) : gptOssCardsPrompt(count);
    } else {
      systemPrompt = isGemini ? geminiSheetPrompt : gptOssSheetPrompt;
    }

    const providerRouting = model.startsWith("openai/gpt-oss")
      ? { provider: { order: ["Cerebras", "Groq"], allow_fallbacks: true } }
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
          max_tokens: 6000,
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
