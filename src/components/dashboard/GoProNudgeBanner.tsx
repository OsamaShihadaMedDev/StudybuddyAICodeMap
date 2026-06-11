import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import GoProModal from "@/components/GoProModal";

const GoProNudgeBanner = ({ isRealUser }: { isRealUser: boolean }) => {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isRealUser) return;
    const dismissed = localStorage.getItem("sb_gopro_nudge_dismissed");
    if (!dismissed) setShow(true);
  }, [isRealUser]);

  const dismiss = () => {
    localStorage.setItem("sb_gopro_nudge_dismissed", "1");
    setClosing(true);
    window.setTimeout(() => setShow(false), 260);
  };

  if (!show) return null;

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 mb-6 max-h-32 overflow-hidden animate-fade-in ${
          closing ? "banner-collapsing border-transparent" : ""
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-medium">Unlock Claude + unlimited generations</span>
            <span className="text-muted-foreground"> — Go Pro for Anthropic's AI and no limits.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-8 rounded-md font-medium text-xs px-3"
            onClick={() => setModalOpen(true)}
          >
            Go Pro
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
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
