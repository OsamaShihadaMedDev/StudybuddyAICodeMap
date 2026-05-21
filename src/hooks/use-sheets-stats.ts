import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

export function useSheetsStats() {
  const { user, isAnonymous } = useAuth();
  const userId = user?.id ?? null;
  const canFetch = !!userId && !isAnonymous;

  const { start, end } = getWeekRange();

  const query = useQuery({
    queryKey: ["sheets-this-week", userId, start],
    enabled: canFetch,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("usage_records")
        .select("count")
        .eq("user_id", userId!)
        .eq("kind", "sheet")
        .gte("usage_date", start)
        .lte("usage_date", end);
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + (row.count ?? 0), 0);
    },
  });

  return {
    sheetsThisWeek: canFetch ? (query.data ?? null) : null,
    isAnonymous: !canFetch,
    isLoading: query.isLoading,
  };
}
