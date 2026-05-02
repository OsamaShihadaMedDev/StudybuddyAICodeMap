import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DueTodaySectionProps {
  total: number;
  due: number;
  mastered: number;
  onStart: () => void;
}

const DueTodaySection = ({ total, due, mastered, onStart }: DueTodaySectionProps) => {
  if (total === 0) return null;
  const hasDue = due > 0;

  return (
    <Card className="glass-card animate-fade-in">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Due Today
          </span>
          <span className="text-xs text-muted-foreground">
            {mastered} mastered · {total} total
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-4xl font-extrabold text-primary ${hasDue ? "animate-soft-pulse" : ""}`}
            >
              {due}
            </span>
            <span className="text-base text-muted-foreground">
              {due === 1 ? "card" : "cards"}
            </span>
          </div>
          <Button
            onClick={onStart}
            disabled={!hasDue}
            className="btn-gradient h-11 px-6 rounded-xl font-semibold"
          >
            {hasDue ? "Start Review" : "All caught up"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DueTodaySection;