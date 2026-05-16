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
import { Loader2, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import { useUsageLimit, MAX_DAILY_CARDS } from "@/hooks/use-usage-limit";
import { useCitationUsage } from "@/hooks/use-citation-usage";
import { usePremiumHook } from "@/hooks/use-premium-hook";
import { useModelPreference } from "@/hooks/use-model-preference";
import { useAuth } from "@/hooks/use-auth";
import { parseFlashcardsFromOutput } from "@/lib/parse-flashcards";
import { fetchBestCitation, type CitationResult } from "@/lib/citation";
import { saveCitationsForTopic } from "@/lib/citation-store";
import CitationCTABanner from "@/components/CitationCTABanner";
import CitationBadgeList from "@/components/CitationBadgeList";
import GoProModal from "@/components/GoProModal";
import AuthModal from "@/components/AuthModal";

type CitationState = "idle" | "loading" | "found" | "locked" | "hidden";

const FlashcardsGenerator = () => {
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState("12");
  const [examMode, setExamMode] = useState("General");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [pendingCards, setPendingCards] = useState<ReturnType<typeof parseFlashcardsFromOutput> | null>(null);
  const [showTextarea, setShowTextarea] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [citationState, setCitationState] = useState<CitationState>("idle");
  const [citations, setCitations] = useState<CitationResult[]>([]);
  const [goProOpen, setGoProOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { saveCards } = useFlashcardDeck();
  const {
    cardsCount,
    isCardsLimited,
    isProUser: pro,
    incrementCards,
  } = useUsageLimit();
  const { premiumRemaining, isPremiumHookActive } = usePremiumHook();
  const { preferredModel, setPreferredModel, saving: modelSaving } = useModelPreference();
  const { user, isAnonymous } = useAuth();
  const {
    canUseCitation,
    isLoggedIn,
    incrementCitation,
  } = useCitationUsage();
  const remaining = Math.max(0, MAX_DAILY_CARDS - cardsCount);

  const handleGenerate = async (overrideTopic?: string, overrideCardCount?: number) => {
    const activeTopic = overrideTopic ?? topic;
    const activeCardCount = overrideCardCount ?? parseInt(cardCount, 10);
    if (!activeTopic.trim()) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }
    if (isCardsLimited) {
      setGoProOpen(true);
      return;
    }
    setLoading(true);
    setCitationState("idle");
    setCitations([]);
    setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    try {
      await incrementCards();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            notes: activeTopic,
            examMode,
            difficulty: "Basic",
            focus: "Quick Revision",
            length: "Concise",
            cardsOnly: true,
            cardCount: activeCardCount,
            userId: user?.id ?? null,
            isAnonymous: isAnonymous ?? false,
            isPro: pro,
            preferredModel: pro ? preferredModel : undefined,
          }),
        }
      );

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
            if (content) fullText += content;
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      const parsed = parseFlashcardsFromOutput(fullText, activeTopic);
      setPendingCards(parsed);

      // Citation lookup — runs after cards are saved
      try {
        if (canUseCitation) {
          setCitationState("loading");
          const results = await fetchBestCitation(activeTopic);
          setCitations(results);
          setCitationState(results.length > 0 ? "found" : "hidden");
          if (results.length > 0) {
            saveCitationsForTopic(activeTopic, results);
            try {
              await incrementCitation();
            } catch {
              // ignore — citation already stored
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
      setPendingCards(null);
      toast({
        title: "Error",
        description: e.message || "Failed to generate flashcards",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!loading) return;

    const steps = [
      "Identifying key concepts…",
      "Building Q&A pairs…",
      "Calibrating difficulty…",
      "Adding clinical vignettes…",
      "Finalizing your deck…",
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
        setPendingCards((pending) => {
          if (pending !== null) {
            clearInterval(interval);
            (async () => {
              const added = await saveCards(pending);
              localStorage.setItem("sb_first_deck_seen", "1");
              toast({
                title: added > 0 ? `Added ${added} new cards to your deck` : "No new cards (all duplicates)",
              });
              setTopic("");
              setShowTextarea(false);
              setLoading(false);
              setLoadingMsg("");
              window.dispatchEvent(new CustomEvent("studybuddy:deck-saved"));
            })();
            return null;
          }
          return pending;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ topic: string; cardCount?: number }>).detail;
      if (!detail?.topic) return;
      setTopic(detail.topic);
      setShowTextarea(true);
      setCardCount(String(detail.cardCount ?? 5));
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      handleGenerate(detail.topic, detail.cardCount ?? 5);
    };
    window.addEventListener("studybuddy:generate-flashcards", handler);
    return () => window.removeEventListener("studybuddy:generate-flashcards", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
    <Card ref={cardRef} className="glass-card animate-fade-in border-primary/20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground">Generate Flashcards</h2>
        </div>
        {!isLoggedIn && (
          <CitationCTABanner onSignInClick={() => setAuthModalOpen(true)} />
        )}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Exam Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "General", label: "General" },
              { value: "USMLE Step 1", label: "Step 1" },
              { value: "USMLE Step 2", label: "Step 2" },
            ].map((opt) => {
              const active = examMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExamMode(opt.value)}
                  className={`h-10 rounded-lg text-sm font-semibold transition-all border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background/60 text-foreground/70 border-border/50 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
        {!showTextarea ? (
          <div className="rounded-xl border border-border/50 bg-background/60 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pick a topic to start — or type your own
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { emoji: "❤️", label: "Myocardial Infarction" },
                { emoji: "🫁", label: "Pneumonia" },
                { emoji: "🧠", label: "Ischemic Stroke" },
                { emoji: "🍬", label: "Diabetic Ketoacidosis" },
                { emoji: "🩺", label: "Nephrotic Syndrome" },
              ].map(({ emoji, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setTopic(label);
                    setShowTextarea(false);
                    handleGenerate(label);
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
              placeholder="Enter a topic to drill (e.g., 'DKA', 'Heart failure pharmacology')"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[100px] resize-y bg-background/60 border-border/50 focus:border-primary/40 transition-colors text-sm leading-relaxed"
            />
            {topic && (
              <button
                type="button"
                onClick={() => { setTopic(""); setShowTextarea(false); }}
                className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors text-lg leading-none"
                aria-label="Clear"
              >
                ×
              </button>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Number of cards
            </label>
            <Select value={cardCount} onValueChange={setCardCount}>
              <SelectTrigger className="bg-background/60 border-border/50 h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 cards</SelectItem>
                <SelectItem value="10">10 cards</SelectItem>
                <SelectItem value="12">12 cards</SelectItem>
                <SelectItem value="15">15 cards</SelectItem>
                <SelectItem value="20">20 cards</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full h-12 text-sm font-bold rounded-xl btn-gradient"
            onClick={() => handleGenerate()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Layers className="mr-2 h-4 w-4" />
                Generate Cards
              </>
            )}
          </Button>
        </div>
        {!pro && (
          <div className="text-center text-xs text-muted-foreground space-y-1">
            {isCardsLimited ? (
              <span className="text-amber-500 dark:text-amber-400 font-medium block">
                Daily limit reached · Resets at midnight
              </span>
            ) : (
              <span className="block">{remaining} / {MAX_DAILY_CARDS} cards generations today · Resets at midnight</span>
            )}
            {isPremiumHookActive ? (
              <span className="text-violet-400 font-medium block">
                ✦ {premiumRemaining} premium generation{premiumRemaining !== 1 ? "s" : ""} left ·{" "}
                <button
                  type="button"
                  className="underline hover:text-violet-300 transition-colors"
                  onClick={() => setGoProOpen(true)}
                >
                  Go Pro for unlimited
                </button>
              </span>
            ) : !isCardsLimited ? (
              <span className="text-muted-foreground/60 block">Powered by GPT-OSS 20B</span>
            ) : null}
          </div>
        )}
        {pro && (
          <div className="text-center text-xs text-muted-foreground">
            <span className="text-primary font-medium">
              ✦ Powered by {preferredModel === "gpt-oss" ? "GPT-OSS 20B" : "Gemini Flash"}
            </span>
            <span className="mx-2 opacity-40">·</span>
            <button
              type="button"
              className="underline hover:text-foreground transition-colors"
              onClick={() => setPreferredModel(preferredModel === "gpt-oss" ? "flash" : "gpt-oss")}
              disabled={modelSaving}
            >
              Switch to {preferredModel === "gpt-oss" ? "Gemini Flash" : "GPT-OSS 20B"}
            </button>
          </div>
        )}
        {citationState !== "idle" && citationState !== "hidden" && (
          <div className="pt-1">
            <CitationBadgeList
              state={citationState}
              citations={citations}
              onLockedClick={() =>
                isLoggedIn ? setGoProOpen(true) : setAuthModalOpen(true)
              }
              isLoggedIn={isLoggedIn}
            />
          </div>
        )}
      </CardContent>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <GoProModal open={goProOpen} onOpenChange={setGoProOpen} />
    </Card>

    {loading && (
      <div className="flex flex-col items-center justify-center gap-4 py-10 animate-fade-in">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
          <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground transition-all duration-300">
            {loadingMsg}
          </p>
          <p className="text-xs text-muted-foreground opacity-50">
            Building your exam-ready deck…
          </p>
        </div>
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
    </div>
  );
};

export default FlashcardsGenerator;