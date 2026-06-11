import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Layers, Play, Repeat, Settings2, Shuffle, X } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FlashcardsGenerator, { type GeneratedCard } from "@/components/FlashcardsGenerator";
import DeckList from "@/components/DeckList";
import { CardFace, ExplainPanel } from "@/components/StudyMode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFlashcardDeck, makeCardId, type Card as DeckCard } from "@/hooks/use-flashcard-deck";
import { useToast } from "@/hooks/use-toast";

const RECENT_DECK_LIMIT = 5;

type RightPhase = "idle" | "generating" | "reviewing";
type Rating = "again" | "good" | "easy";

const DueCardsReminderStrip = ({
  dueCount,
  onStartReview,
}: {
  dueCount: number;
  onStartReview: () => void;
}) => (
  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 animate-fade-in">
    <div className="flex items-center gap-2 min-w-0">
      <Repeat className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-xs text-foreground">
        <span key={dueCount} className="flip-number font-semibold tabular-nums text-primary">
          {dueCount}
        </span>{" "}
        {dueCount === 1 ? "card" : "cards"} due today
      </span>
    </div>
    <Button
      onClick={onStartReview}
      size="sm"
      className="h-7 rounded-md px-3 text-xs font-medium shrink-0"
    >
      <Play className="h-3 w-3 mr-1" />
      Review
    </Button>
  </div>
);

function vibrate(rating: Rating | "flip") {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      const ms = rating === "easy" ? 5 : rating === "good" ? 10 : rating === "again" ? 15 : 8;
      navigator.vibrate(ms);
    }
  } catch {
    // ignore
  }
}

