import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Library as LibraryIcon, Sparkles, FileText, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DeckList from "@/components/DeckList";
import StudyMode from "@/components/StudyMode";
import OutputSection from "@/components/OutputSection";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import { useStudyHistory, type StudyHistoryItem } from "@/hooks/use-study-history";
import { useToast } from "@/hooks/use-toast";

type StudyFilter = { topic?: string; mode: "due" | "all-cards" | "deck" };

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const Library = () => {
  const { toast } = useToast();
  const { allCards, dueCards, reviewCard, deleteCard } = useFlashcardDeck();
  const { history, deleteItem } = useStudyHistory();

  const [studyOpen, setStudyOpen] = useState(false);
  const [studyFilter, setStudyFilter] = useState<StudyFilter>({ mode: "deck" });
  const [activeSheet, setActiveSheet] = useState<StudyHistoryItem | null>(null);

  const totalDecks = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCards) set.add(c.topic || "Untitled");
    return set.size;
  }, [allCards]);

  const handleStudyDeck = (topic: string) => {
    setStudyFilter({ mode: "deck", topic });
    setStudyOpen(true);
  };
  const handleReviewAll = () => {
    setStudyFilter({ mode: "all-cards" });
    setStudyOpen(true);
  };
  const handleDeleteDeck = (topic: string) => {
    const toDelete = allCards.filter((c) => c.topic === topic);
    toDelete.forEach((c) => deleteCard(c.id));
    toast({ title: `Deleted ${toDelete.length} cards from "${topic}"` });
  };

  const studySessionCards = useMemo(() => {
    if (studyFilter.mode === "all-cards") return allCards;
    if (studyFilter.mode === "deck" && studyFilter.topic) {
      return allCards.filter((c) => c.topic === studyFilter.topic);
    }
    return dueCards;
  }, [studyFilter, dueCards, allCards]);

  const handleDeleteSheet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void deleteItem(id);
  };

  return (
    <DashboardLayout>
      {studyOpen && (
        <StudyMode
          dueCards={studySessionCards}
          onReview={reviewCard}
          onClose={() => setStudyOpen(false)}
        />
      )}

      <div className="space-y-6">
        <header className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <LibraryIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Everything you've created
            </p>
          </div>
        </header>

        <Tabs defaultValue="decks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="decks">Decks</TabsTrigger>
            <TabsTrigger value="sheets">Sheets</TabsTrigger>
          </TabsList>

          <TabsContent value="decks" className="pt-4">
            {totalDecks === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">
                      No decks yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Generate flashcards from a topic to build your first deck.
                    </p>
                  </div>
                  <Button asChild className="btn-gradient h-10 rounded-xl px-5 font-semibold">
                    <Link to="/dashboard">Create your first deck</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <DeckList
                cards={allCards}
                onStudyDeck={handleStudyDeck}
                onDeleteDeck={handleDeleteDeck}
                onReviewAll={handleReviewAll}
              />
            )}
          </TabsContent>

          <TabsContent value="sheets" className="pt-4">
            {history.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="p-8 flex flex-col items-center text-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">
                      No saved sheets yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Generate a study sheet and save it to see it here.
                    </p>
                  </div>
                  <Button asChild className="btn-gradient h-10 rounded-xl px-5 font-semibold">
                    <Link to="/dashboard">Generate your first study sheet</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {history.map((item) => {
                  const preview =
                    (item.input || item.output)
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 160) ?? "";
                  return (
                    <Card
                      key={item.id}
                      className="glass-card cursor-pointer hover:border-primary/30 transition-colors group"
                      onClick={() => setActiveSheet(item)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {item.topic}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {preview}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            {timeAgo(item.timestamp)}
                            {item.modeInfo && (
                              <span className="ml-1.5 opacity-60">
                                · {item.modeInfo.examMode}
                              </span>
                            )}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => handleDeleteSheet(item.id, e)}
                          aria-label="Delete sheet"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={!!activeSheet}
        onOpenChange={(o) => !o && setActiveSheet(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{activeSheet?.topic}</DialogTitle>
          </DialogHeader>
          {activeSheet && (
            <ScrollArea className="max-h-[70vh] pr-2">
              <OutputSection
                output={activeSheet.output}
                inputText={activeSheet.input}
                modeInfo={activeSheet.modeInfo}
              />
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Library;
