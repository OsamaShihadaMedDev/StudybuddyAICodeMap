import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "studybuddy_decks_v1";
const HISTORY_STORAGE_KEY = "studybuddy_history";

type LocalHistoryItem = {
  id: string;
  topic: string;
  input: string;
  output: string;
  timestamp: number;
  modeInfo?: {
    examMode: string;
    difficulty: string;
    focus: string;
    length: string;
  };
};

type LocalCard = {
  id: string;
  question: string;
  answer: string;
  tag: string;
  topic: string;
  topicEmoji?: string;
  createdAt: number;
  interval: number;
  dueAt: number;
  lastReviewed: number | null;
  reviewCount: number;
};

async function migrateLocalCardsToServer(userId: string): Promise<void> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let cards: LocalCard[];
  try {
    const parsed = JSON.parse(raw);
    cards = Array.isArray(parsed) ? parsed : [];
  } catch {
    return;
  }
  if (!cards.length) return;

  // Group by topic
  const topicMap = new Map<string, { topic: string; emoji?: string }>();
  for (const c of cards) {
    if (!topicMap.has(c.topic)) {
      topicMap.set(c.topic, { topic: c.topic, emoji: c.topicEmoji });
    }
  }

  const deckRows = Array.from(topicMap.values()).map((t) => ({
    user_id: userId,
    topic: t.topic,
    topic_emoji: t.emoji ?? null,
  }));

  const { error: deckError } = await supabase
    .from("decks")
    .upsert(deckRows, { onConflict: "user_id,topic" });
  if (deckError) throw deckError;

  const { data: decks, error: fetchError } = await supabase
    .from("decks")
    .select("id, topic")
    .eq("user_id", userId)
    .in("topic", Array.from(topicMap.keys()));
  if (fetchError) throw fetchError;

  const deckIdByTopic = new Map<string, string>();
  for (const d of decks ?? []) deckIdByTopic.set(d.topic, d.id);

  const cardRows = cards
    .map((c) => {
      const deckId = deckIdByTopic.get(c.topic);
      if (!deckId) return null;
      return {
        user_id: userId,
        deck_id: deckId,
        client_id: c.id,
        question: c.question,
        answer: c.answer,
        tag: c.tag,
        topic: c.topic,
        topic_emoji: c.topicEmoji ?? null,
        interval_days: c.interval ?? 0,
        due_at: new Date(c.dueAt ?? Date.now()).toISOString(),
        last_reviewed_at: c.lastReviewed
          ? new Date(c.lastReviewed).toISOString()
          : null,
        review_count: c.reviewCount ?? 0,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const { error: cardError } = await supabase
    .from("cards")
    .upsert(cardRows, {
      onConflict: "user_id,client_id",
      ignoreDuplicates: true,
    });
  if (cardError) throw cardError;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function migrateLocalStudyHistoryToServer(userId: string): Promise<void> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(HISTORY_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let items: LocalHistoryItem[];
  try {
    const parsed = JSON.parse(raw);
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    return;
  }
  if (!items.length) return;

  const rows = items.map((item) => ({
    user_id: userId,
    topic: item.topic,
    input: item.input,
    output: item.output,
    exam_mode: item.modeInfo?.examMode ?? null,
    difficulty: item.modeInfo?.difficulty ?? null,
    focus: item.modeInfo?.focus ?? null,
    length: item.modeInfo?.length ?? null,
    created_at: new Date(item.timestamp ?? Date.now()).toISOString(),
  }));

  const { error } = await supabase.from("study_history").insert(rows);
  if (error) throw error;

  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (!data.session) {
        supabase.auth.signInAnonymously();
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const isAnonymous = Boolean(session?.user?.is_anonymous);

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (isAnonymous) {
      const { data, error } = await supabase.auth.updateUser({ email, password });
      if (error) return { error: error.message };
      const upgradedUserId = data.user?.id ?? session?.user?.id;
      if (upgradedUserId) {
        try {
          await migrateLocalCardsToServer(upgradedUserId);
        } catch {
          toast({
            title: "Couldn't sync local cards to your account, please try again later",
            variant: "destructive",
          });
        }
        try {
          await migrateLocalStudyHistoryToServer(upgradedUserId);
        } catch {
          toast({
            title: "Couldn't sync local study history to your account, please try again later",
            variant: "destructive",
          });
        }
      }
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async (): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  };

  return { user, session, loading, isAnonymous, signUp, signIn, signOut };
}