const Flashcards = () => {
  const { toast } = useToast();
  const { allCards, dueCards, reviewCard, deleteCard, stats } = useFlashcardDeck();

  // ── Split-pane state ──────────────────────────────────────────────────
  const [rightPhase, setRightPhase] = useState<RightPhase>("idle");
  const [genTopic, setGenTopic] = useState("");
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  // ── "Explain this" panel state ────────────────────────────────────────
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainScope, setExplainScope] = useState<"card" | "topic">("card");

  // ── Review session state (lifted so the left pane can mirror it) ─────
  const [session, setSession] = useState<{ cards: DeckCard[]; topic: string } | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unsure, setUnsure] = useState(0);
  const [done, setDone] = useState(false);
  const [slidePhase, setSlidePhase] = useState<"idle" | "exit">("idle");

  const { totalDecks, recentDeckCards } = useMemo(() => {
    const latestByTopic = new Map<string, number>();
    for (const c of allCards) {
      const topic = c.topic || "Untitled";
      const cur = latestByTopic.get(topic) ?? 0;
      if (c.createdAt > cur) latestByTopic.set(topic, c.createdAt);
    }
    const recentTopics = new Set(
      Array.from(latestByTopic.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, RECENT_DECK_LIMIT)
        .map(([topic]) => topic)
    );
    const recent = allCards.filter((c) =>
      recentTopics.has(c.topic || "Untitled")
    );
    return { totalDecks: latestByTopic.size, recentDeckCards: recent };
  }, [allCards]);

  // ── Session lifecycle ─────────────────────────────────────────────────
  const startSession = (cards: DeckCard[], topic: string) => {
    if (!cards.length) {
      toast({ title: "No cards to review", variant: "destructive" });
      return;
    }
    setSession({ cards: cards.slice(), topic });
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setUnsure(0);
    setDone(false);
    setSlidePhase("idle");
    setRightPhase("reviewing");
    setConfigDrawerOpen(false);
  };

  const endSession = () => {
    setSession(null);
    setRightPhase("idle");
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setUnsure(0);
    setDone(false);
    setConfigDrawerOpen(false);
  };

  const handleStartDue = () => startSession(dueCards, "Today's review");
  const handleReviewAny = () => startSession(allCards, "All cards");
  const handleStudyDeck = (topic: string) =>
    startSession(allCards.filter((c) => c.topic === topic), topic);

  const handleDeleteDeck = (topic: string) => {
    const toDelete = allCards.filter((c) => c.topic === topic);
    toDelete.forEach((c) => deleteCard(c.id));
    toast({ title: `Deleted ${toDelete.length} cards from "${topic}"` });
  };

  // ── Generation → review hand-off ─────────────────────────────────────
  const handleGeneratingChange = (generating: boolean, topic: string) => {
    if (generating) {
      setGenTopic(topic);
      setRightPhase("generating");
      setConfigDrawerOpen(false);
    } else if (rightPhase === "generating") {
      // Failed or empty generation falls back to idle; success transitions
      // to reviewing via onGenerated just after.
      setRightPhase("idle");
    }
  };

  const handleGenerated = (cards: GeneratedCard[], topic: string) => {
    const now = Date.now();
    const sessionCards: DeckCard[] = cards.map((c) => ({
      id: makeCardId(c.question, c.answer),
      question: c.question,
      answer: c.answer,
      tag: c.tag,
      topic: c.topic || topic,
      topicEmoji: c.topicEmoji,
      createdAt: now,
      interval: 0,
      dueAt: now,
      lastReviewed: null,
      reviewCount: 0,
    }));
    if (!sessionCards.length) {
      setRightPhase("idle");
      return;
    }
    startSession(sessionCards, topic);
  };

  // ── Review interactions (spaced repetition logic unchanged) ──────────
  const current = session?.cards[index];
  const total = session?.cards.length ?? 0;
  const reviewed = known + unsure;
  const progressPct = total === 0 ? 0 : (reviewed / total) * 100;

  const handleFlip = () => {
    vibrate("flip");
    setFlipped((f) => !f);
  };

  const handleRate = (rating: Rating) => {
    if (!session || !current || slidePhase !== "idle") return;
    vibrate(rating);
    reviewCard(current.id, rating); // existing spaced-repetition logic
    if (rating === "again") setUnsure((u) => u + 1);
    else setKnown((k) => k + 1);
    if (index + 1 >= session.cards.length) {
      setDone(true);
      return;
    }
    // Slide current card out left (150ms), then bring the next in from the right
    setSlidePhase("exit");
    window.setTimeout(() => {
      setFlipped(false);
      setIndex((i) => i + 1);
      setSlidePhase("idle");
    }, 150);
  };

  const shuffleRemaining = () => {
    if (!session) return;
    setSession((prev) => {
      if (!prev) return prev;
      const head = prev.cards.slice(0, index + 1);
      const tail = prev.cards.slice(index + 1);
      for (let i = tail.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tail[i], tail[j]] = [tail[j], tail[i]];
      }
      return { ...prev, cards: [...head, ...tail] };
    });
    toast({ title: "Remaining cards shuffled" });
  };

  const quickStart = (topic: string) => {
    window.dispatchEvent(
      new CustomEvent("studybuddy:generate-flashcards", {
        detail: { topic, cardCount: 12 },
      })
    );
  };

  // ── Left pane ─────────────────────────────────────────────────────────
  const leftPaneContent = session ? (
    <Card key="session" className="pane-crossfade glass-card rounded-xl">
      <CardContent className="px-4 py-5 space-y-4">
        <p className="text-sm font-bold text-foreground leading-snug">{session.topic}</p>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Card {Math.min(index + 1, total)} of {total}
          </p>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              style={{ "--sb-progress": `${progressPct}%` } as React.CSSProperties}
              className="h-full rounded-full bg-primary transition-all duration-300 w-[var(--sb-progress)]"
            />
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Known: <span className="tabular-nums">{known}</span>
          </p>
          <p className="text-red-600 dark:text-red-400 font-medium">
            ✗ Unsure: <span className="tabular-nums">{unsure}</span>
          </p>
        </div>

        <div className="border-t border-border" aria-hidden />

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full h-9 rounded-lg font-medium text-sm"
            onClick={endSession}
          >
            End Session
          </Button>
          <Button
            variant="ghost"
            className="w-full h-9 rounded-lg font-medium text-sm text-muted-foreground"
            onClick={shuffleRemaining}
          >
            <Shuffle className="h-3.5 w-3.5 mr-1.5" />
            Shuffle remaining
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : (
    <div key="config" className="pane-crossfade space-y-4">
      {stats.due > 0 && totalDecks > 0 && (
        <DueCardsReminderStrip dueCount={stats.due} onStartReview={handleStartDue} />
      )}
      <FlashcardsGenerator
        onGeneratingChange={handleGeneratingChange}
        onGenerated={handleGenerated}
      />
    </div>
  );

  // ── Right pane ────────────────────────────────────────────────────────
  const rightPaneContent =
    rightPhase === "generating" ? (
      <div key="generating" className="pane-crossfade mx-auto w-full max-w-[560px] space-y-4">
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="relative h-8 w-8 shrink-0">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Generating your {genTopic || "new"} flashcards…
          </p>
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="section-reveal rounded-xl border border-border bg-card h-[200px] p-5 space-y-3"
            style={{ animationDelay: `${i * 150}ms` }}
          >
            <div className="skeleton-shimmer rounded-md bg-muted h-5 w-24" />
            <div className="skeleton-shimmer rounded-md bg-muted h-4 w-11/12" />
            <div className="skeleton-shimmer rounded-md bg-muted h-4 w-3/4" />
            <div className="skeleton-shimmer rounded-md bg-muted h-4 w-2/3" />
            <div className="skeleton-shimmer rounded-md bg-muted h-4 w-1/2" />
          </div>
        ))}
      </div>
    ) : rightPhase === "reviewing" && session ? (
      <div key="reviewing" className="pane-crossfade mx-auto w-full max-w-[560px] space-y-4">
        {/* Thin progress bar above the card */}
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            style={{ "--sb-progress": `${progressPct}%` } as React.CSSProperties}
            className="h-full rounded-full bg-primary transition-all duration-300 w-[var(--sb-progress)]"
          />
        </div>

        {done ? (
          <div className="text-center space-y-4 py-16 animate-fade-in">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Session complete
            </h2>
            <p className="text-muted-foreground">
              {reviewed} {reviewed === 1 ? "card" : "cards"} reviewed · ✓ {known} known · ✗{" "}
              {unsure} unsure
            </p>
            <Button onClick={endSession} className="h-10 px-8 rounded-lg mt-2 font-medium">
              Done
            </Button>
          </div>
        ) : current ? (
          <>
            {/* Card with flip — tap to flip; keyed wrapper drives slide transitions */}
            <div
              key={current.id}
              className={slidePhase === "exit" ? "card-slide-exit-left" : "card-slide-enter-right"}
            >
              <div
                className="perspective cursor-pointer select-none"
                onClick={handleFlip}
                role="button"
                aria-label={flipped ? "Tap to show question" : "Tap to show answer"}
              >
                <div
                  className={`flip-card-y-inner relative h-[260px] sm:h-[300px] ${flipped ? "flipped" : ""}`}
                >
                  {/* Front — question */}
                  <div className="flip-face absolute inset-0 w-full">
                    <CardFace card={current} text={current.question} />
                  </div>
                  {/* Back — answer */}
                  <div className="flip-face flip-face-back absolute inset-0 w-full">
                    <CardFace card={current} text={current.answer} showCitation />
                  </div>
                </div>
              </div>
            </div>

            {!flipped ? (
              <Button onClick={handleFlip} className="w-full h-11 rounded-lg font-medium">
                Show Answer
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <button
                    type="button"
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
                    className="h-11 rounded-lg font-medium text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                  >
                    ✗ Don't Know
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRate("good")}
                    className="h-11 rounded-lg font-medium text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400"
                  >
                    ~ Almost
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRate("easy")}
                    className="h-11 rounded-lg font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    ✓ Got It
                  </Button>
                </div>
              </div>
            )}

            <p className="text-center text-[11px] text-muted-foreground/60">
              Tap the card to flip · AI-generated content · Not a substitute for clinical judgment
            </p>
          </>
        ) : null}
      </div>
    ) : (
      <div key="idle" className="pane-crossfade space-y-8">
        <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border py-20 px-6 text-center animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Pick a topic to generate flashcards
            </p>
            <p className="text-xs text-muted-foreground">
              Your cards will appear here for review
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {["Myocardial Infarction", "Pneumonia", "Diabetic Ketoacidosis"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => quickStart(label)}
                className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {totalDecks > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">
              My decks
            </h3>
            <DeckList
              cards={recentDeckCards}
              onStudyDeck={handleStudyDeck}
              onDeleteDeck={handleDeleteDeck}
              onReviewAll={handleReviewAny}
            />
            {totalDecks > RECENT_DECK_LIMIT && (
              <div className="pl-1">
                <Link
                  to="/library"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  View all in Library
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );

  return (
    <DashboardLayout wide>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Flashcards
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate a deck on any medical topic and study with spaced repetition.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-0 lg:items-start">
          {/* ── Left pane: configurator / session status (drawer on tablet) ── */}
          <div className="min-w-0 md:max-lg:hidden lg:sticky lg:top-6 lg:self-start lg:w-[280px] lg:min-w-[280px] lg:max-w-[280px] lg:shrink-0 lg:pr-5">
            {leftPaneContent}
          </div>

          {/* ── 1px divider between panes ── */}
          <div aria-hidden className="hidden lg:block lg:w-px lg:shrink-0 lg:self-stretch bg-border" />

          {/* ── Right pane ── */}
          <div className="min-w-0 lg:flex-1 lg:pl-8">
            {rightPaneContent}
          </div>
        </div>
      </div>

      {/* ── Tablet-only (768–1023px): floating configure button ── */}
      <button
        type="button"
        onClick={() => setConfigDrawerOpen(true)}
        className="hidden md:max-lg:inline-flex fixed bottom-4 left-4 z-40 h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Settings2 className="h-3.5 w-3.5" />
        {session ? "Session" : "Configure"}
      </button>

      {/* ── Tablet-only: slide-out left-pane drawer ── */}
      <div
        className={`hidden md:max-lg:block fixed inset-0 z-50 ${
          configDrawerOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!configDrawerOpen}
      >
        <div
          className={`absolute inset-0 bg-black/50 motion-safe:transition-opacity motion-safe:duration-200 ${
            configDrawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setConfigDrawerOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[320px] overflow-y-auto bg-background border-r border-border p-4 motion-safe:transition-transform motion-safe:duration-[250ms] motion-safe:ease-out ${
            configDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {session ? "Session" : "Configure"}
            </span>
            <button
              type="button"
              onClick={() => setConfigDrawerOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {leftPaneContent}
        </div>
      </div>

      {/* ── "Explain this" panel — AI explanation for the active card ── */}
      {current && (
        <ExplainPanel
          open={explainOpen}
          scope={explainScope}
          card={current}
          onClose={() => setExplainOpen(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default Flashcards;
