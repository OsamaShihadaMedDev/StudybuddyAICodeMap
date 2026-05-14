import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface ProfileRow {
  is_pro: boolean;
  pro_expires_at: string | null;
}

interface CitationUsageRow {
  count: number;
}

const ANON_CITATION_LIMIT = 1;
const FREE_CITATION_LIMIT = 3;
const ANON_STORAGE_KEY = "sb_anon_citation";

const todayUtc = () => new Date().toISOString().split("T")[0];

function getAnonCitationUsage(): { date: string; count: number } {
  try {
    const raw = localStorage.getItem(ANON_STORAGE_KEY);
    if (!raw) return { date: todayUtc(), count: 0 };
    const parsed = JSON.parse(raw);
    if (parsed.date !== todayUtc()) return { date: todayUtc(), count: 0 };
    return parsed;
  } catch {
    return { date: todayUtc(), count: 0 };
  }
}

function incrementAnonCitationUsage(): void {
  const current = getAnonCitationUsage();
  localStorage.setItem(
    ANON_STORAGE_KEY,
    JSON.stringify({ date: todayUtc(), count: current.count + 1 })
  );
}

export function useCitationUsage() {
  const { user, isAnonymous } = useAuth();
  const userId = user?.id ?? null;
  const isLoggedIn = !!user && !isAnonymous;
  const today = todayUtc();
  const queryClient = useQueryClient();

  const [anonCount, setAnonCount] = useState<number>(
    () => getAnonCitationUsage().count
  );

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_pro, pro_expires_at")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const usageQuery = useQuery({
    queryKey: ["citation_usage", userId, today],
    enabled: isLoggedIn,
    queryFn: async (): Promise<CitationUsageRow | null> => {
      const { data, error } = await supabase
        .from("citation_usage")
        .select("count")
        .eq("user_id", userId!)
        .eq("usage_date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const profile = profileQuery.data ?? null;
  const isProUser =
    isLoggedIn &&
    profile?.is_pro === true &&
    (profile.pro_expires_at === null ||
      new Date(profile.pro_expires_at) > new Date());

  const supabaseCitationCount = usageQuery.data?.count ?? 0;

  let canUseCitation: boolean;
  let citationCount: number;

  if (!isLoggedIn) {
    citationCount = anonCount;
    canUseCitation = citationCount < ANON_CITATION_LIMIT;
  } else if (isProUser) {
    citationCount = 0;
    canUseCitation = true;
  } else {
    citationCount = supabaseCitationCount;
    canUseCitation = citationCount < FREE_CITATION_LIMIT;
  }

  const incrementCitation = async (): Promise<void> => {
    if (!isLoggedIn) {
      incrementAnonCitationUsage();
      setAnonCount(getAnonCitationUsage().count);
      return;
    }
    if (!userId) return;
    const { error } = await supabase
      .from("citation_usage")
      .upsert(
        {
          user_id: userId,
          usage_date: today,
          count: supabaseCitationCount + 1,
        },
        { onConflict: "user_id,usage_date" }
      );
    if (error) throw error;
    await queryClient.invalidateQueries({
      queryKey: ["citation_usage", userId, today],
    });
  };

  return {
    citationCount,
    canUseCitation,
    isProUser: !!isProUser,
    isLoggedIn,
    incrementCitation,
    isLoading: profileQuery.isLoading || usageQuery.isLoading,
  };
}
