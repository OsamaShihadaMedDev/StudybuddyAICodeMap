import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const MAX_DAILY_SHEETS = 5;
export const MAX_DAILY_CARDS = 5;

type UsageKind = "sheet" | "cards";

interface ProfileRow {
  is_pro: boolean;
  pro_expires_at: string | null;
}

interface UsageRow {
  kind: string;
  count: number;
}

const todayUtc = () => new Date().toISOString().split("T")[0];

export function useUsageLimit() {
  const { user, isAnonymous } = useAuth();
  const userId = user?.id ?? null;
  const today = todayUtc();
  const queryClient = useQueryClient();

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
    queryKey: ["usage", userId, today],
    enabled: !!userId,
    queryFn: async (): Promise<UsageRow[]> => {
      const { data, error } = await supabase
        .from("usage_records")
        .select("kind, count")
        .eq("user_id", userId!)
        .eq("usage_date", today);
      if (error) throw error;
      return data ?? [];
    },
  });

  const profile = profileQuery.data ?? null;
  const isProUser =
    !isAnonymous &&
    profile?.is_pro === true &&
    (profile.pro_expires_at === null ||
      new Date(profile.pro_expires_at) > new Date());

  const sheetCount =
    usageQuery.data?.find((r) => r.kind === "sheet")?.count ?? 0;
  const cardsCount =
    usageQuery.data?.find((r) => r.kind === "cards")?.count ?? 0;

  const isSheetLite = sheetCount >= MAX_DAILY_SHEETS && !isProUser;
  const isCardsLite = cardsCount >= MAX_DAILY_CARDS && !isProUser;

  const increment = async (kind: UsageKind) => {
    if (!userId) return;
    const current =
      kind === "sheet" ? sheetCount : cardsCount;
    const { error } = await supabase
      .from("usage_records")
      .upsert(
        {
          user_id: userId,
          kind,
          usage_date: today,
          count: current + 1,
        },
        { onConflict: "user_id,kind,usage_date" }
      );
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["usage", userId, today] });
  };

  return {
    sheetCount,
    cardsCount,
    isSheetLite,
    isCardsLite,
    isProUser: !!isProUser,
    isLoading: profileQuery.isLoading || usageQuery.isLoading,
    incrementSheet: () => increment("sheet"),
    incrementCards: () => increment("cards"),
  };
}
