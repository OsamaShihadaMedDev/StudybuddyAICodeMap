import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OutputSection, { type CitationState } from "@/components/OutputSection";
import { useUsageLimit, MAX_DAILY_SHEETS } from "@/hooks/use-usage-limit";
import { useCitationUsage } from "@/hooks/use-citation-usage";
import { usePremiumHook } from "@/hooks/use-premium-hook";
import { useModelPreference } from "@/hooks/use-model-preference";
import { useAuth } from "@/hooks/use-auth";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import { parseFlashcardsFromOutput } from "@/lib/parse-flashcards";
import { sanitizeJsonOutput } from "@/lib/sanitize-json";
import {
  type GeneratedSheet,
  parseStoredSheet,
  isJsonSheet,
} from "@/types/generated-sheet";
import { fetchBestCitation, type CitationResult } from "@/lib/citation";
import CitationCTABanner from "@/components/CitationCTABanner";
import AuthModal from "@/components/AuthModal";
import GoProModal from "@/components/GoProModal";
import type { StudyHistoryItem } from "@/hooks/use-study-history";

export interface SheetGeneratorPrefill {
  input: string;
  output: string;
  modeInfo?: StudyHistoryItem["modeInfo"];
}

interface SheetGeneratorProps {
  prefill?: SheetGeneratorPrefill | null;
}

