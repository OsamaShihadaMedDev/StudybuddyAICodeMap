import { Card, CardContent } from "@/components/ui/card";
import { Flame, Target } from "lucide-react";

const DashboardRightRail = () => {
  return (
    <aside className="w-[280px] shrink-0 space-y-4">
      <Card className="rounded-xl border border-border/60 bg-secondary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                7-day streak
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Coming soon
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 opacity-50">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-md bg-muted/60 border border-border/40"
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Track your daily review streak to build consistent study habits.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-border/60 bg-secondary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                Daily goal
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Coming soon
            </span>
          </div>
          <div className="space-y-1.5 opacity-50">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cards reviewed</span>
              <span>0 / 20</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
              <div className="h-full bg-primary/30" style={{ width: "0%" }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Set a daily target to keep momentum on long study plans.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
};

export default DashboardRightRail;
