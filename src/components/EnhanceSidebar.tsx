import { useState, useEffect, useCallback, useRef } from "react";
import {
  Microscope,
  Stethoscope,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { type EnhancementResult } from "@/types/generated-sheet";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ActiveEnhancement {
  sourceText: string;
  mode: "expand" | "clinical";
  sectionKey: string;
}

interface EnhanceSidebarProps {
  activeEnhancements: Record<string, ActiveEnhancement>;
  openTabKeys: Set<string>;
  onTabToggle: (key: string) => void;
  onCloseTab: (key: string) => void;
  topic: string;
  isPro: boolean;
  userId: string | null;
  isAnonymous: boolean;
  sheetId?: string;
  onResult?: (key: string, result: EnhancementResult) => void;
}

// ─── Result renderer ───────────────────────────────────────────────────────

function renderResult(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Single tab result panel ───────────────────────────────────────────────

interface TabPanelProps {
  enhKey: string;
  enhancement: ActiveEnhancement;
  topic: string;
  isPro: boolean;
  userId: string | null;
  isAnonymous: boolean;
  sheetId?: string;
  onResult?: (key: string, result: EnhancementResult) => void;
}

const TabPanel = ({
  enhKey,
  enhancement,
  topic,
  isPro,
  userId,
  isAnonymous,
  sheetId,
  onResult,
}: TabPanelProps) => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cacheKey = `sb_enhance:${sheetId ?? "unsaved"}:${enhKey}`;

  const runEnhance = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-notes`,
        {
          method: "POST",
          signal: abortRef.current.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            enhanceMode: enhancement.mode,
            itemText: enhancement.sourceText,
            sectionKey: enhancement.sectionKey,
            sectionItems: [],
            enhanceTopic: topic,
            isPro,
            userId,
            isAnonymous,
            notes: enhancement.sourceText,
          }),
        }
      );

      if (!response.ok) throw new Error("Enhancement failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const text = parsed?.choices?.[0]?.delta?.content;
            if (typeof text === "string") {
              accumulated += text;
              setResult(accumulated);
            }
          } catch {
            // skip unparseable chunks
          }
        }
      }

      if (accumulated) {
        try {
          localStorage.setItem(cacheKey, accumulated);
        } catch {
          // quota exceeded
        }
        onResult?.(enhKey, {
          mode: enhancement.mode,
          sourceText: enhancement.sourceText,
          result: accumulated,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Enhancement failed. Try again.");
    } finally {
      setLoading(false);
    }
  }, [enhKey, enhancement, topic, isPro, userId, isAnonymous, sheetId, cacheKey, onResult]);

  // On mount: check cache first, only call AI if no cached result
  useEffect(() => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setResult(cached);
      return;
    }
    runEnhance();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-3 py-3 space-y-2">
      <p className="text-[10px] text-muted-foreground/40 italic truncate">
        "{enhancement.sourceText.slice(0, 55)}
        {enhancement.sourceText.length > 55 ? "…" : ""}"
      </p>

      {loading && !result && (
        <div className="space-y-2 pt-1">
          <div className="animate-pulse bg-secondary/60 rounded h-2.5 w-11/12" />
          <div className="animate-pulse bg-secondary/60 rounded h-2.5 w-9/12" />
          <div className="animate-pulse bg-secondary/60 rounded h-2.5 w-10/12" />
          <div className="animate-pulse bg-secondary/60 rounded h-2.5 w-8/12" />
        </div>
      )}
      {result && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {renderResult(result)}
        </p>
      )}
      {error && !loading && (
        <div className="flex items-center gap-2 pt-1">
          <p className="text-xs text-destructive flex-1">{error}</p>
          <button
            type="button"
            onClick={runEnhance}
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
          >
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Main sidebar ──────────────────────────────────────────────────────────

const EnhanceSidebar = ({
  activeEnhancements,
  openTabKeys,
  onTabToggle,
  onCloseTab,
  topic,
  isPro,
  userId,
  isAnonymous,
  sheetId,
  onResult,
}: EnhanceSidebarProps) => {
  const keys = Object.keys(activeEnhancements);
  const hasEnhancements = keys.length > 0;

  if (!hasEnhancements) {
    return (
      <div className="rounded-xl border border-border/20 bg-secondary/5 flex flex-col items-center justify-center gap-2 p-6 text-center min-h-[140px]">
        <Sparkles className="h-5 w-5 text-primary/20" />
        <p className="text-[11px] text-muted-foreground/35 leading-snug max-w-[180px]">
          Highlight any text or hover a bold term to enhance it
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/30 bg-secondary/5 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/20">
        <Sparkles className="h-3.5 w-3.5 text-primary/60" />
        <span className="text-[11px] font-bold text-foreground/70 uppercase tracking-wider">
          Enhancements
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/40 font-medium">
          {keys.length} {keys.length === 1 ? "tab" : "tabs"}
        </span>
      </div>

      <div className="border-b border-border/20 divide-y divide-border/10">
        {keys.map((key) => {
          const e = activeEnhancements[key];
          const isActive = openTabKeys.has(key);
          const isExpand = e.mode === "expand";
          const ModeIcon = isExpand ? Microscope : Stethoscope;
          const accentColor = isExpand ? "text-blue-400" : "text-teal-400";
          const activeBg = isExpand
            ? "bg-blue-500/[0.06] border-l-2 border-l-blue-500/50"
            : "bg-teal-500/[0.06] border-l-2 border-l-teal-500/50";

          return (
            <div key={key}>
              <div
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
                  ${isActive ? activeBg : "hover:bg-secondary/30"}`}
                onClick={() => onTabToggle(key)}
              >
                <ModeIcon className={`h-3.5 w-3.5 shrink-0 ${accentColor}`} />
                <span className={`text-[11px] font-semibold shrink-0 ${accentColor}`}>
                  {isExpand ? "Expand" : "Clinical"}
                </span>
                <span className="text-[10px] text-muted-foreground/50 italic truncate flex-1 min-w-0">
                  "{e.sourceText.slice(0, 28)}
                  {e.sourceText.length > 28 ? "…" : ""}"
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onTabToggle(key);
                    }}
                    className="text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors p-0.5"
                    aria-label={isActive ? "Collapse" : "Expand"}
                  >
                    {isActive ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onCloseTab(key);
                    }}
                    className="text-muted-foreground/30 hover:text-destructive/70 transition-colors p-0.5"
                    aria-label="Close"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {isActive && (
                <div
                  className={`border-t border-border/10 ${
                    isExpand ? "bg-blue-500/[0.03]" : "bg-teal-500/[0.03]"
                  }`}
                >
                  <TabPanel
                    enhKey={key}
                    enhancement={e}
                    topic={topic}
                    isPro={isPro}
                    userId={userId}
                    isAnonymous={isAnonymous}
                    sheetId={sheetId}
                    onResult={onResult}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EnhanceSidebar;
