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
    className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-6 cursor-pointer transition-all duration-150 hover:border-foreground/20 hover:shadow-[0_4px_12px_-2px_hsl(216_45%_10%/0.12)] motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] motion-safe:active:duration-75 animate-fade-in"
  >
    <div className="space-y-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
        <span className="text-primary [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </div>
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>

    <div className="mt-6 flex items-end justify-between gap-3">
      <div className="text-sm text-muted-foreground">{stat}</div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        {ctaLabel}
        <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
      </span>
    </div>
  </div>
);

const ComingSoonCard = ({ icon, title, description }: ComingSoonCardProps) => (
  <div className="relative flex flex-col justify-between rounded-xl border border-dashed border-border p-6 cursor-default">
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50">
          <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        </div>
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Coming Soon
        </span>
      </div>
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground/70">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground/80 leading-relaxed">
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
    <span className="text-xs text-muted-foreground/70">
      Sign in to track your stats
    </span>
  ) : sheetsThisWeek === null ? (
    <span className="text-xs text-muted-foreground/50">Loading…</span>
  ) : (
    <span>
      <span className="text-base font-semibold tabular-nums text-foreground">
        {sheetsThisWeek}
      </span>
      <span className="text-xs text-muted-foreground ml-1.5">
        sheet{sheetsThisWeek !== 1 ? "s" : ""} this week
      </span>
    </span>
  );

  const flashcardStat = isAnonymous ? (
    <span className="text-xs text-muted-foreground/70">
      Sign in to track your stats
    </span>
  ) : (
    <span>
      <span className="text-base font-semibold tabular-nums text-foreground">
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
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-1">
            Tools
          </p>
          <p className="text-xs text-muted-foreground/70 pl-1">
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
                <span className="text-base font-semibold tabular-nums text-foreground">10</span>
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
