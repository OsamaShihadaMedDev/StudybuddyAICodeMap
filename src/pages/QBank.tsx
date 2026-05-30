import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, LogIn, Zap, BookOpen, CheckCircle, History, ChevronRight, Clock, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQBankContext } from "@/contexts/QBankContext";
import { supabase } from "@/integrations/supabase/client";

interface SessionRow {
  id: string;
  score: number;
  total: number;
  total_time_ms: number;
  system: string;
  ended_at: string;
}

const formatSessionDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatSessionTime = (ms: number) => {
  const totalSec = Math.round(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const getScoreColor = (score: number, total: number) => {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return "text-green-400";
  if (pct >= 0.6) return "text-amber-400";
  return "text-red-400";
};

const getScoreBg = (score: number, total: number) => {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return "bg-green-500/10 border-green-500/20";
  if (pct >= 0.6) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
};

const PAGE_SIZE = 5;

const QBank = () => {
  const navigate = useNavigate();
  const { user, isAnonymous } = useAuth();
  const { questionCount, startSession, availableDomains, allQuestionMeta } = useQBankContext();

  const MAX_SESSION_CAP = 40;

  const [page, setPage] = useState(0);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState<number>(MAX_SESSION_CAP);

  const availableForSelection = selectedDomains.length === 0
    ? allQuestionMeta.length
    : allQuestionMeta.filter((q) => selectedDomains.includes(q.domain)).length;

  const sliderMax = Math.min(availableForSelection, MAX_SESSION_CAP);
  const effectiveSliderMax = sliderMax > 0 ? sliderMax : MAX_SESSION_CAP;

  useEffect(() => {
    if (sliderMax > 0) {
      setQuestionLimit((prev) => Math.min(prev, sliderMax));
    }
  }, [sliderMax]);

  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) => {
      if (prev.includes(domain)) {
        if (prev.length === 1) return [];
        return prev.filter((d) => d !== domain);
      }
      return [...prev, domain];
    });
  };

  const selectAll = () => setSelectedDomains([]);

  const { data: sessionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["qbank-sessions", user?.id, page],
    enabled: !!user && !isAnonymous,
    queryFn: async (): Promise<{ rows: SessionRow[]; hasMore: boolean }> => {
      const { data, error } = await supabase
        .from("qbank_sessions")
        .select("id, score, total, total_time_ms, system, ended_at")
        .eq("user_id", user!.id)
        .order("ended_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

      if (error) throw error;

      const rows = (data ?? []) as SessionRow[];
      const hasMore = rows.length > PAGE_SIZE;
      return {
        rows: rows.slice(0, PAGE_SIZE),
        hasMore,
      };
    },
  });

  const handleStart = async () => {
    await startSession({
      domains: selectedDomains,
      limit: questionLimit,
    });
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
            <>
              <div className="glass-card rounded-2xl p-5 space-y-5 border border-border/30">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
                    System
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary cursor-default">
                    <Lock className="h-3 w-3" />
                    Cardiovascular
                  </span>
                  <p className="text-[11px] text-muted-foreground/40 mt-1.5">
                    More systems coming soon
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
                    Domain
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableDomains.length === 0 ? (
                      [80, 96, 72, 88].map((w) => (
                        <div
                          key={w}
                          style={{ width: `${w}px` }}
                          className="h-7 rounded-full bg-muted/20 animate-pulse"
                        />
                      ))
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={selectAll}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            selectedDomains.length === 0
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          }`}
                        >
                          All
                        </button>
                        {availableDomains.map((domain) => {
                          const isSelected = selectedDomains.includes(domain);
                          return (
                            <button
                              key={domain}
                              type="button"
                              onClick={() => toggleDomain(domain)}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-primary/15 border-primary/40 text-primary"
                                  : "bg-secondary/30 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                              }`}
                            >
                              {domain}
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
                      Questions
                    </p>
                    <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      {questionLimit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={effectiveSliderMax}
                    step={5}
                    value={questionLimit}
                    onChange={(e) => setQuestionLimit(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-muted/30"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground/40">
                    <span>5</span>
                    <span>{effectiveSliderMax}</span>
                  </div>
                  {selectedDomains.length > 0 && (
                    <p className="text-[11px] text-muted-foreground/50 text-center mt-1">
                      {availableForSelection} question{availableForSelection !== 1 ? "s" : ""} available in selected domains
                    </p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleStart}
                disabled={questionCount === 0 || effectiveSliderMax === 0}
                className="btn-gradient w-full h-14 text-base font-bold rounded-xl"
              >
                <FlaskConical className="h-5 w-5 mr-2" />
                Start Session · {questionLimit} Questions
              </Button>
            </>
          )}

          {!isAnonymous && user && (
            <div className="w-full space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground/60" />
                <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                  Session History
                </p>
              </div>

              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-xl bg-muted/20 animate-pulse border border-border/20"
                    />
                  ))}
                </div>
              ) : !sessionHistory || sessionHistory.rows.length === 0 ? (
                <div className="glass-card rounded-xl p-4 text-center space-y-1 border border-border/20">
                  <p className="text-xs text-muted-foreground/60">
                    No sessions yet — complete your first session to see your history here.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {sessionHistory.rows.map((s) => {
                      const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
                      return (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/qbank/summary?session=${s.id}`)}
                          className="w-full glass-card rounded-xl px-4 py-3 flex items-center gap-4 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 text-left group"
                        >
                          <div
                            className={`flex flex-col items-center justify-center rounded-lg border px-3 py-1.5 shrink-0 ${getScoreBg(s.score, s.total)}`}
                          >
                            <span className={`text-base font-extrabold leading-none ${getScoreColor(s.score, s.total)}`}>
                              {pct}%
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                              {s.score}/{s.total}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {s.system}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                                <Clock className="h-3 w-3" />
                                {formatSessionTime(s.total_time_ms)}
                              </span>
                              <span className="text-[11px] text-muted-foreground/40">
                                {formatSessionDate(s.ended_at)}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/60 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="text-xs font-medium text-muted-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-[11px] text-muted-foreground/40">
                      Page {page + 1}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!sessionHistory.hasMore}
                      className="text-xs font-medium text-muted-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default QBank;
