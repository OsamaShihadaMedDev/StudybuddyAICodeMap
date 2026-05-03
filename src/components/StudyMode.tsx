import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, BookOpen, Layers, ArrowLeft } from "lucide-react";
import { getTagColors } from "@/lib/tag-colors";
import type { Card } from "@/hooks/use-flashcard-deck";
import { useToast } from "@/hooks/use-toast";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import OutputSection from "@/components/OutputSection";
import {
  checkSheetUsage,
  incrementSheetUsage,
} from "@/hooks/use-usage-limit";

interface StudyModeProps {
  dueCards: Card[];
  onReview: (id: string, rating: "again" | "good" | "easy") => void;
  onClose: () => void;
}

function vibrate(rating: "again" | "good" | "easy" | "flip") {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      const ms = rating === "easy" ? 5 : rating === "good" ? 10 : rating === "again" ? 15 : 8;
      navigator.vibrate(ms);
    }
  } catch {
    // ignore
  }
}

const StudyMode = ({ dueCards, onReview, onClose }: StudyModeProps) => {
  // Snapshot session cards on mount
  const sessionCards = useMemo(() => dueCards.slice(), []);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [done, setDone] = useState(sessionCards.length === 0);
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainScope, setExplainScope] = useState<"card" | "topic">("card");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = sessionCards[index];
  const progress = sessionCards.length === 0 ? 0 : (reviewedCount / sessionCards.length) * 100;

  const handleFlip = () => {
    vibrate("flip");
    setFlipped(true);
  };

  const handleRate = (rating: "again" | "good" | "easy") => {
    if (!current) return;
    vibrate(rating);
    onReview(current.id, rating);
    const nextReviewed = reviewedCount + 1;
    setReviewedCount(nextReviewed);
    if (index + 1 >= sessionCards.length) {
      setDone(true);
    } else {
      setFlipped(false);
      setIndex(index + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Progress bar */}
      <div className="h-[2px] w-full bg-border/40">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Close button */}
      <div className="flex justify-end p-3">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close study mode">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        {done ? (
          <div className="text-center space-y-4 animate-fade-in">
            {sessionCards.length === 0 ? (
              <>
                <h2 className="text-2xl font-bold text-foreground">You're all caught up.</h2>
                <p className="text-muted-foreground">
                  New cards will appear here after your next study session.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground">Session complete</h2>
                <p className="text-muted-foreground">
                  {reviewedCount} {reviewedCount === 1 ? "card" : "cards"} reviewed. See you tomorrow.
                </p>
              </>
            )}
            <Button onClick={onClose} className="btn-gradient h-11 px-8 rounded-xl mt-4">
              Done
            </Button>
          </div>
        ) : current ? (
          <div className="w-full max-w-xl space-y-6">
            {/* Card with flip */}
            <div className="perspective" style={{ perspective: "1000px" }}>
              <div
                className={`flip-card-y-inner relative min-h-[280px] ${flipped ? "flipped" : ""}`}
              >
                {/* Front */}
                <div className="flip-face absolute inset-0 w-full">
                  <CardFace card={current} text={current.question} />
                </div>
                {/* Back */}
                <div className="flip-face flip-face-back absolute inset-0 w-full">
                  <CardFace card={current} text={current.answer} />
                </div>
              </div>
            </div>

            {!flipped ? (
              <div className="space-y-3">
                <Button
                  onClick={handleFlip}
                  className="w-full h-12 btn-gradient rounded-xl font-semibold"
                >
                  Show Answer
                </Button>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => { setExplainScope("topic"); setExplainOpen(true); }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Explain this topic
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => { setExplainScope("card"); setExplainOpen(true); }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Explain this card
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleRate("again")}
                  className="h-12 rounded-xl font-semibold bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 hover:text-red-500"
                >
                  Still learning
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate("good")}
                  className="h-12 rounded-xl font-semibold bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-500"
                >
                  Got it
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRate("easy")}
                  className="h-12 rounded-xl font-semibold bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-500"
                >
                  Easy
                </Button>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {index + 1} / {sessionCards.length}
            </p>
          </div>
        ) : null}
      </div>

      {current && (
        <ExplainPanel
          open={explainOpen}
          scope={explainScope}
          card={current}
          onClose={() => setExplainOpen(false)}
        />
      )}
    </div>
  );
};

const CardFace = ({ card, text }: { card: Card; text: string }) => {
  const tagColors = getTagColors(card.tag);
  return (
    <div className="glass-card rounded-2xl p-6 md:p-8 min-h-[280px] flex flex-col gap-5">
      <div>
        <span
          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${tagColors.bg} ${tagColors.text} ${tagColors.border}`}
        >
          {card.tag || "Card"}
        </span>
      </div>
      <p className="text-xl md:text-2xl font-medium leading-relaxed text-foreground flex-1">
        {text}
      </p>
    </div>
  );
};

export default StudyMode;

interface ExplainPanelProps {
  open: boolean;
  scope: "card" | "topic";
  card: Card;
  onClose: () => void;
}

const ExplainPanel = ({ open, scope, card, onClose }: ExplainPanelProps) => {
  const { toast } = useToast();
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!open || started) return;
    const sheet = checkSheetUsage();
    if (sheet.isLite) {
      // At limit — show toast and block
      toast({ title: "Daily study sheet limit reached", variant: "destructive" });
      setBlocked(true);
      onClose();
      return;
    }
    setStarted(true);
    setLoading(true);
    setOutput("");

    const run = async () => {
      try {
        incrementSheetUsage();
        const isCard = scope === "card";
        const body = isCard
          ? {
              notes: card.question + " — " + card.answer,
              focusCard: card.question,
              difficulty: "Basic",
              focus: "Deep Understanding",
              length: "Concise",
              examMode: "General",
              lite: false,
              quizMode: false,
            }
          : {
              notes: card.topic,
              difficulty: "Basic",
              focus: "Quick Revision",
              length: "Concise",
              examMode: "General",
              lite: false,
              quizMode: false,
            };
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-notes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(body),
          }
        );
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Error: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");
        const decoder = new TextDecoder();
        let textBuffer = "";
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                setOutput(fullText);
              }
            } catch {
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      } catch (e: any) {
        toast({
          title: "Error",
          description: e.message || "Failed to load explanation",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset when panel closes
  useEffect(() => {
    if (!open) {
      setStarted(false);
      setOutput("");
      setLoading(false);
      setBlocked(false);
    }
  }, [open]);

  if (blocked) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[15vh] z-50 bg-background rounded-t-2xl shadow-2xl flex flex-col"
      style={{
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <Button variant="ghost" size="sm" onClick={onClose} className="text-sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to review
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {loading && !output && (
            <div className="space-y-4 animate-fade-in">
              {[1, 2, 3].map((i) => (
                <UICard key={i} className="glass-card">
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </CardContent>
                </UICard>
              ))}
            </div>
          )}
          {output && (
            <OutputSection
              output={output}
              inputText={scope === "card" ? card.question : card.topic}
              modeInfo={{
                examMode: "General",
                difficulty: "Basic",
                focus: scope === "card" ? "Deep Understanding" : "Quick Revision",
                length: "Concise",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};