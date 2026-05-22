import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Question, OptionKey, SessionAnswer, SessionState } from "@/hooks/use-qbank";

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
}

const QBankContext = createContext<QBankContextValue | null>(null);

export const QBankProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);

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
    const arr = [...(data ?? [])] as Question[];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const startSession = useCallback(async () => {
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
    },
  });

  const endSession = useCallback(async () => {
    if (!session) return null;
    if (user?.id && session.answers.length > 0) {
      await saveAttemptsMutation.mutateAsync(session.answers);
    }
    const summary: SessionSummary = {
      questions: session.questions.slice(0, session.answers.length),
      answers: session.answers,
      totalTime: Date.now() - session.startedAt,
      score: session.answers.filter((a) => a.is_correct).length,
      total: session.answers.length,
    };
    setLastSummary(summary);
    setSession(null);
    return summary;
  }, [session, user, saveAttemptsMutation]);

  const resetSession = useCallback(() => {
    setSession(null);
  }, []);

  const currentQuestion = session ? session.questions[session.currentIndex] : null;
  const isLastQuestion = session
    ? session.currentIndex === session.questions.length - 1
    : false;
  const progress = session ? session.currentIndex / session.questions.length : 0;

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
