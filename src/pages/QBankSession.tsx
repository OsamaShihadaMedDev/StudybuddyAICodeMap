import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import type { OptionKey } from "@/hooks/use-qbank";

type AnswerState =
  | { status: "unanswered" }
  | {
      status: "answered";
      selected: OptionKey;
      correct: OptionKey;
      isCorrect: boolean;
    };

type Difficulty = "Easy" | "Medium" | "Hard";

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
}

const ExplanationContent = ({
  explanation,
  teachingPoint,
  difficulty,
  isCorrect,
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

const ProgressBar = ({ current, total }: { current: number; total: number }) => {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const QBankSession = () => {
  const navigate = useNavigate();
  const {
    session,
    currentQuestion,
    currentIndex,
    totalQuestions,
    isLastQuestion,
    submitAnswer,
    nextQuestion,
    endSession,
  } = useQBankContext();

  const [answerState, setAnswerState] = useState<AnswerState>({ status: "unanswered" });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!session) navigate("/qbank");
  }, [session, navigate]);

  useEffect(() => {
    setAnswerState({ status: "unanswered" });
    setDrawerOpen(false);
  }, [currentIndex]);

  const handleSelect = useCallback(
    (key: OptionKey) => {
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
    [answerState, submitAnswer]
  );

  const handleNext = useCallback(async () => {
    setDrawerOpen(false);
    if (isLastQuestion) {
      await endSession();
      navigate("/qbank/summary");
    } else {
      nextQuestion();
    }
  }, [isLastQuestion, endSession, nextQuestion, navigate]);

  if (!currentQuestion) return null;

  const isAnswered = answerState.status === "answered";
  const questionNumber = currentIndex + 1;

  const options: { key: OptionKey; text: string }[] = [
    { key: "a", text: currentQuestion.option_a },
    { key: "b", text: currentQuestion.option_b },
    { key: "c", text: currentQuestion.option_c },
    { key: "d", text: currentQuestion.option_d },
    { key: "e", text: currentQuestion.option_e },
  ];

  return (
    <DashboardLayout wide>
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground hidden md:inline">
                Question {questionNumber} of {totalQuestions}
              </span>
              <span className="text-xs font-bold text-muted-foreground md:hidden">
                {questionNumber} / {totalQuestions}
              </span>
            </div>
          </div>
          <ProgressBar current={currentIndex} total={totalQuestions} />
        </div>

        <div className="flex gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                {currentQuestion.subject}
              </span>
              <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                {currentQuestion.domain}
              </span>
            </div>

            <div className="glass-card rounded-2xl p-5">
              <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/50 uppercase mb-3">
                Clinical vignette
              </p>
              <p className="text-sm leading-[1.9] text-foreground whitespace-pre-line">
                {currentQuestion.question_text}
              </p>
            </div>

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
                  answerState={answerState}
                  onSelect={handleSelect}
                />
              ))}
            </div>

            {isAnswered && (
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
              isAnswered ? "opacity-100 translate-x-0" : "opacity-0 pointer-events-none translate-x-4"
            }`}
          >
            {isAnswered && answerState.status === "answered" && (
              <div className="glass-card rounded-2xl p-5 border border-border/50 animate-fade-in sticky top-6">
                <ExplanationContent
                  explanation={currentQuestion.explanation}
                  teachingPoint={currentQuestion.teaching_point}
                  difficulty={currentQuestion.difficulty as Difficulty}
                  isCorrect={answerState.isCorrect}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {isAnswered && answerState.status === "answered" && (
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
                explanation={currentQuestion.explanation}
                teachingPoint={currentQuestion.teaching_point}
                difficulty={currentQuestion.difficulty as Difficulty}
                isCorrect={answerState.isCorrect}
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
