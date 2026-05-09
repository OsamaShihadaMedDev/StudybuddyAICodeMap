import { useState } from "react";
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
import {
  Loader2,
  Sparkles,
  BrainCircuit,
  MessageCircle,
  Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import OutputSection from "@/components/OutputSection";
import { useUsageLimit, MAX_DAILY_SHEETS } from "@/hooks/use-usage-limit";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import { parseFlashcardsFromOutput } from "@/lib/parse-flashcards";
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
  const [output, setOutput] = useState(prefill?.output ?? "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { sheetCount, isSheetLite, isProUser: pro, incrementSheet } = useUsageLimit();
  const { saveCards } = useFlashcardDeck();

  const generate = async (quizMode: boolean) => {
    if (!notes.trim()) {
      toast({ title: "Please enter medical notes", variant: "destructive" });
      return;
    }

    const isLite = isSheetLite;

    setLoading(true);
    setOutput("");

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

  return (
    <div className="space-y-6">
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
            <div className="text-center text-xs text-muted-foreground space-y-2">
              {sheetCount >= MAX_DAILY_SHEETS ? (
                <span className="text-amber-500 dark:text-amber-400 font-medium block">
                  Daily limit reached — Lite mode active
                </span>
              ) : (
                <span>{sheetCount} / {MAX_DAILY_SHEETS} uses today</span>
              )}
            </div>
          )}

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

      {output && (
        <OutputSection
          output={output}
          inputText={notes}
          modeInfo={{ examMode, difficulty, focus, length }}
        />
      )}
    </div>
  );
};

export default SheetGenerator;
