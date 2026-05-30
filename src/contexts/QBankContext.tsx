import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Question, QuestionMedia, OptionKey, SessionAnswer, SessionState } from "@/hooks/use-qbank";

interface SessionSummary {
  questions: Question[];
  answers: SessionAnswer[];
  totalTime: number;
  score: number;
  total: number;
}

interface QBankContextValue {
  questionCount: number;
  session: SessionState | null;
  currentQuestion: Question | null;
  currentIndex: number;
  totalQuestions: number;
  isLastQuestion: boolean;
  progress: number;
  startSession: () => Promise<void>;
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

  const fetchQuestions = useCallback(async (): Promise<Question[]> => {
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, subject, domain, topic, difficulty, competency, question_text, option_a, option_b, option_c, option_d, option_e, correct_option, explanation, teaching_point"
      )
      .eq("is_active", true);
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

    return questions;
  }, []);

  const startSession = useCallback(async () => {
    setReviewIndex(null);
    const questions = await fetchQuestions();
    setSession({
      questions,
      currentIndex: 0,
      answers: [],
      startedAt: Date.now(),
      questionStartedAt: Date.now(),
    });
  }, [fetchQuestions]);

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
      setSession((prev) =>
        prev ? { ...prev, answers: [...prev.answers, answer] } : null
      );
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
  }, []);

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
    const totalTime = endedAt - session.startedAt;

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
    };

    setLastSummary(summary);
    setSession(null);
    setReviewIndex(null);

    if (sessionId) {
      navigate(`/qbank/summary?session=${sessionId}`);
    } else {
      navigate("/qbank/summary");
    }

    return summary;
  }, [session, user, saveAttemptsMutation, navigate]);

  const resetSession = useCallback(() => {
    setSession(null);
  }, []);

  const enterSummaryReview = useCallback((index: number) => {
    setReviewIndex(index);
  }, []);

  const loadSummary = useCallback((data: SessionSummary) => {
    setLastSummary(data);
  }, []);

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
