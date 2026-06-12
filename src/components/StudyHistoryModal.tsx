import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2 } from "lucide-react";
import {
  useStudyHistory,
  type StudyHistoryItem,
} from "@/hooks/use-study-history";
import { timeAgo } from "@/lib/utils";

interface Props {
  onSelect: (item: StudyHistoryItem) => void;
}

const StudyHistoryModal = ({ onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const { history: items, deleteItem } = useStudyHistory();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void deleteItem(id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <History className="h-3.5 w-3.5" />
          Study History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Study History</DialogTitle>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No saved studies yet. Generate and save study material to see it here.
          </p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-secondary/60 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.topic}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => handleDelete(item.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default StudyHistoryModal;
