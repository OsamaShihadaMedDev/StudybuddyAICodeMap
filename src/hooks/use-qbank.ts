import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Difficulty = "Easy" | "Medium" | "Hard";
export type OptionKey = "a" | "b" | "c" | "d" | "e";

export interface QuestionMedia {
  file_url: string;
  media_type: string;
  caption: string | null;
  attribution: string | null;
  license: string;
  display_context: 'stem' | 'explanation' | 'both';
  display_order: number;
}

export interface Question {
  id: string;
  subject: string;
  domain: string;
  topic: string;
  difficulty: Difficulty;
  competency: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_option: OptionKey;
  explanation: string;
  teaching_point: string;
  media?: QuestionMedia[];
}

export interface SessionAnswer {
  question_id: string;
  selected_option: OptionKey;
  is_correct: boolean;
  time_taken_ms: number;
}

export interface SessionState {
  questions: Question[];
  currentIndex: number;
  answers: SessionAnswer[];
  startedAt: number;
  questionStartedAt: number;
}

export function useQBank() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<SessionState | null>(null);

  const { data: questionCount } = useQuery({
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
      if (!session) return;
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
        prev
          ? {
              ...prev,
              answers: [...prev.answers, answer],
            }
          : null
      );

      return { is_correct, correct_option: question.correct_option };
    },
    [session]
  );

  const nextQuestion = useCallback(() => {
    setSession((prev) =>
      prev
        ? {
            ...prev,
            currentIndex: prev.currentIndex + 1,
            questionStartedAt: Date.now(),
          }
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
    const summary = {
      questions: session.questions.slice(0, session.answers.length),
      answers: session.answers,
      totalTime: Date.now() - session.startedAt,
      score: session.answers.filter((a) => a.is_correct).length,
      total: session.answers.length,
    };
    return summary;
  }, [session, user, saveAttemptsMutation]);

  const resetSession = useCallback(() => {
    setSession(null);
  }, []);

  const currentQuestion = session
    ? session.questions[session.currentIndex]
    : null;
  const isLastQuestion = session
    ? session.currentIndex === session.questions.length - 1
    : false;
  const progress = session
    ? session.currentIndex / session.questions.length
    : 0;

  return {
    questionCount: questionCount ?? 0,
    startSession,
    resetSession,
    session,
    currentQuestion,
    currentIndex: session?.currentIndex ?? 0,
    totalQuestions: session?.questions.length ?? 0,
    isLastQuestion,
    progress,
    submitAnswer,
    nextQuestion,
    endSession,
  };
}
