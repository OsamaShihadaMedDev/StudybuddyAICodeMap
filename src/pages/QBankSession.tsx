import { useState, useEffect, useCallback, useRef } from "react";
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
import StudyBuddyLoader from "@/components/StudyBuddyLoader";
import { useQBankContext } from "@/contexts/QBankContext";
import type { OptionKey, QuestionMedia } from "@/hooks/use-qbank";

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

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
    <div className="hidden md:flex flex-col items-center gap-1.5 w-8 shrink-0 pt-1">
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
  onOpenLightbox: (items: QuestionMedia[], index: number) => void;
  domain: string;
}

const ExplanationContent = ({
  explanation,
  teachingPoint,
  difficulty,
  isCorrect,
  media,
  onOpenLightbox,
  domain,
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
      <MediaBlock media={media} context="explanation" onOpen={onOpenLightbox} />
    )}

    <div>
      <p className="text-[10px] font-bold tracking-[0.12em] text-primary uppercase mb-2">
        Explanation
      </p>
      <p
        className="text-xs leading-[1.8] text-muted-foreground whitespace-pre-line [&_strong]:text-foreground [&_strong]:font-bold"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(explanation) }}
      />
    </div>

    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1">
      <p className="text-[10px] font-bold tracking-[0.12em] text-primary uppercase">
        Key teaching point
      </p>
      <p
        className="text-xs leading-relaxed text-foreground/80"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(teachingPoint) }}
      />
    </div>

    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/50 uppercase">
        Domain
      </span>
      <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
        {domain}
      </span>
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
  onOpen: (items: QuestionMedia[], index: number) => void;
}