const SheetGenerator = ({ prefill }: SheetGeneratorProps) => {
  const [notes, setNotes] = useState(prefill?.input ?? "");
  const [difficulty, setDifficulty] = useState(prefill?.modeInfo?.difficulty ?? "Basic");
  const [focus, setFocus] = useState(prefill?.modeInfo?.focus ?? "Quick Revision");
  const [length, setLength] = useState(prefill?.modeInfo?.length ?? "Concise");
  const [examMode, setExamMode] = useState(prefill?.modeInfo?.examMode ?? "General");
  const [sheet, setSheet] = useState<GeneratedSheet | null>(
    prefill?.output ? parseStoredSheet(prefill.output) : null
  );
  // Legacy fallback: if the prefill is an old text blob, keep it as a
  // plain string for the OutputSection legacy renderer
  const [legacyOutput, setLegacyOutput] = useState<string>(
    prefill?.output && !isJsonSheet(prefill.output) ? prefill.output : ""
  );
  const [modelUsed, setModelUsed] = useState<"flash" | "gpt-oss" | "claude" | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [pendingOutput, setPendingOutput] = useState<string | null>(null);
  const [showTextarea, setShowTextarea] = useState(false);
  const [citationState, setCitationState] = useState<CitationState>("idle");
  const [citations, setCitations] = useState<CitationResult[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [goProOpen, setGoProOpen] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { sheetCount, isSheetLimited, isProUser: pro, incrementSheet } = useUsageLimit();
  const { premiumRemaining, isPremiumHookActive } = usePremiumHook();
  const { preferredModel, setPreferredModel, saving: modelSaving } = useModelPreference();
  const { user, isAnonymous } = useAuth();
  const {
    canUseCitation,
    isLoggedIn,
    incrementCitation,
  } = useCitationUsage();
  const { saveCards } = useFlashcardDeck();

  const generate = async (overrideNotes?: string) => {
    const activeNotes = overrideNotes ?? notes;
    if (!activeNotes.trim()) {
      toast({ title: "Please enter medical notes", variant: "destructive" });
      return;
    }
    if (isSheetLimited) {
      setGoProOpen(true);
      return;
    }
    setLoading(true);
    setSheet(null);
    setLegacyOutput("");
    setDeckSaved(false);
    setPendingOutput(null);
    setShowTextarea(false);
    setCitationState("idle");
    setCitations([]);

    setTimeout(() => {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    try {
      await incrementSheet();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            notes: activeNotes,
            difficulty,
            focus,
            length,
            examMode,
            userId: user?.id ?? null,
            isAnonymous: isAnonymous ?? false,
            isPro: pro,
            preferredModel: pro ? preferredModel : undefined,
          }),
        }
      );

      const xModel = response.headers.get("X-Model-Used") ?? "";
      const resolvedModel = xModel.includes("gpt-oss")
        ? "gpt-oss"
        : xModel.includes("claude-haiku")
        ? "claude"
        : "flash";
      setModelUsed(resolvedModel);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      const rawText = fullText || "";
      setPendingOutput(rawText);

      // Citation lookup — runs after stream completes
      try {
        if (canUseCitation) {
          setCitationState("loading");
          const results = await fetchBestCitation(activeNotes);
          setCitations(results);
          setCitationState(results.length > 0 ? "found" : "hidden");
          if (results.length > 0) {
            try {
              await incrementCitation();
            } catch {
              // ignore — citation already shown
            }
          }
        } else if (isLoggedIn) {
          setCitationState("locked");
        } else {
          setCitationState("hidden");
        }
      } catch {
        setCitationState("hidden");
      }
    } catch (e: any) {
      setLoading(false);
      setLoadingMsg("");
      setPendingOutput(null);
      toast({
        title: "Error",
        description: e.message || "Failed to generate study material",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    function handleEnhancementSaved(e: Event) {
      const { key, result } = (e as CustomEvent).detail ?? {};
      if (!key || !result) return;
      setSheet((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          enhancements: { ...(prev.enhancements ?? {}), [key]: result },
        };
      });
    }
    window.addEventListener("studybuddy:enhancement-saved", handleEnhancementSaved);
    return () =>
      window.removeEventListener("studybuddy:enhancement-saved", handleEnhancementSaved);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const steps = [
      "Reading topic…",
      "Structuring notes…",
      "Finding exam traps…",
      "Adding memory hooks…",
      "Finalizing your sheet…",
    ];

    let currentStep = 0;
    let allStepsDone = false;
    setLoadingMsg(steps[0]);

    const interval = setInterval(() => {
      currentStep += 1;

      if (currentStep < steps.length) {
        setLoadingMsg(steps[currentStep]);
      } else {
        allStepsDone = true;
        setLoadingMsg(steps[steps.length - 1]);
      }

      if (allStepsDone) {
        setPendingOutput((pending) => {
          if (pending !== null) {
            clearInterval(interval);
            const cleaned = sanitizeJsonOutput(pending);
            try {
              const parsed = JSON.parse(cleaned) as GeneratedSheet;
              setSheet(parsed);
              setLegacyOutput("");
            } catch {
              // JSON parse failed — fall back to legacy text renderer
              setSheet(null);
              setLegacyOutput(pending);
            }
            setLoading(false);
            setLoadingMsg("");
            return null;
          }
          return pending;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = () => {
    setDeckSaved(false);
    generate();
  };

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase pl-1">
          Full Study Sheet
        </p>
        <p className="text-xs text-muted-foreground pl-1 -mt-1">
          Or generate full study material
        </p>
      </div>

      <Card className="glass-card animate-fade-in">
        <CardContent className="p-6 space-y-5">
          {!isLoggedIn && (
            <CitationCTABanner onSignInClick={() => setAuthModalOpen(true)} />
          )}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Medical Notes
            </label>
            {!showTextarea ? (
              <div className="rounded-xl border border-border/50 bg-background/60 p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pick a topic to start — or type your own
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { emoji: "❤️", label: "Heart Failure" },
                    { emoji: "🫁", label: "Pneumonia" },
                    { emoji: "🧠", label: "Ischemic Stroke" },
                    { emoji: "🍬", label: "Diabetic Ketoacidosis" },
                    { emoji: "🩺", label: "Nephrotic Syndrome" },
                  ].map(({ emoji, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setNotes(label);
                        setShowTextarea(false);
                        generate(label);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer"
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowTextarea(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border border-dashed border-border/60 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-primary transition-all cursor-pointer"
                  >
                    ✏️ Type my own topic
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Textarea
                  autoFocus
                  placeholder="Paste notes, type a topic, or say what you want to study…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px] resize-y bg-background/60 border-border/50 focus:border-primary/40 transition-colors text-sm leading-relaxed"
                />
                {notes && (
                  <button
                    type="button"
                    onClick={() => { setNotes(""); setShowTextarea(false); }}
                    className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors text-lg leading-none"
                    aria-label="Clear"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Exam Mode
              </label>
              <Select value={examMode} onValueChange={setExamMode}>
                <SelectTrigger className="bg-background/60 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="USMLE Step 1">USMLE Step 1</SelectItem>
                  <SelectItem value="USMLE Step 2">USMLE Step 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Difficulty
              </label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-background/60 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Focus
              </label>
              <Select value={focus} onValueChange={setFocus}>
                <SelectTrigger className="bg-background/60 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Quick Revision">Quick Revision</SelectItem>
                  <SelectItem value="Deep Understanding">Deep Understanding</SelectItem>
                  <SelectItem value="Clinical Reasoning">Clinical Reasoning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Length
              </label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger className="bg-background/60 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Concise">Concise</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {pro && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-primary">
                ✅ Unlimited Access Activated
              </p>
            </div>
          )}

          {!pro && (
            <div className="text-center text-xs text-muted-foreground space-y-1">
              {isSheetLimited ? (
                <span className="text-amber-500 dark:text-amber-400 font-medium block">
                  Daily limit reached ·{" "}
                  <button
                    type="button"
                    className="underline hover:text-amber-400 transition-colors"
                    onClick={() => setGoProOpen(true)}
                  >
                    Go Pro for Claude + unlimited
                  </button>
                </span>
              ) : (
                <span>{sheetCount} / {MAX_DAILY_SHEETS} uses today · Resets at midnight</span>
              )}
              {isPremiumHookActive ? (
                <span className="text-violet-400 font-medium block">
                  ✦ {premiumRemaining} Claude generation{premiumRemaining !== 1 ? "s" : ""} left ·{" "}
                  <button
                    type="button"
                    className="underline hover:text-violet-300 transition-colors"
                    onClick={() => setGoProOpen(true)}
                  >
                    Go Pro for unlimited Claude
                  </button>
                </span>
              ) : !isSheetLimited ? (
                <span className="text-muted-foreground/60 block">
                  Powered by GPT-OSS 20B
                </span>
              ) : null}
            </div>
          )}
          {pro && (
            <div className="rounded-lg border border-border/30 bg-background/40 px-4 py-3 space-y-2">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase text-center">
                AI Model
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreferredModel("gpt-oss")}
                  disabled={modelSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    preferredModel !== "claude"
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  GPT-OSS 20B
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredModel("claude")}
                  disabled={modelSaving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    preferredModel === "claude"
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  ✦ Claude Haiku 4.5
                </button>
              </div>
              {modelSaving && (
                <p className="text-[11px] text-muted-foreground/50 text-center">Saving preference…</p>
              )}
            </div>
          )}

          <Button
            className="w-full h-12 text-sm font-bold rounded-xl btn-gradient"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Study Material
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      </div>{/* end max-w-2xl controls wrapper */}

      <div ref={outputRef}>
      {loading && !sheet && !legacyOutput && (
        <div className="flex flex-col items-center justify-center gap-4 py-14 animate-fade-in">
          {/* Spinner */}
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          </div>

          {/* Step message */}
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-foreground transition-all duration-300">
              {loadingMsg}
            </p>
            <p className="text-xs text-muted-foreground opacity-50">
              Building your exam-ready sheet…
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              Takes a little longer during peak hours — hang tight
            </p>
          </div>

          {/* Pulsing dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {(sheet || legacyOutput) && (
        <OutputSection
          output={sheet ? JSON.stringify(sheet) : legacyOutput}
          inputText={notes}
          modeInfo={{ examMode, difficulty, focus, length }}
          citations={citations}
          citationState={citationState}
          modelUsed={modelUsed}
          isPro={pro}
          userId={user?.id ?? null}
          isAnonymous={isAnonymous ?? false}
          sheetId={notes}
          onCitationLockedClick={() =>
            isLoggedIn ? setGoProOpen(true) : setAuthModalOpen(true)
          }
          citationIsLoggedIn={isLoggedIn}
        />
      )}
      </div>

      {(sheet || legacyOutput) && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            className="h-10 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-semibold text-sm px-5"
            disabled={deckSaved}
            onClick={() => {
              try {
                if (sheet?.flashcards?.length) {
                  const parsed = sheet.flashcards.map((c) => ({
                    question: c.question,
                    answer: c.answer,
                    tag: c.tag,
                    topic: notes.trim().slice(0, 60),
                    topicEmoji: sheet.topicEmoji,
                  }));
                  saveCards(parsed);
                  setDeckSaved(true);
                  toast({ title: `${parsed.length} cards saved to your library` });
                } else if (legacyOutput) {
                  // Legacy fallback for old text-blob sheets
                  const parsed = parseFlashcardsFromOutput(legacyOutput, notes);
                  if (parsed.length) {
                    saveCards(parsed);
                    setDeckSaved(true);
                    toast({ title: `${parsed.length} cards saved to your library` });
                  } else {
                    toast({ title: "No flashcards found in this sheet", variant: "destructive" });
                  }
                } else {
                  toast({ title: "No flashcards found in this sheet", variant: "destructive" });
                }
              } catch {
                toast({ title: "Could not parse flashcards", variant: "destructive" });
              }
            }}
          >
            {deckSaved ? "✓ Deck saved" : "＋ Save deck to library"}
          </Button>
        </div>
      )}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <GoProModal open={goProOpen} onOpenChange={setGoProOpen} />
    </div>
  );
};

export default SheetGenerator;
