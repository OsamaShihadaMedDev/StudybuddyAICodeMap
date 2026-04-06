import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, List, HelpCircle } from "lucide-react";

interface OutputSectionProps {
  output: string;
}

const sectionConfig = {
  SUMMARY: { icon: BookOpen, label: "Summary" },
  "KEY POINTS": { icon: List, label: "Key Points" },
  FLASHCARDS: { icon: HelpCircle, label: "Flashcards" },
};

type SectionKey = keyof typeof sectionConfig;

function parseSections(text: string) {
  const sections: { title: SectionKey; content: string }[] = [];
  const keys = Object.keys(sectionConfig) as SectionKey[];
  const regex = new RegExp(`(${keys.join("|")})\\s*\\n`, "g");

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

function renderFlashcards(content: string) {
  const cards = content.split(/\n(?=Q:)/g).filter(Boolean);
  return (
    <div className="space-y-4">
      {cards.map((card, i) => {
        const lines = card.trim().split("\n");
        const q = lines.find((l) => l.startsWith("Q:"))?.replace(/^Q:\s*/, "") || "";
        const a = lines.find((l) => l.startsWith("A:"))?.replace(/^A:\s*/, "") || "";
        return (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-2 transition-all hover:shadow-md"
          >
            <p className="font-semibold text-foreground text-sm leading-relaxed">
              <span className="text-primary font-bold mr-1.5">Q:</span>
              {q}
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              <span className="font-bold mr-1.5">A:</span>
              {a}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const OutputSection = ({ output }: OutputSectionProps) => {
  const sections = parseSections(output);

  if (sections.length === 0) {
    return (
      <Card className="glass-card animate-fade-in">
        <CardContent className="p-6">
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{output}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map(({ title, content }) => {
        const config = sectionConfig[title];
        const Icon = config.icon;
        return (
          <Card key={title} className="glass-card animate-fade-in overflow-hidden">
            <div className="px-6 pt-5 pb-2 flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-bold tracking-wide text-foreground uppercase">
                {config.label}
              </h3>
            </div>
            <CardContent className="px-6 pb-6 pt-2">
              {title === "FLASHCARDS" ? (
                renderFlashcards(content)
              ) : (
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default OutputSection;
