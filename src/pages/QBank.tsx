import { useNavigate } from "react-router-dom";
import { FlaskConical, LogIn, Zap, BookOpen, CheckCircle } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQBankContext } from "@/contexts/QBankContext";

const QBank = () => {
  const navigate = useNavigate();
  const { user, isAnonymous } = useAuth();
  const { questionCount, startSession } = useQBankContext();

  const handleStart = async () => {
    await startSession();
    navigate("/qbank/session");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-lg space-y-8 animate-fade-in">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <FlaskConical className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                QBank
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                USMLE-style questions for Step 1 and Step 2 — built on NBME
                blueprints and clinical guidelines. Generated using Anthropic's
                latest AI models, then human-verified before publishing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-3 text-center space-y-1">
              <p className="text-2xl font-extrabold text-primary">
                {questionCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                questions available
              </p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center space-y-1">
              <p className="text-2xl font-extrabold text-foreground">Step 1</p>
              <p className="text-[11px] text-muted-foreground">& Step 2</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center space-y-1">
              <p className="text-2xl font-extrabold text-foreground">
                Cardio
              </p>
              <p className="text-[11px] text-muted-foreground">pilot block</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { icon: Zap, label: "Instant feedback" },
              { icon: BookOpen, label: "Full explanations" },
              { icon: CheckCircle, label: "Human-verified" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/30 px-3 py-1.5"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {isAnonymous || !user ? (
            <div className="glass-card rounded-2xl p-6 space-y-4 text-center border border-primary/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mx-auto">
                <LogIn className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Sign in to access QBank
                </p>
                <p className="text-xs text-muted-foreground">
                  Create a free account to start answering questions and track
                  your progress.
                </p>
              </div>
              <Button
                className="btn-gradient w-full h-11 text-sm font-semibold rounded-xl"
                onClick={() => navigate("/dashboard")}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Start
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStart}
              className="btn-gradient w-full h-14 text-base font-bold rounded-xl"
            >
              <FlaskConical className="h-5 w-5 mr-2" />
              Start Session · {questionCount} Questions
            </Button>
          )}

          <p className="text-center text-[11px] text-muted-foreground/60">
            Cardiovascular System pilot · More systems coming soon
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QBank;
