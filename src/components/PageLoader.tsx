import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";

type LoaderContext = "session" | "cards" | "qbank" | "sheets" | "generic";

const MESSAGES: Record<LoaderContext, string[]> = {
  session: ["Loading your study session..."],
  cards: ["Fetching your cards...", "Loading your study session..."],
  qbank: ["Preparing your QBank...", "Loading your study session..."],
  sheets: ["Getting your sheets...", "Loading your study session..."],
  generic: [
    "Loading your study session...",
    "Fetching your cards...",
    "Preparing your QBank...",
    "Getting your sheets...",
  ],
};

interface PageLoaderProps {
  context?: LoaderContext;
  fullPage?: boolean;
}

/**
 * Full-page centered loading state built around the StudyBuddy logo mark.
 * Logo pulses (scale 1.0 → 1.05) on a 1.2s loop; the label below cycles
 * through medical-themed messages every 2s.
 */
const PageLoader = ({ context = "generic", fullPage = true }: PageLoaderProps) => {
  const messages = MESSAGES[context];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    const id = window.setInterval(
      () => setMsgIndex((i) => (i + 1) % messages.length),
      2000
    );
    return () => window.clearInterval(id);
  }, [messages.length]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-5 ${
        fullPage ? "min-h-[60vh]" : "py-12"
      }`}
    >
      <div className="loader-pulse flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-sm">
        <Stethoscope className="h-7 w-7 text-primary-foreground" />
      </div>

      <p
        key={msgIndex}
        className="animate-fade-in text-xs font-medium text-muted-foreground tracking-wide"
      >
        {messages[msgIndex]}
      </p>
    </div>
  );
};

export default PageLoader;
