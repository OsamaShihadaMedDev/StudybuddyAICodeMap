import { ReactNode, useEffect, useState } from "react";
import { Flame, FileText, Layers } from "lucide-react";
import { useStudyStats } from "@/hooks/use-study-stats";
import { useSheetsStats } from "@/hooks/use-sheets-stats";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";

/** Count from 0 to target over `duration` ms with an ease-out curve. */
function useCountUp(target: number | null, duration = 600): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === null || Number.isNaN(target)) {
      setValue(0);
      return;
    }
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

interface StatChipProps {
  icon: ReactNode;
  value: number | null;
  label: string;
  accent?: boolean;
  suffix?: ReactNode;
}

const StatChip = ({ icon, value, label, accent, suffix }: StatChipProps) => {
  const animated = useCountUp(value);
  return (
    <div className="flex flex-1 flex-col items-center gap-1 px-2 py-1 text-center">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60">{icon}</span>
        <span
          className={`text-2xl font-semibold leading-none tracking-tight tabular-nums ${
            accent ? "text-primary" : "text-foreground"
          }`}
        >
          {value === null ? "—" : animated}
        </span>
        {suffix}
      </div>
      <span className="text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
};

const StatsStrip = () => {
  const { streak, isAnonymous } = useStudyStats();
  const { sheetsThisWeek } = useSheetsStats();
  const { stats } = useFlashcardDeck();

  const streakValue = isAnonymous || streak === null ? null : streak;
  const streakLabel = !isAnonymous && streak === 1 ? "day streak" : "days streak";

  const sheetsValue = isAnonymous || sheetsThisWeek === null ? null : sheetsThisWeek;
  const sheetsLabel = "sheets this week";

  const dueValue = isAnonymous ? null : stats.due;
  const dueLabel = "cards due today";

  return (
    <div
      className="animate-fade-in"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-elevated)",
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--accent)",
          marginBottom: 16,
        }}
      >
        Your progress
      </div>

      <div className="flex flex-row items-stretch gap-1 divide-x divide-border">
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
          suffix={
            streakValue !== null && streakValue > 0 ? (
              <span className="text-base leading-none" aria-hidden>
                🔥
              </span>
            ) : undefined
          }
        />
      </div>

      {isAnonymous && (
        <p className="mt-2 text-center text-xs text-muted-foreground/70">
          Sign in to track your progress
        </p>
      )}
    </div>
  );
};

export default StatsStrip;
