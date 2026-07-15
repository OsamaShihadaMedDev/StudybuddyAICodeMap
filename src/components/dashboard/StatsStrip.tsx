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
    <div style={{
      display: "flex",
      flex: 1,
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      padding: "4px 8px",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--fg-subtle)", display: "flex" }}>{icon}</span>
        <span style={{
          fontSize: 24,
          fontWeight: 600,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
          color: accent ? "var(--accent)" : "var(--fg)",
        }}>
          {value === null ? "—" : animated}
        </span>
        {suffix}
      </div>
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--fg-muted)",
        letterSpacing: "0.04em",
      }}>
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

      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap: 0,
      }}>
        <StatChip
          icon={<FileText className="h-3.5 w-3.5" />}
          value={sheetsValue}
          label={sheetsLabel}
        />
        <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
        <StatChip
          icon={<Layers className="h-3.5 w-3.5" />}
          value={dueValue}
          label={dueLabel}
        />
        <div style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }} />
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
        <p style={{
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--fg-subtle)",
          letterSpacing: "0.04em",
          marginTop: 12,
        }}>
          Sign in to track your progress
        </p>
      )}
    </div>
  );
};

export default StatsStrip;
