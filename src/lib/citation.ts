import { supabase } from "@/integrations/supabase/client";

export interface CitationResult {
  label: string;   // "PubMed" | "AHA/ACC" | "ACOG" | "KDIGO" | "IDSA" | "ADA" | "GOLD/ERS" | "AAP"
  title: string;
  url: string;
  tier: number;
}

export async function fetchBestCitation(topic: string): Promise<CitationResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke("get-citations", {
      body: { topic },
    });

    if (error || !data?.citations) return [];
    return data.citations as CitationResult[];
  } catch {
    return [];
  }
}
