import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Question, QuestionMedia, OptionKey, SessionAnswer, SessionState } from "@/hooks/use-qbank";

const STORAGE_KEY = "sb_qbank_session";

export interface SessionConfig {
  domains: string[];
  limit: number;
  system?: string;
  questionIds?: string[];
}

interface SessionSummary {
  questions: Question[];
  answers: SessionAnswer[];
  totalTime: number;
  score: number;
  total: number;
  flaggedIds: string[];
}

interface QBankContextValue {
  questionCount: number;
  availableSystems: string[];
  allDomainMeta: { subject: string; domain: string }[];
  allQuestionMeta: { id: string; domain: string; subject: string }[];
  session: SessionState | null;
  currentQuestion: Question | null;
  currentIndex: number;
  totalQuestions: number;
  isLastQuestion: boolean;
  progress: number;
  startSession: (config?: SessionConfig) => Promise<void>;
  submitAnswer: (key: OptionKey) => { is_correct: boolean; correct_option: OptionKey } | undefined;
  nextQuestion: () => void;
  endSession: () => Promise<SessionSummary | null>;
  resetSession: () => void;
  lastSummary: SessionSummary | null;
  reviewIndex: number | null;
  setReviewIndex: (index: number | null) => void;
  enterSummaryReview: (index: number) => void;
  displayQuestion: Question | null;
  displayAnswer: SessionAnswer | null;
  isReviewing: boolean;
  loadSummary: (data: SessionSummary) => void;
  restoreSession: () => boolean;
  snapshotTimer: () => void;
  elapsedMs: number;
  flaggedIds: Set<string>;
  toggleFlag: (questionId: string) => Promise<void>;
  isFlagLoading: boolean;
  skipQuestion: () => void;
  goToQuestion: (index: number) => void;
  unansweredCount: number;
}

const QBankContext = createContext<QBankContextValue | null>(null);

export const QBankProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  const { data: questionCount = 0 } = useQuery({
    queryKey: ["qbank-count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: availableSystems = [] } = useQuery({
    queryKey: ["qbank-systems"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("questions")
        .select("subject")
        .eq("is_active", true);
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((r: { subject: string }) => r.subject))].sort();
      return unique;
    },
  });

  const { data: allDomainMeta = [] } = useQuery({
    queryKey: ["qbank-domain-meta"],
    queryFn: async (): Promise<{ subject: string; domain: string }[]> => {
      const { data, error } = await supabase
        .from("questions")
        .select("subject, domain")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as { subject: string; domain: string }[];
    },
  });

  const { data: allQuestionMeta = [] } = useQuery({
    queryKey: ["qbank-meta"],
    queryFn: async (): Promise<{ id: string; domain: string; subject: string }[]> => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, domain, subject")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as { id: string; domain: string; subject: string }[];
    },
  });

  const flaggedIds: Set<string> = useMemo(
    () => new Set(session?.flaggedIds ?? []),
    [session?.flaggedIds]
  );

  const isFlagLoading = false;

  const fetchQuestions = useCallback(async (config?: SessionConfig): Promise<Question[]> => {
    let query = supabase
      .from("questions")
      .select(
        "id, subject, domain, topic, difficulty, competency, question_text, option_a, option_b, option_c, option_d, option_e, correct_option, explanation, teaching_point"
      )
      .eq("is_active", true);

    if (config?.questionIds && config.questionIds.length > 0) {
      query = query.in("id", config.questionIds);
    } else {
      if (config?.system) {
        query = query.eq("subject", config.system);
      }
      if (config?.domains && config.domains.length > 0) {
        query = query.in("domain", config.domains);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const questions = [...(data ?? [])] as Question[];

    const questionIds = questions.map((q) => q.id);

    if (questionIds.length > 0) {
      const { data: mediaLinks, error: mediaError } = await supabase
        .from("question_media")
        .select(`
          question_id,
          display_context,
          display_order,
          caption,
          media (
            file_url,
            media_type,
            attribution,
            license
          )
        `)
        .in("question_id", questionIds)
        .order("display_order", { ascending: true });

      if (!mediaError && mediaLinks) {
        const mediaByQuestion: Record<string, QuestionMedia[]> = {};

        for (const link of mediaLinks as unknown as Array<{
          question_id: string;
          display_context: string;
          display_order: number;
          caption: string | null;
          media: {
            file_url: string;
            media_type: string;
            attribution: string | null;
            license: string;
          } | null;
        }>) {
          const m = link.media;
          if (!m) continue;

          const item: QuestionMedia = {
            file_url: m.file_url,
            media_type: m.media_type,
            caption: link.caption ?? null,
            attribution: m.attribution ?? null,
            license: m.license,
            display_context: link.display_context as 'stem' | 'explanation' | 'both',
            display_order: link.display_order,
          };

          if (!mediaByQuestion[link.question_id]) {
            mediaByQuestion[link.question_id] = [];
          }
          mediaByQuestion[link.question_id].push(item);
        }

        for (const q of questions) {
          q.media = mediaByQuestion[q.id] ?? [];
        }
      }
    }

    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    const limit = config?.limit ?? 40;
    return questions.slice(0, Math.min(limit, 40));
  }, []);

  const saveSessionToStorage = useCallback((s: SessionState) => {
    const firstUnanswered = s.questions.findIndex(
      (q) => !s.answers.some((a) => a.question_id === q.id)
    );
    const persistIndex = firstUnanswered === -1 ? s.currentIndex : firstUnanswered;

    const payload = {
      questions: s.questions,
      currentIndex: persistIndex,
      answers: s.answers,
      startedAt: s.startedAt,
      accumulatedMs: s.accumulatedMs + (Date.now() - s.resumedAt),
      skippedIds: s.skippedIds,
      flaggedIds: s.flaggedIds,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage full or unavailable — fail silently
    }
  }, []);

  const clearSessionStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // fail silently
    }
  }, []);

  const restoreSession = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);

      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (!parsed.savedAt || Date.now() - parsed.savedAt > TWENTY_FOUR_HOURS) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      if (
        !Array.isArray(parsed.questions) ||
        parsed.questions.length === 0 ||
        typeof parsed.currentIndex !== "number" ||
        !Array.isArray(parsed.answers) ||
        typeof parsed.startedAt !== "number"
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      setReviewIndex(null);
      setSession({
        questions: parsed.questions,
        currentIndex: parsed.currentIndex,
        answers: parsed.answers,
        startedAt: parsed.startedAt,
        questionStartedAt: Date.now(),
        accumulatedMs: typeof parsed.accumulatedMs === "number" ? parsed.accumulatedMs : 0,
        resumedAt: Date.now(),
        skippedIds: Array.isArray(parsed.skippedIds) ? parsed.skippedIds : [],
        flaggedIds: Array.isArray(parsed.flaggedIds) ? parsed.flaggedIds : [],
      });

      return true;
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      return false;
    }
  }, []);

  const startSession = useCallback(async (config?: SessionConfig) => {
    setReviewIndex(null);
    const questions = await fetchQuestions(config);
    const now = Date.now();
    const newSession: SessionState = {
      questions,
      currentIndex: 0,
      answers: [],
      startedAt: now,
      questionStartedAt: now,
      accumulatedMs: 0,
      resumedAt: now,
      skippedIds: [],
      flaggedIds: [],
    };
    setSession(newSession);
    saveSessionToStorage(newSession);
  }, [fetchQuestions, saveSessionToStorage]);

  const submitAnswer = useCallback(
    (selectedOption: OptionKey) => {
      if (!session) return undefined;
      const question = session.questions[session.currentIndex];
      const is_correct = selectedOption === question.correct_option;
      const time_taken_ms = Date.now() - session.questionStartedAt;
      const answer: SessionAnswer = {
        question_id: question.id,
        selected_option: selectedOption,
        is_correct,
        time_taken_ms,
      };
      const updatedAnswers = [...session.answers, answer];
      setSession((prev) =>
        prev ? { ...prev, answers: updatedAnswers } : null
      );

      const firstUnanswered = session.questions.findIndex(
        (q) => !updatedAnswers.some((a) => a.question_id === q.id)
      );
      const persistIndex = firstUnanswered === -1 ? session.currentIndex : firstUnanswered;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          questions: session.questions,
          currentIndex: persistIndex,
          answers: updatedAnswers,
          startedAt: session.startedAt,
          accumulatedMs: session.accumulatedMs + (Date.now() - session.resumedAt),
          skippedIds: session.skippedIds,
          flaggedIds: session.flaggedIds,
          savedAt: Date.now(),
        }));
      } catch { /* fail silently */ }

      return { is_correct, correct_option: question.correct_option };
    },
    [session]
  );

  const nextQuestion = useCallback(() => {
    setReviewIndex(null);
    setSession((prev) =>
      prev
        ? { ...prev, currentIndex: prev.currentIndex + 1, questionStartedAt: Date.now() }
        : null
    );
    if (session) {
      const nextIndex = session.currentIndex + 1;
      saveSessionToStorage({
        ...session,
        currentIndex: nextIndex,
        questionStartedAt: Date.now(),
      });
    }
  }, [session, saveSessionToStorage]);

  const saveAttemptsMutation = useMutation({
    mutationFn: async (answers: SessionAnswer[]) => {
      if (!user?.id) throw new Error("Not authenticated");
      const rows = answers.map((a) => ({
        user_id: user.id,
        question_id: a.question_id,
        selected_option: a.selected_option,
        is_correct: a.is_correct,
        time_taken_ms: a.time_taken_ms,
      }));
      const { error } = await supabase.from("user_attempts").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qbank-count"] });
      queryClient.invalidateQueries({ queryKey: ["qbank-sessions"] });
    },
  });

  const endSession = useCallback(async () => {
    if (!session) return null;

    const endedAt = Date.now();
    const score = session.answers.filter((a) => a.is_correct).length;
    const total = session.answers.length;
    const totalTime = session.accumulatedMs + (endedAt - session.resumedAt);

    let sessionId: string | null = null;

    if (user?.id) {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("qbank_sessions")
          .insert({
            user_id: user.id,
            started_at: new Date(session.startedAt).toISOString(),
            ended_at: new Date(endedAt).toISOString(),
            score,
            total,
            total_time_ms: totalTime,
            system: session.questions[0]?.subject ?? "Cardiovascular",
          })
          .select("id")
          .single();

        if (!sessionError && sessionData) {
          sessionId = sessionData.id;
          queryClient.invalidateQueries({ queryKey: ["qbank-sessions"] });

          const rows = session.answers.map((a) => ({
            user_id: user.id,
            question_id: a.question_id,
            selected_option: a.selected_option,
            is_correct: a.is_correct,
            time_taken_ms: a.time_taken_ms,
            session_id: sessionId,
          }));

          await supabase.from("user_attempts").insert(rows);

          if (sessionId && session.flaggedIds.length > 0) {
            const flagRows = session.flaggedIds.map((questionId) => ({
              user_id: user.id,
              question_id: questionId,
              session_id: sessionId,
            }));
            await supabase.from("flagged_questions").insert(flagRows);
          }
        } else if (session.answers.length > 0) {
          await saveAttemptsMutation.mutateAsync(session.answers);
        }
      } catch (err) {
        console.error("Failed to save session to DB:", err);
        if (session.answers.length > 0) {
          try {
            await saveAttemptsMutation.mutateAsync(session.answers);
          } catch {
            // already logged
          }
        }
      }
    }

    const summary: SessionSummary = {
      questions: session.questions.slice(0, total),
      answers: session.answers,
      totalTime,
      score,
      total,
      flaggedIds: session.flaggedIds,
    };

    setLastSummary(summary);
    clearSessionStorage();
    setSession(null);
    setReviewIndex(null);

    if (sessionId) {
      navigate(`/qbank/summary?session=${sessionId}`);
    } else {
      navigate("/qbank/summary");
    }

    return summary;
  }, [session, user, saveAttemptsMutation, navigate, clearSessionStorage]);

  const resetSession = useCallback(() => {
    clearSessionStorage();
    setSession(null);
  }, [clearSessionStorage]);

  const toggleFlag = useCallback(async (questionId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      const alreadyFlagged = prev.flaggedIds.includes(questionId);
      const updated: SessionState = {
        ...prev,
        flaggedIds: alreadyFlagged
          ? prev.flaggedIds.filter((id) => id !== questionId)
          : [...prev.flaggedIds, questionId],
      };

      const firstUnanswered = updated.questions.findIndex(
        (q) => !updated.answers.some((a) => a.question_id === q.id)
      );
      const persistIndex = firstUnanswered === -1 ? updated.currentIndex : firstUnanswered;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          questions: updated.questions,
          currentIndex: persistIndex,
          answers: updated.answers,
          startedAt: updated.startedAt,
          accumulatedMs: updated.accumulatedMs + (Date.now() - updated.resumedAt),
          skippedIds: updated.skippedIds,
          flaggedIds: updated.flaggedIds,
          savedAt: Date.now(),
        }));
      } catch { /* fail silently */ }

      return updated;
    });
  }, []);

  const skipQuestion = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const currentQ = prev.questions[prev.currentIndex];
      if (!currentQ) return prev;
      if (prev.currentIndex >= prev.questions.length - 1) return prev;

      const updated: SessionState = {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        questionStartedAt: Date.now(),
        skippedIds: prev.skippedIds.includes(currentQ.id)
          ? prev.skippedIds
          : [...prev.skippedIds, currentQ.id],
      };

      saveSessionToStorage(updated);
      return updated;
    });
  }, [saveSessionToStorage]);

  const goToQuestion = useCallback((index: number) => {
    setReviewIndex(null);
    setSession((prev) => {
      if (!prev) return prev;
      if (index < 0 || index >= prev.questions.length) return prev;
      if (index === prev.currentIndex) return prev;

      const updated: SessionState = {
        ...prev,
        currentIndex: index,
        questionStartedAt: Date.now(),
      };

      saveSessionToStorage(updated);
      return updated;
    });
  }, [saveSessionToStorage]);

  const snapshotTimer = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const now = Date.now();
      const banked = prev.accumulatedMs + (now - prev.resumedAt);
      const updated: SessionState = {
        ...prev,
        accumulatedMs: banked,
        resumedAt: now,
      };

      const firstUnanswered = updated.questions.findIndex(
        (q) => !updated.answers.some((a) => a.question_id === q.id)
      );
      const persistIndex = firstUnanswered === -1 ? updated.currentIndex : firstUnanswered;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          questions: updated.questions,
          currentIndex: persistIndex,
          answers: updated.answers,
          startedAt: updated.startedAt,
          accumulatedMs: banked,
          skippedIds: updated.skippedIds,
          flaggedIds: updated.flaggedIds,
          savedAt: now,
        }));
      } catch { /* fail silently */ }

      return updated;
    });
  }, []);

  const enterSummaryReview = useCallback((index: number) => {
    setReviewIndex(index);
  }, []);

  const loadSummary = useCallback((data: SessionSummary) => {
    setLastSummary(data);
  }, []);

  const elapsedMs = session ? session.accumulatedMs + (Date.now() - session.resumedAt) : 0;

  const unansweredCount = session
    ? session.questions.filter(
        (q) => !session.answers.find((a) => a.question_id === q.id)
      ).length
    : 0;

  const currentQuestion = session ? session.questions[session.currentIndex] : null;
  const isLastQuestion = session
    ? session.currentIndex === session.questions.length - 1
    : false;
  const progress = session ? session.currentIndex / session.questions.length : 0;

  const isReviewing = reviewIndex !== null;

  const displayQuestion: Question | null = isReviewing
    ? (
        session?.questions[reviewIndex!] ??
        lastSummary?.questions[reviewIndex!] ??
        null
      )
    : currentQuestion;

  const displayAnswer: SessionAnswer | null = isReviewing
    ? (
        session?.answers.find(
          (a) => a.question_id === session?.questions[reviewIndex!]?.id
        ) ??
        lastSummary?.answers.find(
          (a) => a.question_id === lastSummary?.questions[reviewIndex!]?.id
        ) ??
        null
      )
    : null;

  return (
    <QBankContext.Provider
      value={{
        questionCount,
        availableSystems,
        allDomainMeta,
        allQuestionMeta,
        session,
        currentQuestion,
        currentIndex: session?.currentIndex ?? 0,
        totalQuestions: session?.questions.length ?? 0,
        isLastQuestion,
        progress,
        startSession,
        submitAnswer,
        nextQuestion,
        endSession,
        resetSession,
        lastSummary,
        reviewIndex,
        setReviewIndex,
        enterSummaryReview,
        displayQuestion,
        displayAnswer,
        isReviewing,
        loadSummary,
        restoreSession,
        snapshotTimer,
        elapsedMs,
        flaggedIds,
        toggleFlag,
        isFlagLoading,
        skipQuestion,
        goToQuestion,
        unansweredCount,
      }}
    >
      {children}
    </QBankContext.Provider>
  );
};

export const useQBankContext = () => {
  const ctx = useContext(QBankContext);
  if (!ctx) throw new Error("useQBankContext must be used inside QBankProvider");
  return ctx;
};
