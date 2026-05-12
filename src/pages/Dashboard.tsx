import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardHero from "@/components/dashboard/DashboardHero";
import StatsStrip from "@/components/dashboard/StatsStrip";
import WelcomeCard from "@/components/dashboard/WelcomeCard";
import MoreToolsSection from "@/components/dashboard/MoreToolsSection";
import FirstDeckBanner from "@/components/dashboard/FirstDeckBanner";
import GoProNudgeBanner from "@/components/dashboard/GoProNudgeBanner";
import WelcomeModal from "@/components/WelcomeModal";
import DeckList from "@/components/DeckList";
import FlashcardsGenerator from "@/components/FlashcardsGenerator";
import StudyMode from "@/components/StudyMode";
import { useAuth } from "@/hooks/use-auth";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import { useToast } from "@/hooks/use-toast";

const RECENT_DECK_LIMIT = 5;

type StudyFilter = { topic?: string; mode: "due" | "all-cards" | "deck" };

const Dashboard = () => {
  const { toast } = useToast();
  const { isAnonymous } = useAuth();
  const { allCards, dueCards, reviewCard, deleteCard, stats } = useFlashcardDeck();
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyFilter, setStudyFilter] = useState<StudyFilter>({ mode: "due" });
  const [searchParams] = useSearchParams();
  const autoOpenSheet = searchParams.get("start") === "sheet";

  const generatorRef = useRef<HTMLDivElement>(null);

  const handleGoToFlashcards = () => {
    generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  const handleStartDue = () => {
    setStudyFilter({ mode: "due" });
    setStudyOpen(true);
  };
  const handleReviewAny = () => {
    setStudyFilter({ mode: "all-cards" });
    setStudyOpen(true);
  };
  const handleStudyDeck = (topic: string) => {
    setStudyFilter({ mode: "deck", topic });
    setStudyOpen(true);
  };
  const handleDeleteDeck = (topic: string) => {
    const toDelete = allCards.filter((c) => c.topic === topic);
    toDelete.forEach((c) => deleteCard(c.id));
    toast({ title: `Deleted ${toDelete.length} cards from "${topic}"` });
  };

  const studySessionCards = useMemo(() => {
    if (studyFilter.mode === "due") return dueCards;
    if (studyFilter.mode === "all-cards") return allCards;
    if (studyFilter.mode === "deck" && studyFilter.topic) {
      return allCards.filter((c) => c.topic === studyFilter.topic);
    }
    return dueCards;
  }, [studyFilter, dueCards, allCards]);

  return (
    <DashboardLayout>
      <WelcomeModal />
      {studyOpen && (
        <StudyMode
          dueCards={studySessionCards}
          onReview={reviewCard}
          onClose={() => setStudyOpen(false)}
        />
      )}

      <div className="space-y-8">
        <GoProNudgeBanner isRealUser={!isAnonymous} />
        <FirstDeckBanner onGoToFlashcards={handleGoToFlashcards} />
        <StatsStrip />

        {totalDecks === 0 && <WelcomeCard />}

        {totalDecks > 0 && (
          <DashboardHero
            dueCount={stats.due}
            onStartReview={handleStartDue}
            onReviewAny={handleReviewAny}
          />
        )}

        {totalDecks > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold tracking-tight text-foreground pl-1">
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

        <div ref={generatorRef} className="space-y-2">
          <p className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase pl-1">
            Flashcards
          </p>
          <FlashcardsGenerator />
        </div>

        <MoreToolsSection autoOpen={autoOpenSheet} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
