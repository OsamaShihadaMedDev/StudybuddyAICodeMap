import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame, TrendingUp, CalendarDays, Sparkles, Play, BookOpen, Repeat } from "lucide-react";
import { useStudyStats } from "@/hooks/use-study-stats";

interface DashboardHeroProps {
  dueCount: number;
  totalDecks: number;
  onStartReview: () => void;
  onReviewAny: () => void;
  onCreateDeck: () => void;
}

const formatToday = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

interface StatChipProps {
  icon: ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}

const StatChip = ({ icon, value, label, accent }: StatChipProps) => (
  <div className="flex flex-1 flex-col items-center gap-0.5 px-2 py-1 text-center">
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span
        className={`text-2xl font-extrabold leading-none tracking-tight md:text-3xl ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
    <span className="text-[11px] text-muted-foreground tracking-wide">
      {label}
    </span>
  </div>
);

const StatsStrip = () => {
  const { streak, retentionRate, cardsThisWeek, isAnonymous } = useStudyStats();

  const streakValue = streak === null ? "—" : String(streak);
  const streakLabel =
    streak === null ? "day streak" : `${streak === 1 ? "day" : "days"} streak`;
  const retentionValue =
    retentionRate === null ? "—" : `${retentionRate}%`;
  const cardsValue =
    cardsThisWeek === null ? "—" : String(cardsThisWeek);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-row items-stretch gap-1 divide-x divide-border/40">
        <StatChip
          icon={<Flame className="h-3.5 w-3.5" />}
          value={streakValue}
          label={streakLabel}
          accent
        />
        <StatChip
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          value={retentionValue}
          label="retention"
        />
        <StatChip
          icon={<CalendarDays className="h-3.5 w-3.5" />}
          value={cardsValue}
          label="this week"
        />
      </div>
      {isAnonymous && (
        <p className="text-center text-[11px] text-muted-foreground/80">
          Sign in to track your progress
        </p>
      )}
    </div>
  );
};

const DashboardHero = ({
  dueCount,
  totalDecks,
  onStartReview,
  onReviewAny,
  onCreateDeck,
}: DashboardHeroProps) => {
  if (totalDecks === 0) {
    return (
      <Card className="glass-card animate-fade-in border-primary/20">
        <CardContent className="p-7 space-y-5">
          <StatsStrip />
          <div className="border-t border-border/40" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
                Generate your first deck to start studying
              </h2>
              <p className="text-sm text-muted-foreground">
                Type a topic below — flashcards and study sheets are saved automatically.
              </p>
            </div>
          </div>
          <Button
            onClick={onCreateDeck}
            className="btn-gradient h-11 rounded-xl px-5 font-semibold"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Create deck
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (dueCount === 0) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardContent className="p-7 space-y-5">
          <StatsStrip />
          <div className="border-t border-border/40" />
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase">
              Today
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              All caught up
            </h2>
            <p className="text-sm text-muted-foreground">
              Generate new material below or review any deck to keep practicing.
            </p>
          </div>
          <Button
            onClick={onReviewAny}
            variant="outline"
            className="h-11 rounded-xl px-5 font-semibold border-primary/30 hover:bg-primary/10"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Review any deck
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card animate-fade-in border-primary/20">
      <CardContent className="p-7 space-y-5">
        <StatsStrip />
        <div className="border-t border-border/40" />
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase">
            Today, review
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Repeat className="h-3 w-3" />
                  Spaced repetition
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                Cards are scheduled to reappear just before you forget them — an evidence-based technique that maximizes long-term retention.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-7xl font-extrabold leading-none text-primary tracking-tight md:text-8xl">
            {dueCount}
          </span>
          <span className="text-lg font-semibold text-muted-foreground pb-2">
            {dueCount === 1 ? "card" : "cards"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={onStartReview}
            className="btn-gradient h-12 rounded-xl px-6 font-semibold text-sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Reviewing
          </Button>
          <button
            onClick={onReviewAny}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Or review any deck
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">{formatToday()}</p>
      </CardContent>
    </Card>
  );
};

export default DashboardHero;
