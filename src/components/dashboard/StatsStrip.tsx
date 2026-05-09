import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, TrendingUp, CalendarDays } from "lucide-react";
import { useStudyStats } from "@/hooks/use-study-stats";

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
  const retentionValue = retentionRate === null ? "—" : `${retentionRate}%`;
  const cardsValue = cardsThisWeek === null ? "—" : String(cardsThisWeek);

  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="p-5 space-y-1.5">
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
      </CardContent>
    </Card>
  );
};

export default StatsStrip;
