import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Specialty detection ──────────────────────────────────────────────────

interface SpecialtyProfile {
  name: string;
  journalFilters: string[];
  societyLabel: string;
}

const SPECIALTY_MAP: { keywords: string[]; profile: SpecialtyProfile }[] = [
  {
    keywords: [
      "heart", "cardiac", "cardiology", "hypertension", "myocardial",
      "coronary", "arrhythmia", "atrial fibrillation", "heart failure",
      "angina", "aorta", "ecg", "stemi", "nstemi", "pericarditis",
      "endocarditis", "cardiomyopathy", "valvular",
    ],
    profile: {
      name: "cardiology",
      journalFilters: ["Circulation[jour]", "J Am Coll Cardiol[jour]"],
      societyLabel: "AHA/ACC",
    },
  },
  {
    keywords: [
      "obstetric", "gynecolog", "pregnancy", "prenatal", "postpartum",
      "preeclampsia", "eclampsia", "cervical", "uterine", "ovarian",
      "endometriosis", "pcos", "menstrual", "contraception", "labor",
      "delivery", "miscarriage", "ectopic", "gestational diabetes",
    ],
    profile: {
      name: "obgyn",
      journalFilters: ["Obstet Gynecol[jour]"],
      societyLabel: "ACOG",
    },
  },
  {
    keywords: [
      "kidney", "renal", "nephrology", "nephritis", "nephrotic",
      "glomerulo", "dialysis", "creatinine", "egfr", "ckd", "aki",
      "proteinuria", "hematuria", "transplant kidney", "kdigo",
    ],
    profile: {
      name: "nephrology",
      journalFilters: ["Kidney Int[jour]", "Kidney Int Suppl[jour]"],
      societyLabel: "KDIGO",
    },
  },
  {
    keywords: [
      "diabetes", "insulin", "hyperglycemia", "hba1c", "type 1 diabetes",
      "type 2 diabetes", "diabetic", "metformin", "hypoglycemia",
      "thyroid", "hypothyroid", "hyperthyroid", "adrenal", "pituitary",
      "cushing", "addison", "endocrine",
    ],
    profile: {
      name: "endocrinology",
      journalFilters: ["Diabetes Care[jour]", "J Clin Endocrinol Metab[jour]"],
      societyLabel: "ADA/Endocrine Society",
    },
  },
  {
    keywords: [
      "infection", "sepsis", "antibiotic", "pneumonia", "meningitis",
      "hiv", "tuberculosis", "fungal", "viral", "bacterial", "antimicrobial",
      "endocarditis infective", "urinary tract infection", "uti",
      "cellulitis", "osteomyelitis", "infectious disease",
    ],
    profile: {
      name: "infectious_disease",
      journalFilters: ["Clin Infect Dis[jour]", "J Infect Dis[jour]"],
      societyLabel: "IDSA",
    },
  },
  {
    keywords: [
      "copd", "asthma", "pulmonary", "lung", "respiratory", "bronchitis",
      "emphysema", "pleural", "pneumothorax", "interstitial lung",
      "pulmonary fibrosis", "pulmonary hypertension", "spirometry",
    ],
    profile: {
      name: "pulmonology",
      journalFilters: ["Eur Respir J[jour]", "Am J Respir Crit Care Med[jour]"],
      societyLabel: "GOLD/ERS",
    },
  },
  {
    keywords: [
      "pediatric", "neonatal", "infant", "child", "newborn", "congenital",
      "vaccination child", "growth development", "puberty", "pediatrics",
    ],
    profile: {
      name: "pediatrics",
      journalFilters: ["Pediatrics[jour]", "Arch Dis Child[jour]"],
      societyLabel: "AAP",
    },
  },
];

function detectSpecialty(topic: string): SpecialtyProfile | null {
  const lower = topic.toLowerCase();
  for (const { keywords, profile } of SPECIALTY_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return profile;
    }
  }
  return null;
}

// ─── Query building ───────────────────────────────────────────────────────

function buildSearchQuery(topic: string): string {
  // Clean the topic but keep it largely intact — PubMed handles natural language well
  return topic
    .replace(/according to .+/i, "")
    .replace(/management of /i, "")
    .replace(/[^a-zA-Z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

// ─── Relevance check ──────────────────────────────────────────────────────

function isTitleRelevant(title: string, topic: string): boolean {
  const IGNORE = new Set([
    "a", "an", "the", "of", "in", "for", "and", "or", "to", "with",
    "on", "at", "from", "by", "is", "are", "was", "were", "be",
    "its", "it", "this", "that", "as", "vs", "per",
  ]);

  const topicWords = topic
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !IGNORE.has(w));

  const titleLower = title.toLowerCase();

  return topicWords.some((w) => titleLower.includes(w));
}

// ─── PubMed ───────────────────────────────────────────────────────────────

async function findRelevantPubMedResult(
  idList: string[],
  topic: string,
  ncbiKey: string,
  specialty: SpecialtyProfile | null
): Promise<{ label: string; title: string; url: string; tier: number } | null> {
  for (const pmid of idList) {
    const summaryUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
      `?db=pubmed&id=${pmid}&retmode=json&api_key=${ncbiKey}`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) continue;
    const summaryData = await summaryRes.json();
    const articleData = summaryData?.result?.[pmid];
    const title = articleData?.title as string | undefined;
    if (!title) continue;
    if (!isTitleRelevant(title, topic)) continue;

    const label = specialty ? specialty.societyLabel : "PubMed";
    return {
      label,
      title: title.replace(/\.$/, "").slice(0, 80),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      tier: 1,
    };
  }
  return null;
}

async function fetchPubMed(
  topic: string,
  ncbiKey: string,
  specialty: SpecialtyProfile | null
): Promise<{ label: string; title: string; url: string; tier: number } | null> {
  try {
    const keywords = buildSearchQuery(topic);

    let query = keywords;
    if (specialty) {
      const journalQuery = specialty.journalFilters.join(" OR ");
      query = `(${keywords}) AND (${journalQuery})`;
    }

    const searchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
      `?db=pubmed&term=${encodeURIComponent(query)}` +
      `&retmax=5&retmode=json&sort=relevance&api_key=${ncbiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const primaryIds: string[] = searchData?.esearchresult?.idlist ?? [];

    const primaryHit = await findRelevantPubMedResult(
      primaryIds,
      topic,
      ncbiKey,
      specialty
    );
    if (primaryHit) return primaryHit;

    if (specialty) {
      const fallbackUrl =
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
        `?db=pubmed&term=${encodeURIComponent(keywords)}` +
        `&retmax=5&retmode=json&sort=relevance&api_key=${ncbiKey}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (!fallbackRes.ok) return null;
      const fallbackData = await fallbackRes.json();
      const fallbackIds: string[] = fallbackData?.esearchresult?.idlist ?? [];
      const fallbackHit = await findRelevantPubMedResult(
        fallbackIds,
        topic,
        ncbiKey,
        specialty
      );
      if (fallbackHit) return fallbackHit;
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return new Response(
        JSON.stringify({ citations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const NCBI_API_KEY = Deno.env.get("NCBI_API_KEY") ?? "";
    const specialty = detectSpecialty(topic);
    const result = await fetchPubMed(topic, NCBI_API_KEY, specialty);
    const citations = result ? [result] : [];

    return new Response(
      JSON.stringify({ citations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("get-citations error:", e);
    return new Response(
      JSON.stringify({ citations: [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
