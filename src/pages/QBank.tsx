import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, LogIn, Zap, BookOpen, CheckCircle, History, ChevronRight, Clock, Trash2, Flag } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQBankContext } from "@/contexts/QBankContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  if (pct >= 0.8) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const getScoreBg = (score: number, total: number) => {
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return "bg-emerald-500/10 border-emerald-500/30";
  if (pct >= 0.6) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
};

const PAGE_SIZE = 5;

const QBank = () => {
  const navigate = useNavigate();
  const { user, isAnonymous } = useAuth();
  const {
    questionCount,
    startSession,
    allDomainMeta,
    allQuestionMeta,
    availableSystems,
    restoreSession,
    resetSession,
    flaggedIds,
  } = useQBankContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const MAX_SESSION_CAP = 40;
  const flaggedCount = flaggedIds.size;

  const [page, setPage] = useState(0);
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState<number>(MAX_SESSION_CAP);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (availableSystems.length > 0 && selectedSystem === "") {
      setSelectedSystem(availableSystems[0]);
    }
  }, [availableSystems, selectedSystem]);

  const availableDomains = useMemo(() => {
    if (!selectedSystem) return [];
    return [
      ...new Set(
        allDomainMeta
          .filter((r) => r.subject === selectedSystem)
          .map((r) => r.domain)
      ),
    ].sort();
  }, [allDomainMeta, selectedSystem]);

  const handleSystemChange = (system: string) => {
    setSelectedSystem(system);
    setSelectedDomains([]);
  };

  useEffect(() => {
    if (!user || isAnonymous) return;

    try {
      const raw = localStorage.getItem("sb_qbank_session");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (
        parsed.savedAt &&
        Date.now() - parsed.savedAt < TWENTY_FOUR_HOURS &&
        Array.isArray(parsed.questions) &&
        parsed.questions.length > 0 &&
        typeof parsed.currentIndex === "number" &&
        Array.isArray(parsed.answers)
      ) {
        setHasSavedSession(true);
      }
    } catch {
      // ignore
    }
  }, [user, isAnonymous]);

  const savedSessionMeta = useMemo(() => {
    try {
      const raw = localStorage.getItem("sb_qbank_session");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        answered: Array.isArray(parsed.answers) ? parsed.answers.length : 0,
        total: Array.isArray(parsed.questions) ? parsed.questions.length : 0,
        system: parsed.questions?.[0]?.subject ?? "Cardiovascular",
      };
    } catch {
      return null;
    }
  }, [hasSavedSession]);

  const handleResume = () => {
    const restored = restoreSession();
    if (restored) {
      navigate("/qbank/session");
    }
  };

  const handleDiscard = () => {
    resetSession();
    setHasSavedSession(false);
  };

  const availableForSelection = useMemo(() => {
    const systemFiltered = selectedSystem
      ? allQuestionMeta.filter((q) => q.subject === selectedSystem)
      : allQuestionMeta;
    if (selectedDomains.length === 0) return systemFiltered.length;
    return systemFiltered.filter((q) => selectedDomains.includes(q.domain)).length;
  }, [allQuestionMeta, selectedSystem, selectedDomains]);

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
    // Brief full-screen hand-off so the session player never snaps in
    setStarting(true);
    const minDelay = new Promise((resolve) => window.setTimeout(resolve, 800));
    await Promise.all([
      startSession({
        domains: selectedDomains,
        system: selectedSystem,
        limit: flaggedOnly ? flaggedCount : questionLimit,
        questionIds: flaggedOnly ? [...flaggedIds] : undefined,
      }),
      minDelay,
    ]);
    navigate("/qbank/session");
  };

  const handleDeleteSession = async (sessionId: string) => {
    setIsDeleting(true);
    try {
      const { error: attemptsError } = await supabase
        .from("user_attempts")
        .delete()
        .eq("session_id", sessionId);

      if (attemptsError) throw attemptsError;

      const { error: sessionError } = await supabase
        .from("qbank_sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) throw sessionError;

      setPendingDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["qbank-sessions"] });
    } catch (err) {
      toast({
        title: "Failed to delete session",
        description: "Please try again.",
        variant: "destructive",
      });
      setPendingDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (starting) {
    return (
      <DashboardLayout>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background animate-fade-in">
          <PageLoader context="qbank" fullPage={false} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="w-full max-w-lg space-y-8 animate-fade-in">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card">
              <FlaskConical className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
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
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {questionCount}
              </p>
              <p className="text-[11px] text-muted-foreground">
                questions available
              </p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center space-y-1">
              <p className="text-2xl font-semibold text-foreground">Step 1</p>
              <p className="text-[11px] text-muted-foreground">& Step 2</p>
            </div>
            <div className="glass-card rounded-xl p-3 text-center space-y-1">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {availableSystems.length > 0 ? availableSystems.length : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {availableSystems.length === 1 ? "system" : "systems"}
              </p>
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
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"
              >
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {isAnonymous || !user ? (
            <div className="glass-card rounded-xl p-6 space-y-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background mx-auto">
                <LogIn className="h-4 w-4 text-primary" />
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
                className="w-full h-10 text-sm font-medium rounded-lg"
                onClick={() => navigate("/dashboard")}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Start
              </Button>
            </div>
          ) : (
            <>
              {hasSavedSession && savedSessionMeta && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-background shrink-0">
                        <History className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Resume previous session
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {savedSessionMeta.system} · {savedSessionMeta.answered}/{savedSessionMeta.total} questions answered
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${savedSessionMeta.total > 0 ? (savedSessionMeta.answered / savedSessionMeta.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleResume}
                      className="flex-1 h-9 text-sm font-medium rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4 mr-1" />
                      Continue
                    </Button>
                    <Button
                      onClick={handleDiscard}
                      variant="outline"
                      className="h-9 px-4 text-sm text-muted-foreground hover:text-foreground rounded-lg"
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              )}

              <div className="glass-card rounded-xl p-5 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    System
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableSystems.length === 0 ? (
                      [100, 88].map((w) => (
                        <div
                          key={w}
                          style={{ width: `${w}px` }}
                          className="h-7 rounded-full bg-muted/20 animate-pulse"
                        />
                      ))
                    ) : (
                      availableSystems.map((system) => {
                        const isSelected = selectedSystem === system;
                        return (
                          <button
                            key={system}
                            type="button"
                            onClick={() => handleSystemChange(system)}
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 border-primary/40 text-primary"
                                : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            }`}
                          >
                            {system}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {flaggedCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Filter
                    </p>
                    <button
                      type="button"
                      onClick={() => setFlaggedOnly((v) => !v)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        flaggedOnly
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400"
                          : "bg-card border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-600 dark:hover:text-amber-400"
                      }`}
                    >
                      <Flag className="h-3 w-3" fill={flaggedOnly ? "currentColor" : "none"} />
                      Flagged only ({flaggedCount})
                    </button>
                  </div>
                )}

                <div className={`space-y-2 ${flaggedOnly ? "opacity-50 pointer-events-none" : ""}`}>
                  <p className="text-xs font-medium text-muted-foreground">
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
                          className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            selectedDomains.length === 0
                              ? "bg-primary/10 border-primary/40 text-primary"
                              : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
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
                              className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-primary/10 border-primary/40 text-primary"
                                  : "bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
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

                <div className={`space-y-2 ${flaggedOnly ? "opacity-50 pointer-events-none" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Questions
                    </p>
                    <span className="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md bg-primary/10 text-primary">
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
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-muted"
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
                disabled={questionCount === 0 || (flaggedOnly ? flaggedCount === 0 : effectiveSliderMax === 0)}
                className="w-full h-11 text-sm font-medium rounded-lg"
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                Start Session · {flaggedOnly ? flaggedCount : questionLimit} Questions
              </Button>
            </>
          )}

          {!isAnonymous && user && (
            <div className="w-full space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground/60" />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

                      if (pendingDeleteId === s.id) {
                        return (
                          <div
                            key={s.id}
                            className="w-full rounded-lg px-4 py-3 flex items-center justify-between gap-3 border border-red-500/30 bg-red-500/5"
                          >
                            <p className="text-xs font-medium text-foreground">Delete this session?</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => setPendingDeleteId(null)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteSession(s.id)}
                                disabled={isDeleting}
                                className="flex items-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <span className="h-3 w-3 rounded-full border-2 border-red-400/40 border-t-red-500 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/qbank/summary?session=${s.id}`)}
                          className="w-full glass-card rounded-lg px-4 py-3 flex items-center gap-4 hover:border-foreground/20 transition-all duration-150 text-left group"
                        >
                          <div
                            className={`flex flex-col items-center justify-center rounded-md border px-3 py-1.5 shrink-0 ${getScoreBg(s.score, s.total)}`}
                          >
                            <span className={`text-base font-semibold tabular-nums leading-none ${getScoreColor(s.score, s.total)}`}>
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

                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteId(s.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                e.preventDefault();
                                setPendingDeleteId(s.id);
                              }
                            }}
                            className="shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>

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
