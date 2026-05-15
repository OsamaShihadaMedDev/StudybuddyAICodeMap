import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const ANON_PREMIUM_LIMIT = 1;
export const FREE_PREMIUM_LIMIT = 3;

export function usePremiumHook() {
  const { user, isAnonymous } = useAuth();
  const userId = user?.id ?? null;
  const isLoggedIn = !!user && !isAnonymous;
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile-premium", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("premium_used, is_pro, pro_expires_at")
        .eq("id", userId!)
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

  const premiumUsed = profile?.premium_used ?? 0;
  const premiumLimit = isAnonymous ? ANON_PREMIUM_LIMIT : FREE_PREMIUM_LIMIT;
  const premiumRemaining = Math.max(0, premiumLimit - premiumUsed);
  const isPremiumHookActive = !isProUser && premiumRemaining > 0;

  return {
    premiumUsed,
    premiumLimit,
    premiumRemaining,
    isPremiumHookActive,
    isProUser: !!isProUser,
    isLoading: profileQuery.isLoading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["profile-premium", userId] }),
  };
}
