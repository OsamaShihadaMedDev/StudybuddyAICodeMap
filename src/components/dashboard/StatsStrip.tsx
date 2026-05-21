import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, FileText, Layers } from "lucide-react";
import { useStudyStats } from "@/hooks/use-study-stats";
import { useSheetsStats } from "@/hooks/use-sheets-stats";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";

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
  const { streak, isAnonymous } = useStudyStats();
  const { sheetsThisWeek } = useSheetsStats();
  const { stats } = useFlashcardDeck();

  const streakValue = isAnonymous || streak === null ? "—" : String(streak);
  const streakLabel = !isAnonymous && streak === 1 ? "day streak" : "days streak";

  const sheetsValue = isAnonymous || sheetsThisWeek === null ? "—" : String(sheetsThisWeek);
  const sheetsLabel = "sheets this week";

  const dueValue = isAnonymous ? "—" : String(stats.due);
  const dueLabel = "cards due today";

  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="p-5 space-y-1.5">
        <div className="flex flex-row items-stretch gap-1 divide-x divide-border/40">
          <StatChip
            icon={<FileText className="h-3.5 w-3.5" />}
            value={sheetsValue}
            label={sheetsLabel}
          />
          <StatChip
            icon={<Layers className="h-3.5 w-3.5" />}
            value={dueValue}
            label={dueLabel}
          />
          <StatChip
            icon={<Flame className="h-3.5 w-3.5" />}
            value={streakValue}
            label={streakLabel}
            accent
          />
        </div>
        {isAnonymous && (
          <p className="text-center text-[11px] text-muted-foreground/80">
            Sign in to track your progress
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsStrip;