const MediaBlock = ({ media, context, onOpen }: MediaBlockProps) => {
  const items = media.filter(
    (m) => m.display_context === context || m.display_context === 'both'
  );

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((m, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border/40 bg-white">
          <img
            src={m.file_url}
            alt={m.caption ?? m.media_type}
            className="mx-auto block max-h-[380px] w-auto max-w-full object-contain cursor-zoom-in"
            onClick={() => onOpen(items, i)}
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

interface QuestionNavigatorProps {
  total: number;
  currentIndex: number;
  answers: { question_id: string; is_correct: boolean }[];
  questions: { id: string }[];
  reviewIndex: number | null;
  onReview: (index: number) => void;
  displayedNumber: number;
}

const QuestionNavigator = ({
  total,
  currentIndex,
  answers,
  questions,
  reviewIndex,
  onReview,
  displayedNumber,
}: QuestionNavigatorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
      >
        Q{displayedNumber} of {total}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border/60 rounded-t-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex flex-col items-center pt-3 pb-2 px-4">
          <div className="w-10 h-1 rounded-full bg-border/60 mb-3" />
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-foreground">
              Questions ({total})
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 px-4 pb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500/40" />
            <span className="text-[10px] text-muted-foreground">Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/40" />
            <span className="text-[10px] text-muted-foreground">Incorrect</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted/30 border border-border/20" />
            <span className="text-[10px] text-muted-foreground">Unanswered</span>
          </div>
        </div>

        <div className="px-4 pb-8 max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: total }, (_, i) => {
              const q = questions[i];
              const answer = q ? answers.find((a) => a.question_id === q.id) : undefined;
              const isAnswered = !!answer;
              const isCurrent = i === currentIndex && reviewIndex === null;
              const isReviewingThis = i === reviewIndex;
              const isCorrect = answer?.is_correct;

              let bg = "bg-muted/30 text-muted-foreground/40 border-border/20";
              if (isCurrent || isReviewingThis) {
                bg = "bg-primary/20 text-primary border-primary/50";
              } else if (isAnswered) {
                bg = isCorrect
                  ? "bg-green-500/20 text-green-400 border-green-500/40"
                  : "bg-red-500/20 text-red-400 border-red-500/40";
              }

              return (
                <button
                  key={i}
                  disabled={!isAnswered && !isCurrent}
                  onClick={() => {
                    if (isAnswered) {
                      onReview(i);
                      setOpen(false);
                    }
                  }}
                  className={`aspect-square rounded-lg border text-[10px] font-bold flex items-center justify-center transition-opacity ${bg} ${
                    isAnswered ? "cursor-pointer hover:opacity-80" : "cursor-default"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

interface ReviewExplanationDrawerProps {
  explanation: string;
  teachingPoint: string;
  difficulty: Difficulty;
  isCorrect: boolean;
  media?: QuestionMedia[];
  onOpenLightbox: (items: QuestionMedia[], index: number) => void;
  domain: string;
}

const ReviewExplanationDrawer = ({
  explanation,
  teachingPoint,
  difficulty,
  isCorrect,
  media,
  onOpenLightbox,
  domain,
}: ReviewExplanationDrawerProps) => {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={`relative bg-card border-t border-border/60 rounded-t-2xl transition-transform duration-300 ease-out ${
        open ? "translate-y-0" : "translate-y-[calc(100%-48px)]"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex flex-col items-center gap-1 pt-3 pb-2 px-4"
      >
        <div className="w-10 h-1 rounded-full bg-border/60" />
        <div className="flex items-center justify-between w-full mt-1">
          <span className="text-[11px] font-bold tracking-[0.1em] text-primary uppercase">
            Explanation
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold ${
                isCorrect ? "text-green-400" : "text-red-400"
              }`}
            >
              {isCorrect ? "✓ Correct" : "✗ Incorrect"}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                open ? "rotate-0" : "rotate-180"
              }`}
            />
          </div>
        </div>
      </button>

      <div className="px-4 pb-8 max-h-[55vh] overflow-y-auto">
        <ExplanationContent
          explanation={explanation}
          teachingPoint={teachingPoint}
          difficulty={difficulty}
          isCorrect={isCorrect}
          media={media}
          onOpenLightbox={onOpenLightbox}
          domain={domain}
        />
      </div>
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
    restoreSession,
  } = useQBankContext();

  const restoredRef = useRef(false);

  const [searchParams] = useSearchParams();
  const sessionIdParam = searchParams.get("session");
  const reviewParam = searchParams.get("review");

  const [answerState, setAnswerState] = useState<AnswerState>({ status: "unanswered" });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxItems, setLightboxItems] = useState<QuestionMedia[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const lightboxOpen = lightboxItems.length > 0;
  const currentLightboxItem = lightboxItems[lightboxIndex] ?? null;

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightboxItems([]); setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }
      if (e.key === 'ArrowRight') { setLightboxIndex((i) => Math.min(i + 1, lightboxItems.length - 1)); setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }
      if (e.key === 'ArrowLeft') { setLightboxIndex((i) => Math.max(i - 1, 0)); setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, lightboxItems.length]);

  const openLightbox = useCallback((items: QuestionMedia[], idx: number) => {
    setLightboxItems(items);
    setLightboxIndex(idx);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (reviewParam !== null) {
      const idx = parseInt(reviewParam, 10);
      if (!isNaN(idx)) setReviewIndex(idx);
    }
  }, []);

  useEffect(() => {
    if (!restoredRef.current) {
      restoredRef.current = true;

      if (session) return;

      const didRestore = restoreSession();

      if (!didRestore && !sessionIdParam && !lastSummary) {
        navigate("/qbank");
      }

      return;
    }

    if (!session && !sessionIdParam && !lastSummary) {
      navigate("/qbank");
    }
  }, [session, sessionIdParam, lastSummary, navigate, restoreSession]);

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

  if (!displayQuestion) {
    return (
      <DashboardLayout wide>
        <StudyBuddyLoader message="Loading question..." />
      </DashboardLayout>
    );
  }

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
      {isReviewing && (() => {
        const fromSummary = !session && !!lastSummary;
        const hasNext = reviewIndex! + 1 < effectiveTotalQuestions;
        return (
          <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
            <button
              onClick={() => {
                if (fromSummary) {
                  setReviewIndex(null);
                  navigate("/qbank/summary");
                } else {
                  setReviewIndex(null);
                }
              }}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {fromSummary ? "← Back to Summary" : "← Back to current question"}
            </button>
            <span className="text-xs font-semibold text-primary">
              Reviewing Q{reviewIndex! + 1} of {effectiveTotalQuestions} — read only
            </span>
            <button
              onClick={() => {
                if (hasNext) {
                  setReviewIndex(reviewIndex! + 1);
                } else if (fromSummary) {
                  setReviewIndex(null);
                  navigate("/qbank/summary");
                } else {
                  setReviewIndex(null);
                }
              }}
              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {hasNext ? "Next →" : fromSummary ? "← Back to Summary" : "← Back to current question"}
            </button>
          </div>
        );
      })()}

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
              <span className="hidden md:inline-flex items-center rounded-full border border-border/40 bg-muted/20 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Q{displayedNumber} of {effectiveTotalQuestions}
              </span>

              {effectiveTotalQuestions > 0 && (
                <QuestionNavigator
                  total={effectiveTotalQuestions}
                  currentIndex={currentIndex}
                  answers={sessionAnswers}
                  questions={sessionQuestions}
                  reviewIndex={reviewIndex}
                  onReview={(i) => setReviewIndex(i)}
                  displayedNumber={displayedNumber}
                />
              )}
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
              <MediaBlock media={displayQuestion!.media} context="stem" onOpen={openLightbox} />
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
                  onOpenLightbox={openLightbox}
                  domain={displayQuestion!.domain}
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
                onOpenLightbox={openLightbox}
                domain={displayQuestion!.domain}
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

      {isReviewing && effectiveAnswerState.status === "answered" && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40">
          <ReviewExplanationDrawer
            explanation={displayQuestion!.explanation}
            teachingPoint={displayQuestion!.teaching_point}
            difficulty={displayQuestion!.difficulty as Difficulty}
            isCorrect={effectiveAnswerState.isCorrect}
            media={displayQuestion!.media}
            onOpenLightbox={openLightbox}
            domain={displayQuestion!.domain}
          />
        </div>
      )}

      {lightboxOpen && currentLightboxItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85"
          onClick={() => { setLightboxItems([]); setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light leading-none z-10"
            onClick={() => { setLightboxItems([]); setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }}
            aria-label="Close"
          >
            ×
          </button>

          {lightboxItems.length > 1 && lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl font-light z-10 px-3 py-2"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => i - 1);
                setZoomScale(1);
                setZoomOffset({ x: 0, y: 0 });
              }}
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          <div
            className="flex flex-row items-stretch gap-3 px-16"
            style={{ maxWidth: '95vw', maxHeight: '88vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {currentLightboxItem.caption && (
              <div
                className="w-48 shrink-0 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 flex flex-col justify-center"
                style={{ alignSelf: 'stretch' }}
              >
                <p className="text-[10px] font-bold tracking-[0.12em] text-white/50 uppercase mb-2">
                  Description
                </p>
                <p className="text-white/90 text-xs leading-relaxed">
                  {currentLightboxItem.caption}
                </p>
                {currentLightboxItem.license === 'CC-BY' && currentLightboxItem.attribution && (
                  <p className="mt-3 text-white/40 text-[10px] leading-relaxed border-t border-white/10 pt-2">
                    {currentLightboxItem.attribution}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-3 min-w-0">
              <div
                className="relative overflow-hidden rounded-lg flex items-center justify-center bg-white"
                style={{
                  width: currentLightboxItem.caption ? 'min(65vw, 900px)' : 'min(85vw, 1100px)',
                  height: 'min(72vh, 700px)',
                  cursor: zoomScale > 1 ? 'grab' : 'default',
                }}
                onMouseDown={(e) => {
                  if (zoomScale <= 1) return;
                  e.preventDefault();
                  const startX = e.clientX - zoomOffset.x;
                  const startY = e.clientY - zoomOffset.y;
                  const el = e.currentTarget;
                  el.style.cursor = 'grabbing';
                  const onMove = (ev: MouseEvent) => {
                    setZoomOffset({ x: ev.clientX - startX, y: ev.clientY - startY });
                  };
                  const onUp = () => {
                    el.style.cursor = zoomScale > 1 ? 'grab' : 'default';
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              >
                <img
                  src={currentLightboxItem.file_url}
                  alt={currentLightboxItem.caption ?? currentLightboxItem.media_type}
                  className="select-none rounded-lg shadow-2xl"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    transform: `scale(${zoomScale}) translate(${zoomOffset.x / zoomScale}px, ${zoomOffset.y / zoomScale}px)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                  draggable={false}
                />
              </div>

              <div
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-white/50 text-xs select-none">−</span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.1}
                  value={zoomScale}
                  onChange={(e) => {
                    const next = parseFloat(e.target.value);
                    setZoomScale(next);
                    if (next === 1) setZoomOffset({ x: 0, y: 0 });
                  }}
                  className="w-32 accent-white cursor-pointer"
                />
                <span className="text-white/50 text-xs select-none">+</span>
                <span className="text-white/40 text-[10px] w-8 text-center select-none">
                  {zoomScale.toFixed(1)}×
                </span>
                {zoomScale > 1 && (
                  <button
                    className="text-white/50 hover:text-white text-[10px] underline ml-1"
                    onClick={() => { setZoomScale(1); setZoomOffset({ x: 0, y: 0 }); }}
                  >
                    reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {lightboxItems.length > 1 && lightboxIndex < lightboxItems.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl font-light z-10 px-3 py-2"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => i + 1);
                setZoomScale(1);
                setZoomOffset({ x: 0, y: 0 });
              }}
              aria-label="Next"
            >
              ›
            </button>
          )}

          {lightboxItems.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {lightboxItems.map((_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === lightboxIndex ? 'bg-white' : 'bg-white/30'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                    setZoomScale(1);
                    setZoomOffset({ x: 0, y: 0 });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default QBankSession;
