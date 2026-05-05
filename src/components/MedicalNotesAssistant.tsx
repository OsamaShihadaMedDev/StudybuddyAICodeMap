import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Loader2, Sparkles, BrainCircuit, MessageCircle, Mail, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import GradientBackground from "@/components/GradientBackground";
import OutputSection from "@/components/OutputSection";
import StudyHistoryModal from "@/components/StudyHistoryModal";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { checkUsage, incrementUsage, MAX_DAILY_USES, isProUser, activateProCode, isProExpired, clearProExpired } from "@/hooks/use-usage-limit";
import type { StudyHistoryItem } from "@/hooks/use-study-history";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import DueTodaySection from "@/components/DueTodaySection";
import StudyMode from "@/components/StudyMode";
import FlashcardsGenerator from "@/components/FlashcardsGenerator";
import DeckList from "@/components/DeckList";
import { parseFlashcardsFromOutput } from "@/lib/parse-flashcards";

const MedicalNotesAssistant = () => {
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState("Basic");
  const [focus, setFocus] = useState("Quick Revision");
  const [length, setLength] = useState("Concise");
  const [examMode, setExamMode] = useState("General");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [usageCount, setUsageCount] = useState(() => checkUsage().count);
  const [pro, setPro] = useState(() => isProUser());
  const [expired, setExpired] = useState(() => isProExpired());
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  const { allCards, dueCards, saveCards, reviewCard, deleteCard, stats } = useFlashcardDeck();
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyFilter, setStudyFilter] = useState<{ topic?: string; mode: "due" | "all-due" | "deck" | "all-cards" }>({ mode: "due" });

  const handleStartDue = () => {
    setStudyFilter({ mode: "due" });
    setStudyOpen(true);
  };
  const handleReviewAny = () => {
    setStudyFilter({ mode: "all-cards" });
    setStudyOpen(true);
  };
  const handleStudyDeck = (topic: string) => {
    setStudyFilter({ mode: "deck", topic });
    setStudyOpen(true);
  };
  const handleDeleteDeck = (topic: string) => {
    const toDelete = allCards.filter((c) => c.topic === topic);
    toDelete.forEach((c) => deleteCard(c.id));
    toast({ title: `Deleted ${toDelete.length} cards from "${topic}"` });
  };

  const studySessionCards = useMemo(() => {
    if (studyFilter.mode === "due") return dueCards;
    if (studyFilter.mode === "all-cards") return allCards;
    if (studyFilter.mode === "deck" && studyFilter.topic) {
      return allCards.filter((c) => c.topic === studyFilter.topic);
    }
    return dueCards;
  }, [studyFilter, dueCards, allCards]);

  const generate = async (quizMode: boolean) => {
    if (!notes.trim()) {
      toast({ title: "Please enter medical notes", variant: "destructive" });
      return;
    }

    // Re-check pro status (handles 30-day expiration)
    const currentlyPro = isProUser();
    if (currentlyPro !== pro) {
      setPro(currentlyPro);
      setExpired(isProExpired());
    }
    const { isLite } = checkUsage();

    setLoading(true);
    setOutput("");

    try {
      incrementUsage();
      setUsageCount(checkUsage().count);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ notes, difficulty, focus, length, examMode, lite: isLite, quizMode }),
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
            if (content) {
              fullText += content;
              setOutput(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (!fullText) setOutput("No response received.");

      // Auto-save flashcards (additive; never break flow)
      if (fullText && !quizMode) {
        try {
          const parsed = parseFlashcardsFromOutput(fullText, notes);
          if (parsed.length) saveCards(parsed);
        } catch {
          // silent
        }
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to generate study material",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => generate(false);
  const handleQuizMode = () => generate(true);

  const handleHistorySelect = (item: StudyHistoryItem) => {
    setNotes(item.input);
    setOutput(item.output);
    if (item.modeInfo) {
      setExamMode(item.modeInfo.examMode);
      setDifficulty(item.modeInfo.difficulty);
      setFocus(item.modeInfo.focus);
      setLength(item.modeInfo.length);
    }
  };

  return (
    <div className="relative min-h-screen">
      <GradientBackground />

      {studyOpen && (
        <StudyMode
          dueCards={studySessionCards}
          onReview={reviewCard}
          onClose={() => setStudyOpen(false)}
        />
      )}

      <div className="relative z-10 px-4 py-8 md:py-14">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Header */}
          <header className="flex items-start justify-between animate-fade-in">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                    StudyBuddy AI
                  </h1>
                  <p className="text-xs font-medium text-muted-foreground tracking-wide">
                    AI Medical Study Assistant
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StudyHistoryModal onSelect={handleHistorySelect} />
              <GoogleSignInButton />
              <ThemeToggle />
            </div>
          </header>

          <DueTodaySection
            total={stats.total}
            due={stats.due}
            mastered={stats.mastered}
            onStart={handleStartDue}
            onReviewAny={handleReviewAny}
          />

          <DeckList
            cards={allCards}
            onStudyDeck={handleStudyDeck}
            onDeleteDeck={handleDeleteDeck}
            onReviewAll={handleReviewAny}
          />

          {/* Flashcards Generator (primary) */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase pl-1">
              Flashcards
            </p>
            <FlashcardsGenerator />
          </div>

          {/* Section divider */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase pl-1">
              Full Study Sheet
            </p>
            <p className="text-xs text-muted-foreground pl-1 -mt-1">
              Or generate full study material
            </p>
          </div>

          {/* Input Card */}
          <Card className="glass-card animate-fade-in -mt-4">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Medical Notes
                </label>
                <Textarea
                  placeholder="Paste notes, type a topic, or say what you want to study…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[160px] resize-y bg-background/60 border-border/50 focus:border-primary/40 transition-colors text-sm leading-relaxed"
                />
              </div>

              {/* Options */}
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

              {/* Access Code / Pro Status */}
              {pro ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-primary">
                    ✅ Unlimited Access Activated
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Enter Access Code (optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={accessCode}
                      onChange={(e) => { setAccessCode(e.target.value); setCodeError(false); }}
                      className="bg-background/60 border-border/50 text-sm font-mono uppercase"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-10 border-primary/30"
                      onClick={() => {
                        if (activateProCode(accessCode)) {
                          setPro(true);
                          setExpired(false);
                          setCodeError(false);
                          clearProExpired();
                          toast({ title: "Pro access activated!" });
                        } else {
                          setCodeError(true);
                        }
                      }}
                    >
                      Activate
                    </Button>
                  </div>
                  {codeError && (
                    <p className="text-xs text-destructive">Invalid code</p>
                  )}
                  {expired && !codeError && (
                    <p className="text-xs text-amber-500 dark:text-amber-400">
                      Access expired — please enter a new code
                    </p>
                  )}
                </div>
              )}

              {/* Usage Indicator */}
              {!pro && (
                <div className="text-center text-xs text-muted-foreground space-y-2">
                  {usageCount >= MAX_DAILY_USES ? (
                    <span className="text-amber-500 dark:text-amber-400 font-medium block">
                      Daily limit reached — Lite mode active
                    </span>
                  ) : (
                    <span>{usageCount} / {MAX_DAILY_USES} uses today</span>
                  )}
                </div>
              )}

              {/* Always-visible Contact Section */}
              <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-3">
                  <span>Need full access?</span>
                  <a
                    href="https://wa.me/972592823030"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                  <a
                    href="mailto:Osama200az@gmail.com"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </a>
                </div>
                <span className="text-[11px] opacity-70">Access is granted manually</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  className="flex-1 h-12 text-sm font-bold rounded-xl btn-gradient"
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
                <Button
                  variant="outline"
                  className="h-12 px-5 text-sm font-bold rounded-xl border-primary/30 hover:bg-primary/10"
                  onClick={handleQuizMode}
                  disabled={loading}
                >
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  Test Me
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading Skeleton */}
          {loading && !output && (
            <div className="space-y-4 animate-fade-in">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Output */}
          {output && (
            <OutputSection
              output={output}
              inputText={notes}
              modeInfo={{ examMode, difficulty, focus, length }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MedicalNotesAssistant;
