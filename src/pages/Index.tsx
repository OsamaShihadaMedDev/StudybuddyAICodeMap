import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  FileText,
  Layers,
  Brain,
  ArrowRight,
  BookMarked,
} from "lucide-react";

const APP_STORAGE_KEYS = [
  "sb_welcomed",
  "sb_first_sheet_seen",
  "sb_first_deck_seen",
  "sb_sheet_hint_dismissed",
  "studybuddy_decks_v1",
  "studybuddy_history",
  "theme",
];

const hasUsedAppBefore = () =>
  APP_STORAGE_KEYS.some((key) => localStorage.getItem(key) !== null);

const Index = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (hasUsedAppBefore()) {
      navigate("/dashboard", { replace: true });
    } else {
      setReady(true);
    }
  }, [navigate]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal nav — no sign-in link, single focus */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Stethoscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              StudyBuddy
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Built for medical students · Evidence-backed
        </div>

        <h1 className="mt-8 text-5xl font-semibold leading-[1.06] tracking-[-0.035em] text-foreground sm:text-6xl">
          Exam-ready notes
          <br />
          <span className="text-primary">in 10 seconds.</span>
        </h1>

        <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
          No prompting. No setup. Type a topic and get structured study sheets
          with memory hooks, exam traps, and instant flashcard decks — each
          backed by PubMed-cited literature.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Button
            className="h-11 gap-2 rounded-lg px-6 text-sm font-medium"
            onClick={() => navigate("/dashboard?start=sheet")}
          >
            Generate my first study sheet
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Free to start · No credit card needed
          </p>
        </div>

        <div className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookMarked className="h-3.5 w-3.5 text-primary" />
          Every generation cited from peer-reviewed PubMed literature
        </div>

        {/* Feature row */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {[
            { icon: FileText, label: "Exam-focused sheets" },
            { icon: Layers, label: "Auto flashcard decks" },
            { icon: Brain, label: "Spaced repetition" },
            { icon: BookMarked, label: "PubMed-cited sources" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon className="h-4 w-4 text-foreground/40" />
              {label}
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground/60">
          Designed for USMLE Step 1, Step 2 & General med students
        </p>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-center px-6">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} StudyBuddy · For educational use only
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
