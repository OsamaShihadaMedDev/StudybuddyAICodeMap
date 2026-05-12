import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Layers, Brain, ArrowRight, Zap } from "lucide-react";

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
      <header className="flex items-center px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-extrabold text-foreground tracking-tight">StudyBuddy</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-8 py-16">
        <div className="space-y-4 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Zap className="h-3 w-3" />
            Built for medical students
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Exam-ready notes
            <br />
            <span className="text-primary">in 10 seconds.</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
            No prompting. No setup. Type a topic and get structured study sheets
            with memory hooks, exam traps, and instant flashcard decks. The
            fastest way for medical students to study smarter.
          </p>
        </div>

        {/* Single CTA — only way off this page */}
        <Button
          className="h-14 px-10 rounded-2xl btn-gradient font-bold text-base gap-2 shadow-lg"
          onClick={() => navigate("/dashboard?start=sheet")}
        >
          Generate my first study sheet
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-xs text-muted-foreground opacity-60">
          Free to start · No credit card needed
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 max-w-md pt-2">
          {[
            { icon: FileText, label: "Exam-focused sheets" },
            { icon: Layers, label: "Auto flashcard decks" },
            { icon: Brain, label: "Spaced repetition" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground opacity-40">
          Designed for USMLE Step 1, Step 2 & General med students
        </p>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground opacity-30">
        © {new Date().getFullYear()} StudyBuddy
      </footer>
    </div>
  );
};

export default Index;
