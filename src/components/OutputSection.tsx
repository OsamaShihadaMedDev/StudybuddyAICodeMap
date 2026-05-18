import { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, List, HelpCircle, FileText, Stethoscope, Settings2, AlertTriangle, Lightbulb, Layers, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/CopyButton";
import FlashcardsSection from "@/components/FlashcardsSection";
import SaveButton from "@/components/SaveButton";
import CitationBadgeList from "@/components/CitationBadgeList";
import type { CitationResult } from "@/lib/citation";

export type CitationState = "idle" | "loading" | "found" | "locked" | "hidden";

interface OutputSectionProps {
  output: string;
  inputText?: string;
  modeInfo?: {
    examMode: string;
    difficulty: string;
    focus: string;
    length: string;
  };
  citations?: CitationResult[];
  citationState?: CitationState;
  onCitationLockedClick?: () => void;
  citationIsLoggedIn?: boolean;
  modelUsed?: "flash" | "gpt-oss";
  isPro?: boolean;
}

const EVIDENCE_SECTIONS: ReadonlyArray<SectionKey> = [
  "SUMMARY",
  "CLINICAL APPROACH",
  "KEY POINTS",
];

function ModelBadge({ model, isPro }: { model: "flash" | "gpt-oss"; isPro: boolean }) {
  if (isPro) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 ml-2">
        <Zap className="h-3 w-3" />
        Powered by {model === "flash" ? "Gemini Flash" : "GPT-OSS 20B"}
      </span>
    );
  }
  if (model === "flash") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-400 border border-violet-500/30 ml-2">
        <Zap className="h-3 w-3" />
        ✦ Premium AI
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-secondary/60 text-muted-foreground border border-border/40 ml-2">
      GPT-OSS 20B
    </span>
  );
}

function EvidenceBadge({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors cursor-pointer animate-pulse-subtle ml-2"
      title="This section is backed by peer-reviewed sources — see below"
    >
      <Zap className="h-3 w-3" />
      Evidence-backed
    </button>
  );
}

const sectionConfig = {
  SUMMARY: { icon: BookOpen, label: "Summary", className: "section-summary" },
  "MEMORY HOOKS": { icon: Lightbulb, label: "Memory Hooks", className: "section-memoryhooks" },
  "CLINICAL APPROACH": { icon: Stethoscope, label: "Clinical Approach", className: "section-clinical" },
  "KEY POINTS": { icon: List, label: "Key Points", className: "section-keypoints" },
  "EXAM TRAPS": { icon: AlertTriangle, label: "⚠️ Exam Traps", className: "section-examtraps" },
  FLASHCARDS: { icon: HelpCircle, label: "Flashcards", className: "section-flashcards" },
  "REFERENCE NOTE": { icon: FileText, label: "Reference Note", className: "section-reference" },
};

type SectionKey = keyof typeof sectionConfig;

function parseSections(text: string) {
  const sections: { title: SectionKey; content: string }[] = [];
  const keys = Object.keys(sectionConfig) as SectionKey[];
  const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
  const regex = new RegExp(`(${sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})\\s*\\n`, "g");

  let lastKey: SectionKey | null = null;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (lastKey !== null) {
      sections.push({ title: lastKey, content: text.slice(lastIndex, match.index).trim() });
    }
    lastKey = match[1] as SectionKey;
    lastIndex = match.index + match[0].length;
  }

  if (lastKey !== null) {
    sections.push({ title: lastKey, content: text.slice(lastIndex).trim() });
  }

  return sections;
}

function renderFormattedContent(content: string) {
  // Support **bold** in content
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const OutputSection = ({
  output,
  inputText,
  modeInfo,
  citations,
  citationState,
  onCitationLockedClick,
  citationIsLoggedIn,
  modelUsed,
  isPro = false,
}: OutputSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const referenceNoteRef = useRef<HTMLDivElement>(null);
  const sections = parseSections(output);
  const [showNudge, setShowNudge] = useState(() => !localStorage.getItem("sb_first_sheet_seen"));
  const [disclaimerCollapsed, setDisclaimerCollapsed] = useState(() =>
    sessionStorage.getItem("sb_disclaimer_collapsed") === "1"
  );

  const toggleDisclaimer = () => {
    setDisclaimerCollapsed((prev) => {
      const next = !prev;
      sessionStorage.setItem("sb_disclaimer_collapsed", next ? "1" : "0");
      return next;
    });
  };

  const scrollToReference = () => {
    referenceNoteRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (showNudge) {
      localStorage.setItem("sb_first_sheet_seen", "1");
    }
  }, [showNudge]);

  useEffect(() => {
    if (ref.current && sections.length > 0) {
      setDisclaimerCollapsed(false);
      sessionStorage.removeItem("sb_disclaimer_collapsed");
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [sections.length > 0]);

  if (sections.length === 0) {
    return (
      <div ref={ref}>
        <Card className="glass-card animate-fade-in">
          <CardContent className="p-6">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{output}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasReferenceSection = sections.some((s) => s.title === "REFERENCE NOTE");

  return (
    <div ref={ref} className="space-y-5">
      {/* Save + Mode Header */}
      <div className="animate-fade-in flex items-center justify-between">
        {modeInfo && (
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/40 border border-border/40 rounded-lg px-4 py-2.5">
            <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span>
            <span className="text-foreground">{modeInfo.examMode}</span>
            <span className="mx-1.5 opacity-40">|</span>
            <span>{modeInfo.difficulty}</span>
            <span className="mx-1.5 opacity-40">|</span>
            <span>{modeInfo.focus}</span>
            <span className="mx-1.5 opacity-40">|</span>
            <span>{modeInfo.length}</span>
          </span>
          </div>
        )}
        <SaveButton input={inputText || ""} output={output} modeInfo={modeInfo} />
      </div>

      {sections.map(({ title, content }, idx) => {
        const config = sectionConfig[title];
        const Icon = config.icon;
        const isReference = title === "REFERENCE NOTE";
        const showEvidenceBadge =
          citationState === "found" && EVIDENCE_SECTIONS.includes(title);

        return (
          <Card
            key={title}
            ref={isReference ? referenceNoteRef : undefined}
            className={`glass-card animate-fade-in overflow-hidden hover-lift ${config.className}`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="px-6 pt-5 pb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-bold tracking-wide text-foreground uppercase">
                  {config.label}
                </h3>
                {showEvidenceBadge && (
                  <EvidenceBadge onClick={scrollToReference} />
                )}
                {title === "SUMMARY" && modelUsed && (
                  <ModelBadge model={modelUsed} isPro={isPro} />
                )}
              </div>
              <CopyButton text={content} />
            </div>
            <CardContent className="px-6 pb-6 pt-2">
              {title === "FLASHCARDS" ? (
                <FlashcardsSection content={content} />
              ) : (
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {renderFormattedContent(content)}
                </div>
              )}
              {isReference &&
                citationState &&
                (citationState === "found" ||
                  citationState === "loading" ||
                  citationState === "locked") && (
                  <div className="mt-3">
                    <CitationBadgeList
                      state={citationState}
                      citations={citations}
                      onLockedClick={onCitationLockedClick}
                      isLoggedIn={citationIsLoggedIn}
                    />
                  </div>
                )}
            </CardContent>
          </Card>
        );
      })}

      {!hasReferenceSection &&
        citationState &&
        (citationState === "found" ||
          citationState === "loading" ||
          citationState === "locked") && (
          <Card className="glass-card animate-fade-in overflow-hidden hover-lift section-reference">
            <div className="px-6 pt-5 pb-2 flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-bold tracking-wide text-foreground uppercase">
                Reference Note
              </h3>
            </div>
            <CardContent className="px-6 pb-6 pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Based on standard medical references and clinical guidelines.
              </p>
              <CitationBadgeList
                state={citationState}
                citations={citations}
                onLockedClick={onCitationLockedClick}
                isLoggedIn={citationIsLoggedIn}
              />
            </CardContent>
          </Card>
        )}

      {showNudge && (
        <div className="mt-4 animate-fade-in">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">
              🎉 Your first sheet is ready!
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Now lock it in — generate a flashcard deck from this topic and start
              drilling the key concepts with spaced repetition.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                className="w-full sm:w-auto h-10 rounded-xl btn-gradient font-semibold text-sm gap-2 px-6"
                onClick={() => {
                  const topic = (inputText || "").trim();
                  if (!topic) return;
                  setShowNudge(false);
                  window.dispatchEvent(
                    new CustomEvent("studybuddy:generate-flashcards", {
                      detail: { topic, cardCount: 5 },
                    })
                  );
                }}
              >
                <Layers className="h-4 w-4" />
                Generate flashcards now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowNudge(false)}
              >
                Maybe later
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Disclaimer Strip */}
      <div className="flex items-start justify-between gap-2 pt-1 animate-fade-in">
        <div className="flex items-start gap-1.5 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {!disclaimerCollapsed && (
            <p className="text-[11px] text-muted-foreground/50 leading-snug">
              AI-generated content · May contain errors · Not a substitute for clinical judgment
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleDisclaimer}
          className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          aria-label={disclaimerCollapsed ? "Expand disclaimer" : "Collapse disclaimer"}
        >
          {disclaimerCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default OutputSection;
