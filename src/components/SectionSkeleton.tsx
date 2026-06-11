interface SectionSkeletonProps {
  variant?: "sheet-section" | "flashcard" | "qbank-options";
  className?: string;
}

const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-md bg-muted ${className}`} />
);

/**
 * Animated skeleton placeholders that mirror the real content layout,
 * with a left-to-right shimmer sweep.
 */
const SectionSkeleton = ({ variant = "sheet-section", className = "" }: SectionSkeletonProps) => {
  if (variant === "flashcard") {
    return (
      <div className={`rounded-xl border border-border bg-card p-5 space-y-3 ${className}`}>
        <Bar className="h-5 w-20" />
        <Bar className="h-4 w-11/12" />
        <Bar className="h-4 w-3/4" />
        <Bar className="h-4 w-2/3" />
      </div>
    );
  }

  if (variant === "qbank-options") {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {["w-11/12", "w-4/5", "w-3/4", "w-2/3"].map((w, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <Bar className="h-7 w-7 shrink-0 rounded-md" />
            <Bar className={`h-4 ${w}`} />
          </div>
        ))}
      </div>
    );
  }

  // sheet-section: title bar + 4 lines of text
  return (
    <div className={`rounded-md border border-border bg-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        <Bar className="h-7 w-7 rounded-md" />
        <Bar className="h-4 w-32" />
      </div>
      <div className="space-y-2.5">
        <Bar className="h-3.5 w-full" />
        <Bar className="h-3.5 w-11/12" />
        <Bar className="h-3.5 w-4/5" />
        <Bar className="h-3.5 w-2/3" />
      </div>
    </div>
  );
};

export default SectionSkeleton;
