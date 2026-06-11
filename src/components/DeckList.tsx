import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Card as DeckCard } from "@/hooks/use-flashcard-deck";

interface DeckListProps {
  cards: DeckCard[];
  onStudyDeck: (topic: string) => void;
  onDeleteDeck: (topic: string) => void;
  onReviewAll: () => void;
}

const PALETTE = [
  { bg: "bg-slate-500/20", text: "text-slate-500/80 dark:text-slate-300" },
  { bg: "bg-violet-500/20", text: "text-violet-500/80 dark:text-violet-300" },
  { bg: "bg-teal-500/20", text: "text-teal-500/80 dark:text-teal-300" },
  { bg: "bg-rose-500/20", text: "text-rose-500/80 dark:text-rose-300" },
  { bg: "bg-amber-500/20", text: "text-amber-500/80 dark:text-amber-300" },
  { bg: "bg-sky-500/20", text: "text-sky-500/80 dark:text-sky-300" },
];

function hashTopic(topic: string): number {
  let h = 0;
  for (let i = 0; i < topic.length; i++) {
    h = (h * 31 + topic.charCodeAt(i)) >>> 0;
  }
  return h;
}

interface DeckSummary {
  topic: string;
  total: number;
  mastered: number;
  due: number;
  latest: number;
  emoji?: string;
}

const DeckList = ({ cards, onStudyDeck, onDeleteDeck, onReviewAll }: DeckListProps) => {
  const [pendingDelete, setPendingDelete] = useState<DeckSummary | null>(null);

  const decks = useMemo<DeckSummary[]>(() => {
    const now = Date.now();
    const map = new Map<string, DeckSummary>();
    for (const c of cards) {
      const key = c.topic || "Untitled";
      const cur = map.get(key) ?? { topic: key, total: 0, mastered: 0, due: 0, latest: 0, emoji: undefined as string | undefined };
      cur.total += 1;
      if (c.interval >= 21) cur.mastered += 1;
      if (c.dueAt <= now) cur.due += 1;
      if (c.createdAt > cur.latest) cur.latest = c.createdAt;
      if (!cur.emoji && c.topicEmoji) cur.emoji = c.topicEmoji;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.latest - a.latest);
  }, [cards]);

  if (cards.length === 0) return null;

  return (
    <>
      <Card className="glass-card animate-fade-in rounded-xl">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              My Decks
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onReviewAll}
              disabled={decks.length < 2}
              className="h-8 rounded-md text-xs font-medium"
            >
              Mix All Decks
            </Button>
          </div>
          <div className="space-y-1">
            {decks.map((deck) => {
              const color = PALETTE[hashTopic(deck.topic) % PALETTE.length];
              const ratio = deck.total > 0 ? (deck.mastered / deck.total) * 100 : 0;
              const initial = (deck.topic[0] || "?").toUpperCase();
              return (
                <div
                  key={deck.topic}
                  className="rounded-md p-2.5 hover:bg-accent/60 transition-colors flex items-center gap-3"
                >
                  <button
                    onClick={() => onStudyDeck(deck.topic)}
                    className="flex-1 flex items-center gap-3 text-left cursor-pointer min-w-0"
                  >
                    <div
                      className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center font-semibold text-sm ${color.bg} ${color.text}`}
                    >
                      {deck.emoji || initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{deck.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {deck.total} cards · {deck.mastered} mastered
                        {deck.due > 0 ? ` · ${deck.due} due` : ""}
                      </p>
                    </div>
                    <div className="hidden sm:block w-20 h-1 bg-border rounded-full overflow-hidden shrink-0">
                      <div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onStudyDeck(deck.topic)}>
                        Study deck
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setPendingDelete(deck)}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete deck
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this deck?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove all {pendingDelete?.total} cards in "
              {pendingDelete?.topic}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) onDeleteDeck(pendingDelete.topic);
                setPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeckList;