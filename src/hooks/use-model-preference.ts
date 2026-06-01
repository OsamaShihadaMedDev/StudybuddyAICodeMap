import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type ModelPreference = "claude" | "gpt-oss";

export function useModelPreference() {
  const { user, isAnonymous } = useAuth();
  const userId = user?.id ?? null;
  const isLoggedIn = !!user && !isAnonymous;
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const prefQuery = useQuery({
    queryKey: ["model-preference", userId],
    enabled: isLoggedIn,
    queryFn: async (): Promise<ModelPreference> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_model")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data?.preferred_model as ModelPreference) ?? "gpt-oss";
    },
  });

  const preferredModel: ModelPreference = prefQuery.data ?? "gpt-oss";

  const setPreferredModel = async (model: ModelPreference) => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ preferred_model: model })
        .eq("id", userId);
      await queryClient.invalidateQueries({ queryKey: ["model-preference", userId] });
    } finally {
      setSaving(false);
    }
  };

  return {
    preferredModel,
    setPreferredModel,
    saving,
    isLoading: prefQuery.isLoading,
  };
}
