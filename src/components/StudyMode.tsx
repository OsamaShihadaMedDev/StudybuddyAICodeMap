import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, BookOpen, Layers, ArrowLeft } from "lucide-react";
import { getTagColors } from "@/lib/tag-colors";
import type { Card } from "@/hooks/use-flashcard-deck";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import { useToast } from "@/hooks/use-toast";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import OutputSection from "@/components/OutputSection";
import {
  checkSheetUsage,
  incrementSheetUsage,
} from "@/hooks/use-usage-limit";

function parseFlashcardsFromOutput(output: string, topic: string) {
  const idx = output.search(/FLASHCARDS/i);
  if (idx === -1) return [];
  let section = output.slice(idx).replace(/^FLASHCARDS[^\n]*\n?/i, "");
  const stop = section.search(/\n\s*REFERENCE NOTE\b/i);
  if (stop !== -1) section = section.slice(0, stop);
  const cards: { question: string; answer: string; tag: string; topic: string }[] = [];
  const regex = /Q\s*:\s*([\s\S]*?)\n\s*A\s*:\s*([\s\S]*?)(?=\n\s*Q\s*:|$)/gi;
  const truncatedTopic = topic.trim().slice(0, 60);
  let m: RegExpExecArray | null;
  while ((m = regex.exec(section)) !== null) {
    let question = m[1].trim();
    const answer = m[2].trim();
    if (!question || !answer) continue;
    let tag = "";
    const tagMatch = question.match(/^\s*\[([^\]]+)\]\s*/);
    if (tagMatch) {
      tag = tagMatch[1].trim();
      question = question.slice(tagMatch[0].length).trim();
    }
    cards.push({ question, answer, tag, topic: truncatedTopic });
  }
  return cards;
}

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
              <Button
                onClick={handleFlip}
                className="w-full h-12 btn-gradient rounded-xl font-semibold"
              >
                Show Answer
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => { setExplainScope("card"); setExplainOpen(true); }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Explain this card
                  </button>
                  <button
                    onClick={() => { setExplainScope("topic"); setExplainOpen(true); }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Explain this topic
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