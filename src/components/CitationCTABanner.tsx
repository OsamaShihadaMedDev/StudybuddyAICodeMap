import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CitationCTABannerProps {
  onSignInClick: () => void;
}

const CitationCTABanner = ({ onSignInClick }: CitationCTABannerProps) => {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-background">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
      </div>
      <p className="flex-1 text-xs text-muted-foreground leading-snug">
        Try it free — get 1 cited generation today, no account needed
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onSignInClick}
        className="h-8 px-3 text-xs font-medium"
      >
        Sign In
      </Button>
    </div>
  );
};

export default CitationCTABanner;
