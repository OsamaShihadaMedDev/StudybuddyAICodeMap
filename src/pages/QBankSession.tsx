import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FlaskConical,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useQBankContext } from "@/contexts/QBankContext";
import type { OptionKey, QuestionMedia } from "@/hooks/use-qbank";

type AnswerState =
  | { status: "unanswered" }
  | {
      status: "answered";
      selected: OptionKey;
      correct: OptionKey;
      isCorrect: boolean;
    };

type Difficulty = "Easy" | "Medium" | "Hard";

interface QuestionCounterProps {
  total: number;
  currentIndex: number;
  answers: { question_id: string; is_correct: boolean }[];
  questions: { id: string }[];
  reviewIndex: number | null;
  onReview: (index: number) => void;
}

const QuestionCounter = ({
  total,
  currentIndex,
  answers,
  questions,
  reviewIndex,
  onReview,
}: QuestionCounterProps) => {
  return (
    <div className="hidden lg:flex flex-col items-center gap-1.5 w-8 shrink-0 pt-1">
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-160px)] scrollbar-none">
        {Array.from({ length: total }, (_, i) => {
          const q = questions[i];
          const answer = q ? answers.find((a) => a.question_id === q.id) : undefined;
          const isAnswered = !!answer;
          const isCurrent = i === currentIndex && reviewIndex === null;
          const isReviewing = i === reviewIndex;
          const isCorrect = answer?.is_correct;

          let bg = "bg-muted/30 text-muted-foreground/40";
          let border = "border-border/20";
          let cursor = "cursor-default";

          if (isCurrent) {
            bg = "bg-primary/20 text-primary";
            border = "border-primary/50";
          } else if (isReviewing) {
            bg = "bg-primary/30 text-primary";
            border = "border-primary";
          } else if (isAnswered) {
            if (isCorrect) {
              bg = "bg-green-500/20 text-green-400";
              border = "border-green-500/40";
            } else {
              bg = "bg-red-500/20 text-red-400";
              border = "border-red-500/40";
            }
            cursor = "cursor-pointer hover:opacity-80 transition-opacity";
          }

          return (
            <button
              key={i}
              disabled={!isAnswered && !isCurrent}
              onClick={() => (isAnswered ? onReview(i) : undefined)}
              className={`w-7 h-7 rounded-lg border text-[10px] font-bold flex items-center justify-center shrink-0 ${bg} ${border} ${cursor}`}
              title={isAnswered ? `Q${i + 1} — click to review` : `Q${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const PULSE_CONFIG: Record<Difficulty, { bars: number; color: string; label: string }> = {
  Easy:   { bars: 1, color: "#22c55e", label: "Easy"   },
  Medium: { bars: 2, color: "#f59e0b", label: "Medium" },
  Hard:   { bars: 3, color: "#ef4444", label: "Hard"   },
};

const StethoscopePulse = ({ difficulty }: { difficulty: Difficulty }) => {
  const cfg = PULSE_CONFIG[difficulty];

  const heights = [8, 16, 24];
  const activeHeights = [8, 18, 28];

  return (
    <div className="flex items-center gap-2">
      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground/60" />

      <div className="flex items-end gap-[3px]" aria-label={`Difficulty: ${cfg.label}`}>
        {[0, 1, 2].map((i) => {
          const isActive = i < cfg.bars;
          const h = isActive ? activeHeights[i] : heights[i];
          return (
            <div
              key={i}
              style={{
                height: `${h}px`,
                width: "4px",
                borderRadius: "2px",
                backgroundColor: isActive ? cfg.color : "hsl(var(--muted-foreground) / 0.2)",
                transition: "height 0.3s ease, background-color 0.3s ease",
              }}
            />
          );
        })}
      </div>

      <span
        className="text-[11px] font-semibold"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
};

interface ExplanationContentProps {
  explanation: string;
  teachingPoint: string;
  difficulty: Difficulty;
  isCorrect: boolean;
  media?: QuestionMedia[];
}

const ExplanationContent = ({
  explanation,
  teachingPoint,
  difficulty,
  isCorrect,
  media,
}: ExplanationContentProps) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
          isCorrect
            ? "bg-green-950/60 text-green-400 border border-green-500/30"
            : "bg-red-950/60 text-red-400 border border-red-500/30"
        }`}
      >
        {isCorrect ? (
          <CheckCircle className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
        {isCorrect ? "Correct" : "Incorrect"}
      </div>
      <StethoscopePulse difficulty={difficulty} />
    </div>

    <div className="h-px bg-border/40" />

    {media && media.length > 0 && (
      <MediaBlock media={media} context="explanation" />
    )}

    <div>
      <p className="text-[10px] font-bold tracking-[0.12em] text-primary uppercase mb-2">
        Explanation
      </p>
      <p className="text-xs leading-[1.8] text-muted-foreground whitespace-pre-line">
        {explanation}
      </p>
    </div>

    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
      <p className="text-[10px] font-bold tracking-[0.12em] text-primary uppercase">
        Key teaching point
      </p>
      <p className="text-xs leading-relaxed text-foreground/80">
        {teachingPoint}
      </p>
    </div>
  </div>
);

interface OptionTileProps {
  letter: OptionKey;
  text: string;
  answerState: AnswerState;
  onSelect: (key: OptionKey) => void;
}

const LETTER_LABELS: Record<OptionKey, string> = {
  a: "A", b: "B", c: "C", d: "D", e: "E",
};

const OptionTile = ({ letter, text, answerState, onSelect }: OptionTileProps) => {
  const isAnswered = answerState.status === "answered";
  const isSelected = isAnswered && answerState.selected === letter;
  const isCorrect  = isAnswered && answerState.correct === letter;
  const isWrong    = isSelected && !isCorrect;
  const isDimmed   = isAnswered && !isSelected && !isCorrect;

  const tileStyle = isCorrect
    ? "border-green-500/70 bg-green-950/40 text-green-300"
    : isWrong
    ? "border-red-500/70 bg-red-950/40 text-red-300"
    : isDimmed
    ? "border-border/20 bg-card/20 text-muted-foreground/40 cursor-default"
    : "border-border/60 bg-card hover:border-primary/50 hover:bg-primary/5 text-foreground cursor-pointer";

  const letterStyle = isCorrect
    ? "bg-green-500 text-white"
    : isWrong
    ? "bg-red-500 text-white"
    : isDimmed
    ? "bg-muted/30 text-muted-foreground/40"
    : "bg-muted/50 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary";

  return (
    <button
      onClick={() => !isAnswered && onSelect(letter)}
      disabled={isAnswered}
      className={`group w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 ${tileStyle}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${letterStyle}`}>
        {LETTER_LABELS[letter]}
      </span>
      <span className="text-sm leading-relaxed pt-0.5">{text}</span>
    </button>
  );
};

interface MediaBlockProps {
  media: QuestionMedia[];
  context: 'stem' | 'explanation';
}

const MediaBlock = ({ media, context }: MediaBlockProps) => {
  const items = media.filter(
    (m) => m.display_context === context || m.display_context === 'both'
  );

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((m, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border/40 bg-muted/20">
          <img
            src={m.file_url}
            alt={m.caption ?? m.media_type}
            className="w-full h-auto block"
          />
          {(m.caption || (m.license === 'CC-BY' && m.attribution)) && (
            <div className="px-3 py-2 space-y-0.5">
              {m.caption && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {m.caption}
                </p>
              )}
              {m.license === 'CC-BY' && m.attribution && (
                <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                  {m.attribution}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const QBankSession = () => {
  const navigate = useNavigate();
  const {
    session,
    currentIndex,
    totalQuestions,
    isLastQuestion,
    submitAnswer,
    nextQuestion,
    endSession,
    reviewIndex,
    setReviewIndex,
    displayQuestion,
    displayAnswer,
    isReviewing,
    lastSummary,
  } = useQBankContext();

  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get("session");
  const reviewParam = searchParams.get("review");

  const [answerState, setAnswerState] = useState<AnswerState>({ status: "unanswered" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (reviewParam !== null) {
      const idx = parseInt(reviewParam, 10);
      if (!isNaN(idx)) setReviewIndex(idx);
    }
  }, []);

  useEffect(() => {
    if (!session && !sessionIdParam && !lastSummary) {
      navigate("/qbank");
    }
  }, [session, sessionIdParam, lastSummary, navigate]);

  useEffect(() => {
    setAnswerState({ status: "unanswered" });
    setDrawerOpen(false);
  }, [currentIndex]);

  const handleSelect = useCallback(
    (key: OptionKey) => {
      if (isReviewing) return;
      if (answerState.status === "answered") return;
      const result = submitAnswer(key);
      if (!result) return;
      setAnswerState({
        status: "answered",
        selected: key,
        correct: result.correct_option,
        isCorrect: result.is_correct,
      });
      setTimeout(() => setDrawerOpen(true), 300);
    },
    [isReviewing, answerState, submitAnswer]
  );

  const handleNext = useCallback(async () => {
    setDrawerOpen(false);
    if (isLastQuestion) {
      await endSession();
    } else {
      nextQuestion();
    }
  }, [isLastQuestion, endSession, nextQuestion]);

  const sessionQuestions = session?.questions ?? lastSummary?.questions ?? [];
  const sessionAnswers = session?.answers ?? lastSummary?.answers ?? [];
  const effectiveTotalQuestions = session ? totalQuestions : lastSummary?.total ?? 0;

  if (!displayQuestion) return null;

  const effectiveAnswerState: AnswerState =
    isReviewing && displayAnswer && displayQuestion
      ? {
          status: "answered",
          selected: displayAnswer.selected_option as OptionKey,
          correct: displayQuestion.correct_option,
          isCorrect: displayAnswer.is_correct,
        }
      : answerState;

  const isAnsweredEffective = effectiveAnswerState.status === "answered";

  const options: { key: OptionKey; text: string }[] = [
    { key: "a", text: displayQuestion!.option_a },
    { key: "b", text: displayQuestion!.option_b },
    { key: "c", text: displayQuestion!.option_c },
    { key: "d", text: displayQuestion!.option_d },
    { key: "e", text: displayQuestion!.option_e },
  ];

  const displayedNumber = (isReviewing ? reviewIndex! : currentIndex) + 1;

  return (
    <DashboardLayout wide>
      {isReviewing && (
        <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-xs font-semibold text-primary">
            Reviewing Q{reviewIndex! + 1} — read only
          </span>
          <button
            onClick={() => setReviewIndex(null)}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            ← Back to current question
          </button>
        </div>
      )}

      <div className="flex gap-3 items-start">
        {effectiveTotalQuestions > 0 && (
          <QuestionCounter
            total={effectiveTotalQuestions}
            currentIndex={currentIndex}
            answers={sessionAnswers}
            questions={sessionQuestions}
            reviewIndex={reviewIndex}
            onReview={(i) => setReviewIndex(i)}
          />
        )}

        <div className="flex-1 min-w-0 flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                {displayQuestion!.subject}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                {displayQuestion!.domain}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/20 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Q{displayedNumber} of {totalQuestions}
              </span>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/50 uppercase mb-3">
                Clinical vignette
              </p>
              <p className="text-sm leading-[1.9] text-foreground whitespace-pre-line">
                {displayQuestion!.question_text}
              </p>
            </div>

            {displayQuestion!.media && displayQuestion!.media.length > 0 && (
              <MediaBlock media={displayQuestion!.media} context="stem" />
            )}

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground/50 uppercase">
                Select one answer
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            <div className="space-y-2.5">
              {options.map(({ key, text }) => (
                <OptionTile
                  key={key}
                  letter={key}
                  text={text}
                  answerState={effectiveAnswerState}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {isAnsweredEffective && !isReviewing && (
              <div className="flex justify-end pt-1 animate-fade-in">
                <Button
                  onClick={handleNext}
                  className="btn-gradient h-11 px-6 rounded-xl font-semibold text-sm gap-2"
                >
                  {isLastQuestion ? (
                    <>Finish Session <ChevronRight className="h-4 w-4" /></>
                  ) : (
                    <>Next Question <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div
            className={`hidden lg:flex flex-col w-80 xl:w-96 shrink-0 transition-all duration-300 ${
              isAnsweredEffective ? "opacity-100 translate-x-0" : "opacity-0 pointer-events-none translate-x-4"
            }`}
          >
            {isAnsweredEffective && effectiveAnswerState.status === "answered" && (
              <div className="glass-card rounded-2xl p-5 border border-border/50 animate-fade-in sticky top-6">
                <ExplanationContent
                  explanation={displayQuestion!.explanation}
                  teachingPoint={displayQuestion!.teaching_point}
                  difficulty={displayQuestion!.difficulty as Difficulty}
                  isCorrect={effectiveAnswerState.status === "answered" && effectiveAnswerState.isCorrect}
                  media={displayQuestion!.media}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {isAnsweredEffective && effectiveAnswerState.status === "answered" && !isReviewing && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-50">
          <div
            className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
              drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setDrawerOpen(false)}
          />

          <div
            className={`relative bg-card border-t border-border/60 rounded-t-2xl transition-transform duration-300 ease-out ${
              drawerOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <button
              onClick={() => setDrawerOpen((o) => !o)}
              className="w-full flex flex-col items-center gap-1 pt-3 pb-2 px-4"
            >
              <div className="w-10 h-1 rounded-full bg-border/60" />
              <div className="flex items-center justify-between w-full mt-1">
                <span className="text-[11px] font-bold tracking-[0.1em] text-primary uppercase">
                  Explanation
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    drawerOpen ? "rotate-0" : "rotate-180"
                  }`}
                />
              </div>
            </button>

            <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
              <ExplanationContent
                explanation={displayQuestion!.explanation}
                teachingPoint={displayQuestion!.teaching_point}
                difficulty={displayQuestion!.difficulty as Difficulty}
                isCorrect={effectiveAnswerState.status === "answered" && effectiveAnswerState.isCorrect}
                media={displayQuestion!.media}
              />

              <div className="pt-4">
                <Button
                  onClick={handleNext}
                  className="btn-gradient w-full h-12 rounded-xl font-semibold text-sm gap-2"
                >
                  {isLastQuestion ? (
                    <>Finish Session <ChevronRight className="h-4 w-4" /></>
                  ) : (
                    <>Next Question <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default QBankSession;
