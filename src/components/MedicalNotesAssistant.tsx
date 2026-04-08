import { useState, useRef } from "react";
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
import { Stethoscope, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import GradientBackground from "@/components/GradientBackground";
import OutputSection from "@/components/OutputSection";

const MedicalNotesAssistant = () => {
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState("Basic");
  const [focus, setFocus] = useState("Quick Revision");
  const [length, setLength] = useState("Concise");
  const [examMode, setExamMode] = useState("General");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!notes.trim()) {
      toast({ title: "Please enter medical notes", variant: "destructive" });
      return;
    }

    setLoading(true);
    setOutput("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ notes, difficulty, focus, length, examMode }),
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

  return (
    <div className="relative min-h-screen">
      <GradientBackground />

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
            <ThemeToggle />
          </header>

          {/* Input Card */}
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

              {/* Generate Button */}
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
          {output && <OutputSection output={output} modeInfo={{ examMode, difficulty, focus, length }} />}
        </div>
      </div>
    </div>
  );
};

export default MedicalNotesAssistant;
