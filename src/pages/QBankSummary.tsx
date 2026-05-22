import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, CheckCircle, XCircle, Clock, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useQBankContext } from "@/contexts/QBankContext";

const ScoreRing = ({ score, total }: { score: number; total: number }) => {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 80 ? "#22c55e" :
    pct >= 60 ? "#f59e0b" :
    "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke="hsl(var(--muted) / 0.3)"
          strokeWidth="10"
        />
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold text-foreground" style={{ color }}>
          {pct}%
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {score} / {total}
        </span>
      </div>
    </div>
  );
};

const formatTime = (ms: number): string => {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const performanceLabel = (pct: number): { text: string; color: string } => {
  if (pct >= 80) return { text: "Strong performance", color: "#22c55e" };
  if (pct >= 60) return { text: "Good effort",        color: "#f59e0b" };
  if (pct >= 40) return { text: "Keep practicing",    color: "#f97316" };
  return             { text: "Review the material",   color: "#ef4444" };
};

const QBankSummary = () => {
  const navigate = useNavigate();
  const { lastSummary, startSession } = useQBankContext();

  useEffect(() => {
    if (!lastSummary) navigate("/qbank");
  }, [lastSummary, navigate]);

  if (!lastSummary) return null;

  const { questions, answers, totalTime, score, total } = lastSummary;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const perf = performanceLabel(pct);
  const avgTime = total > 0
    ? Math.round(answers.reduce((s, a) => s + (a.time_taken_ms ?? 0), 0) / total / 1000)
    : 0;

  const difficultyBreakdown = ["Easy", "Medium", "Hard"].map((diff) => {
    const qs = questions.filter((q) => q.difficulty === diff);
    const correct = qs.filter((q) => {
      const ans = answers.find((a) => a.question_id === q.id);
      return ans?.is_correct;
    }).length;
    return { diff, correct, total: qs.length };
  }).filter((d) => d.total > 0);

  const handleTryAgain = async () => {
    await startSession();
    navigate("/qbank/session");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              Session Complete
            </h1>
            <p className="text-xs text-muted-foreground">
              Cardiovascular System · {total} questions
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreRing score={score} total={total} />

            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div>
                <p
                  className="text-lg font-extrabold"
                  style={{ color: perf.color }}
                >
                  {perf.text}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {score} correct out of {total} questions
                </p>
              </div>

              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatTime(totalTime)} total
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    ~{avgTime}s per question
                  </span>
                </div>
              </div>
            </div>
          </div>

          {difficultyBreakdown.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border/40">
              <p className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground/60 uppercase mb-3">
                By difficulty
              </p>
              <div className="flex gap-3 flex-wrap">
                {difficultyBreakdown.map(({ diff, correct, total: t }) => {
                  const diffPct = t > 0 ? Math.round((correct / t) * 100) : 0;
                  const diffColor =
                    diff === "Easy" ? "#22c55e" :
                    diff === "Medium" ? "#f59e0b" : "#ef4444";
                  return (
                    <div
                      key={diff}
                      className="flex-1 min-w-[80px] rounded-xl border border-border/40 bg-muted/20 p-3 text-center"
                    >
                      <p className="text-base font-extrabold" style={{ color: diffColor }}>
                        {diffPct}%
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {diff}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {correct}/{t}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground/60 uppercase pl-1">
            Question breakdown
          </p>

          <div className="space-y-2">
            {questions.map((q, i) => {
              const ans = answers.find((a) => a.question_id === q.id);
              const isCorrect = ans?.is_correct ?? false;
              const diffColor =
                q.difficulty === "Easy" ? "#22c55e" :
                q.difficulty === "Medium" ? "#f59e0b" : "#ef4444";

              return (
                <div
                  key={q.id}
                  className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/60 p-3.5"
                >
                  <div className="shrink-0 mt-0.5">
                    {isCorrect ? (
                      <CheckCircle className="text-green-500" style={{ width: 18, height: 18 }} />
                    ) : (
                      <XCircle className="text-red-500" style={{ width: 18, height: 18 }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
                      Q{i + 1} · {q.topic}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {q.domain}
                      </span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: diffColor }}
                      >
                        {q.difficulty}
                      </span>
                      {ans && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {Math.round((ans.time_taken_ms ?? 0) / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCorrect && ans && (
                    <div className="shrink-0 text-right space-y-0.5">
                      <p className="text-[10px] text-red-400 font-medium">
                        You: {ans.selected_option.toUpperCase()}
                      </p>
                      <p className="text-[10px] text-green-400 font-medium">
                        Correct: {q.correct_option.toUpperCase()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Button
            onClick={handleTryAgain}
            className="btn-gradient flex-1 h-12 text-sm font-bold rounded-xl gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/qbank")}
            className="flex-1 h-12 text-sm font-semibold rounded-xl gap-2 border-border/60"
          >
            Back to QBank
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QBankSummary;
