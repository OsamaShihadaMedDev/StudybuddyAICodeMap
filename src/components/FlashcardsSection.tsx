import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

interface FlashcardsSectionProps {
  content: string;
}

const FlashcardsSection = ({ content }: FlashcardsSectionProps) => {
  const [showAll, setShowAll] = useState(false);

  const cards = content.split(/\n(?=Q:)/g).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-muted-foreground hover:text-foreground h-7"
        >
          {showAll ? <><EyeOff className="h-3.5 w-3.5 mr-1" /> Hide All</> : <><Eye className="h-3.5 w-3.5 mr-1" /> Show All</>}
        </Button>
      </div>
      {cards.map((card, i) => {
        const lines = card.trim().split("\n");
        const q = lines.find((l) => l.startsWith("Q:"))?.replace(/^Q:\s*/, "") || "";
        const a = lines.find((l) => l.startsWith("A:"))?.replace(/^A:\s*/, "") || "";
        return <FlipCard key={i} question={q} answer={a} forceShow={showAll} />;
      })}
    </div>
  );
};

function FlipCard({ question, answer, forceShow }: { question: string; answer: string; forceShow: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const isOpen = forceShow || revealed;

  return (
    <div
      onClick={() => setRevealed(!revealed)}
      className="perspective cursor-pointer"
    >
      <div className={`rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-2 transition-all hover:shadow-md hover:-translate-y-0.5 ${isOpen ? 'ring-1 ring-primary/20' : ''}`}>
        <p className="font-semibold text-foreground text-sm leading-relaxed">
          <span className="text-primary font-bold mr-1.5">Q:</span>
          {question}
        </p>
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <p className="text-muted-foreground text-sm leading-relaxed pt-1 border-t border-border/40">
            <span className="font-bold mr-1.5 text-accent">A:</span>
            {answer}
          </p>
        </div>
        {!isOpen && (
          <p className="text-xs text-muted-foreground/60 italic">Click to reveal answer</p>
        )}
      </div>
    </div>
  );
}

export default FlashcardsSection;
