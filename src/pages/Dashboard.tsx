import { useNavigate } from "react-router-dom";
import { FileText, Layers, FlaskConical, Stethoscope } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsStrip from "@/components/dashboard/StatsStrip";
import GoProNudgeBanner from "@/components/dashboard/GoProNudgeBanner";
import WelcomeModal from "@/components/WelcomeModal";
import { useAuth } from "@/hooks/use-auth";
import { useFlashcardDeck } from "@/hooks/use-flashcard-deck";
import { useSheetsStats } from "@/hooks/use-sheets-stats";

interface ActiveToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stat: React.ReactNode;
  ctaLabel: string;
  onClick: () => void;
}

interface ComingSoonCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ActiveToolCard = ({
  icon,
  title,
  description,
  stat,
  ctaLabel,
  onClick,
}: ActiveToolCardProps) => (
  <div
    onClick={onClick}
    className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-6 cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 animate-fade-in"
  >
    <div className="space-y-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
        <span className="text-primary">{icon}</span>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-extrabold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>

    <div className="mt-6 flex items-end justify-between gap-3">
      <div className="text-sm text-muted-foreground">{stat}</div>
      <span className="inline-flex items-center rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {ctaLabel} →
      </span>
    </div>
  </div>
);

const ComingSoonCard = ({ icon, title, description }: ComingSoonCardProps) => (
  <div className="group relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card/50 p-6 opacity-80 cursor-default transition-all duration-300 hover:opacity-70 overflow-hidden">
    <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent" />

    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/50">
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
          Coming Soon
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-extrabold tracking-tight text-foreground/75">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground/85 leading-relaxed">
          {description}
        </p>
      </div>
    </div>

    <div className="mt-6 h-8" />
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAnonymous } = useAuth();
  const { stats } = useFlashcardDeck();
  const { sheetsThisWeek, isAnonymous: sheetsAnon } = useSheetsStats();

  const sheetStat = sheetsAnon ? (
    <span className="text-[11px] text-muted-foreground/70 italic">
      Sign in to track your stats
    </span>
  ) : sheetsThisWeek === null ? (
    <span className="text-[11px] text-muted-foreground/50">Loading…</span>
  ) : (
    <span>
      <span className="text-lg font-extrabold text-foreground">
        {sheetsThisWeek}
      </span>
      <span className="text-xs text-muted-foreground ml-1.5">
        sheet{sheetsThisWeek !== 1 ? "s" : ""} this week
      </span>
    </span>
  );

  const flashcardStat = isAnonymous ? (
    <span className="text-[11px] text-muted-foreground/70 italic">
      Sign in to track your stats
    </span>
  ) : (
    <span>
      <span className="text-lg font-extrabold text-foreground">
        {stats.due}
      </span>
      <span className="text-xs text-muted-foreground ml-1.5">
        card{stats.due !== 1 ? "s" : ""} due today
      </span>
    </span>
  );

  return (
    <DashboardLayout>
      <WelcomeModal />

      <div className="space-y-8">
        <GoProNudgeBanner isRealUser={!isAnonymous} />

        <StatsStrip />

        <div className="space-y-1">
          <p className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase pl-1">
            Tools
          </p>
          <p className="text-xs text-muted-foreground pl-1">
            Everything you need to study smarter
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ActiveToolCard
            icon={<FileText className="h-5 w-5" />}
            title="Study Sheet"
            description="Generate a high-yield, exam-ready study sheet on any medical topic in seconds."
            stat={sheetStat}
            ctaLabel="Open"
            onClick={() => navigate("/sheets")}
          />

          <ActiveToolCard
            icon={<Layers className="h-5 w-5" />}
            title="Flashcards"
            description="Build a spaced-repetition deck on any topic and drill until it sticks."
            stat={flashcardStat}
            ctaLabel="Open"
            onClick={() => navigate("/flashcards")}
          />

          <ActiveToolCard
            icon={<FlaskConical className="h-5 w-5" />}
            title="QBank"
            description="USMLE-style questions for Step 1 and Step 2 — built on NBME blueprints and clinical guidelines. Human-verified."
            stat={
              <span>
                <span className="text-lg font-extrabold text-foreground">10</span>
                <span className="text-xs text-muted-foreground ml-1.5">questions ready</span>
              </span>
            }
            ctaLabel="Open"
            onClick={() => navigate("/qbank")}
          />

          <ComingSoonCard
            icon={<Stethoscope className="h-5 w-5" />}
            title="Clinical Cases"
            description="Train for OSCE exams with AI-generated clinical cases — history, examination, investigations, and management in one flow."
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
