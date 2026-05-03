import { useEffect, useState } from "react";
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
import {
  checkCardsUsage,
  incrementCardsUsage,
  isProUser,
  MAX_DAILY_CARDS,
} from "@/hooks/use-usage-limit";

function parseFlashcardsFromOutput(output: string, topic: string) {
  const idx = output.search(/FLASHCARDS/i);
  if (idx === -1) return [];
  let section = output.slice(idx).replace(/^FLASHCARDS[^\n]*\n?/i, "");
  const stop = section.search(/\n\s*REFERENCE NOTE\b/i);
  if (stop !== -1) section = section.slice(0, stop);
  const cards: { question: string; answer: string; tag: string; topic: string }[] = [];
  const regex = /Q\s*:\s*([\s\S]*?)\n\s*A\s*:\s*([\s\S]*?)(?=\n\s*Q\s*:|$)/gi;
  const truncatedTopic = topic.trim().slice(0, 60);
  let m: RegExpExecArray | null;
  while ((m = regex.exec(section)) !== null) {
    let question = m[1].trim();
    const answer = m[2].trim();
    if (!question || !answer) continue;
    let tag = "";
    const tagMatch = question.match(/^\s*\[([^\]]+)\]\s*/);
    if (tagMatch) {
      tag = tagMatch[1].trim();
      question = question.slice(tagMatch[0].length).trim();
    }
    cards.push({ question, answer, tag, topic: truncatedTopic });
  }
  return cards;
}

interface FlashcardsGeneratorProps {
  examMode: string;
}

const FlashcardsGenerator = ({ examMode }: FlashcardsGeneratorProps) => {
  const [topic, setTopic] = useState("");
  const [cardCount, setCardCount] = useState("12");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { saveCards } = useFlashcardDeck();
  const [pro, setPro] = useState(() => isProUser());
  const [usage, setUsage] = useState(() => checkCardsUsage());
  const remaining = Math.max(0, MAX_DAILY_CARDS - usage.count);

  useEffect(() => {
    const refresh = () => {
      setPro(isProUser());
      setUsage(checkCardsUsage());
    };
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key && (e.key.includes("studybuddy_usage") || e.key.includes("pro"))) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }
    const { isLite } = checkCardsUsage();
    setLoading(true);
    try {
      incrementCardsUsage();
      setUsage(checkCardsUsage());

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/medical-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            notes: topic,
            examMode,
            difficulty: "Basic",
            focus: "Quick Revision",
            length: "Concise",
            cardsOnly: true,
            cardCount: parseInt(cardCount, 10),
            lite: isLite,
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

      const parsed = parseFlashcardsFromOutput(fullText, topic);
      const added = saveCards(parsed);
      toast({
        title: added > 0 ? `Added ${added} new cards to your deck` : "No new cards (all duplicates)",
      });
      setTopic("");
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to generate flashcards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card animate-fade-in border-primary/20">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground">Generate Flashcards</h2>
        </div>
        <Textarea
          placeholder="Enter a topic to drill (e.g., 'DKA', 'Heart failure pharmacology')"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="min-h-[100px] resize-y bg-background/60 border-border/50 focus:border-primary/40 transition-colors text-sm leading-relaxed"
        />
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
                <Layers className="mr-2 h-4 w-4" />
                Generate Cards
              </>
            )}
          </Button>
        </div>
        {!pro && (
          <p className="text-center text-xs text-muted-foreground">
            {usage.isLite ? (
              <span className="text-amber-500 dark:text-amber-400 font-medium">
                Daily limit reached — Lite mode (6 cards)
              </span>
            ) : (
              <>{remaining} / {MAX_DAILY_CARDS} cards generations today</>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FlashcardsGenerator;