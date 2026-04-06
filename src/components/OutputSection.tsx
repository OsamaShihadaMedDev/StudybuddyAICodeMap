import { useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, List, HelpCircle, Image } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import FlashcardsSection from "@/components/FlashcardsSection";
import VisualExplanations from "@/components/VisualExplanations";

interface OutputSectionProps {
  output: string;
}

const sectionConfig = {
  SUMMARY: { icon: BookOpen, label: "Summary", className: "section-summary" },
  "KEY POINTS": { icon: List, label: "Key Points", className: "section-keypoints" },
  "VISUAL EXPLANATIONS": { icon: Image, label: "Visual Explanations", className: "section-visuals" },
  FLASHCARDS: { icon: HelpCircle, label: "Flashcards", className: "section-flashcards" },
};

type SectionKey = keyof typeof sectionConfig;

function parseSections(text: string) {
  const sections: { title: SectionKey; content: string }[] = [];
  const keys = Object.keys(sectionConfig) as SectionKey[];
  // Sort by length descending so "VISUAL EXPLANATIONS" matches before "VISUAL"
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

const OutputSection = ({ output }: OutputSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const sections = parseSections(output);

  useEffect(() => {
    if (ref.current && sections.length > 0) {
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

  return (
    <div ref={ref} className="space-y-5">
      {sections.map(({ title, content }, idx) => {
        const config = sectionConfig[title];
        const Icon = config.icon;

        if (title === "VISUAL EXPLANATIONS") {
          return <VisualExplanations key={title} content={content} style={{ animationDelay: `${idx * 100}ms` }} />;
        }

        return (
          <Card
            key={title}
            className={`glass-card animate-fade-in overflow-hidden hover-lift ${config.className}`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="px-6 pt-5 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-bold tracking-wide text-foreground uppercase">
                  {config.label}
                </h3>
              </div>
              <CopyButton text={content} />
            </div>
            <CardContent className="px-6 pb-6 pt-2">
              {title === "FLASHCARDS" ? (
                <FlashcardsSection content={content} />
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
