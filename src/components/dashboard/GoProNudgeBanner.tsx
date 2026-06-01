import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import GoProModal from "@/components/GoProModal";

const GoProNudgeBanner = ({ isRealUser }: { isRealUser: boolean }) => {
  const [show, setShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isRealUser) return;
    const dismissed = localStorage.getItem("sb_gopro_nudge_dismissed");
    if (!dismissed) setShow(true);
  }, [isRealUser]);

  const dismiss = () => {
    localStorage.setItem("sb_gopro_nudge_dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 mb-6 animate-fade-in">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Unlock Claude + unlimited generations</span>
            <span className="text-muted-foreground"> — Go Pro for Anthropic's AI and no limits.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-8 rounded-lg btn-gradient font-semibold text-xs px-3"
            onClick={() => setModalOpen(true)}
          >
            Go Pro
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <GoProModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};

export default GoProNudgeBanner;
