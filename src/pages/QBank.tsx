import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, LogIn, Zap, BookOpen, CheckCircle, History, ChevronRight, Clock, Trash2, Flag } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PageLoader from "@/components/PageLoader";
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

// ── OpenMed token styles ────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  background: "var(--bg-elevated)",
};

const EYEBROW_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--fg-muted)",
  marginBottom: 8,
};

const STAT_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  color: "var(--fg-muted)",
  marginTop: 4,
  letterSpacing: "0.06em",
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "var(--accent-soft)" : "var(--bg)",
  border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
  color: active ? "var(--accent)" : "var(--fg-muted)",
  borderRadius: "var(--radius-sm)",
  padding: "5px 12px",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  transition: "all var(--dur-micro) var(--ease-out)",
});

/** Dark CTA — the OpenMed primary button (ink on light, parchment on dark). */
const darkButtonStyle = (disabled = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 44,
  borderRadius: "var(--radius-md)",
  border: "1px solid transparent",
  background: "var(--fg)",
  color: "var(--bg)",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  fontWeight: 500,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  transition: "opacity var(--dur-micro) var(--ease-out)",
});

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
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 8,
              }}
            >
              QBank · USMLE-style
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 4vw, 40px)",
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: "-0.012em",
                color: "var(--fg)",
                margin: "0 0 10px",
              }}
            >
              Practice questions,{" "}
              <span style={{ fontStyle: "italic", color: "var(--accent)" }}>
                built to stick.
              </span>
            </h1>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--fg-muted)",
                lineHeight: 1.55,
                maxWidth: 400,
                margin: "0 auto",
              }}
            >
              NBME blueprints, clinical guidelines, human-verified. Instant feedback on
              every answer.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div style={{ ...PANEL_STYLE, padding: "12px 8px", textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 500,
                  color: "var(--accent)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {questionCount}
              </p>
              <p style={STAT_LABEL_STYLE}>questions</p>
            </div>
            <div style={{ ...PANEL_STYLE, padding: "12px 8px", textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--fg)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                Step 1
              </p>
              <p style={STAT_LABEL_STYLE}>&amp; Step 2</p>
            </div>
            <div style={{ ...PANEL_STYLE, padding: "12px 8px", textAlign: "center" }}>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 500,
                  color: "var(--fg)",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {availableSystems.length > 0 ? availableSystems.length : "—"}
              </p>
              <p style={STAT_LABEL_STYLE}>
                {availableSystems.length === 1 ? "system" : "systems"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {[
              { icon: Zap, label: "Instant feedback" },
              { icon: BookOpen, label: "Full explanations" },
              { icon: CheckCircle, label: "Human-verified" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-pill)",
                  background: "var(--bg-elevated)",
                  padding: "6px 12px",
                }}
              >
                <Icon style={{ width: 12, height: 12, color: "var(--accent)" }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {isAnonymous || !user ? (
            <div
              style={{
                ...PANEL_STYLE,
                borderRadius: "var(--radius-lg)",
                padding: 24,
                textAlign: "center",
              }}
              className="space-y-4"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  margin: "0 auto",
                }}
              >
                <LogIn style={{ width: 16, height: 16, color: "var(--accent)" }} />
              </div>
              <div className="space-y-1">
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                  Sign in to access QBank
                </p>
                <p style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                  Create a free account to start answering questions and track
                  your progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                style={{ ...darkButtonStyle(), width: "100%" }}
              >
                <LogIn style={{ width: 16, height: 16 }} />
                Sign In to Start
              </button>
            </div>
          ) : (
            <>
              {hasSavedSession && savedSessionMeta && (
                <div
                  className="space-y-3"
                  style={{
                    ...PANEL_STYLE,
                    borderLeft: "3px solid var(--accent)",
                    padding: "16px 18px",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        height: 36,
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        flexShrink: 0,
                      }}
                    >
                      <History style={{ width: 16, height: 16, color: "var(--accent)" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                        Resume previous session
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--fg-muted)",
                          marginTop: 2,
                        }}
                      >
                        {savedSessionMeta.system} · {savedSessionMeta.answered}/{savedSessionMeta.total} answered
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: 4,
                      borderRadius: 999,
                      background: "var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="transition-all"
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        background: "var(--accent)",
                        width: `${savedSessionMeta.total > 0 ? (savedSessionMeta.answered / savedSessionMeta.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResume}
                      style={{ ...darkButtonStyle(), flex: 1, height: 38, fontSize: 13 }}
                    >
                      <ChevronRight style={{ width: 15, height: 15 }} />
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscard}
                      style={{
                        height: 38,
                        padding: "0 16px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--fg-muted)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}

              <div
                className="space-y-5"
                style={{
                  ...PANEL_STYLE,
                  borderRadius: "var(--radius-lg)",
                  padding: "20px 20px 24px",
                }}
              >
                <div>
                  <p style={EYEBROW_STYLE}>System</p>
                  <div className="flex flex-wrap gap-2">
                    {availableSystems.length === 0 ? (
                      [100, 88].map((w) => (
                        <div
                          key={w}
                          style={{ width: `${w}px`, background: "var(--border)" }}
                          className="h-7 rounded-full animate-pulse"
                        />
                      ))
                    ) : (
                      availableSystems.map((system) => (
                        <button
                          key={system}
                          type="button"
                          onClick={() => handleSystemChange(system)}
                          style={chipStyle(selectedSystem === system)}
                        >
                          {system}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {flaggedCount > 0 && (
                  <div>
                    <p style={EYEBROW_STYLE}>Filter</p>
                    <button
                      type="button"
                      onClick={() => setFlaggedOnly((v) => !v)}
                      style={{
                        ...chipStyle(false),
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        ...(flaggedOnly
                          ? {
                              background: "rgba(217,119,6,0.08)",
                              border: "1px solid #d97706",
                              color: "#d97706",
                            }
                          : {}),
                      }}
                    >
                      <Flag className="h-3 w-3" fill={flaggedOnly ? "currentColor" : "none"} />
                      Flagged only ({flaggedCount})
                    </button>
                  </div>
                )}

                <div className={flaggedOnly ? "opacity-50 pointer-events-none" : ""}>
                  <p style={EYEBROW_STYLE}>Domain</p>
                  <div className="flex flex-wrap gap-2">
                    {availableDomains.length === 0 ? (
                      [80, 96, 72, 88].map((w) => (
                        <div
                          key={w}
                          style={{ width: `${w}px`, background: "var(--border)" }}
                          className="h-7 rounded-full animate-pulse"
                        />
                      ))
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={selectAll}
                          style={chipStyle(selectedDomains.length === 0)}
                        >
                          All
                        </button>
                        {availableDomains.map((domain) => (
                          <button
                            key={domain}
                            type="button"
                            onClick={() => toggleDomain(domain)}
                            style={chipStyle(selectedDomains.includes(domain))}
                          >
                            {domain}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                <div className={`space-y-2 ${flaggedOnly ? "opacity-50 pointer-events-none" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p style={{ ...EYEBROW_STYLE, marginBottom: 0 }}>Questions</p>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--accent)",
                        padding: "2px 8px",
                        border: "1px solid var(--accent)",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--accent-soft)",
                      }}
                    >
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
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
                    style={{ background: "var(--border)" }}
                  />
                  <div
                    className="flex justify-between"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--fg-subtle)",
                    }}
                  >
                    <span>5</span>
                    <span>{effectiveSliderMax}</span>
                  </div>
                  {selectedDomains.length > 0 && (
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--fg-subtle)",
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      {availableForSelection} question{availableForSelection !== 1 ? "s" : ""} available in selected domains
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                disabled={questionCount === 0 || (flaggedOnly ? flaggedCount === 0 : effectiveSliderMax === 0)}
                style={{
                  ...darkButtonStyle(
                    questionCount === 0 || (flaggedOnly ? flaggedCount === 0 : effectiveSliderMax === 0)
                  ),
                  width: "100%",
                }}
              >
                <FlaskConical style={{ width: 16, height: 16 }} />
                Start Session · {flaggedOnly ? flaggedCount : questionLimit} Questions
              </button>
            </>
          )}

          {!isAnonymous && user && (
            <div className="w-full space-y-3 pt-2">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <History style={{ width: 14, height: 14, color: "var(--fg-muted)" }} />
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--fg-muted)",
                  }}
                >
                  Session History
                </p>
              </div>

              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse"
                      style={{
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                      }}
                    />
                  ))}
                </div>
              ) : !sessionHistory || sessionHistory.rows.length === 0 ? (
                <div style={{ ...PANEL_STYLE, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "var(--fg-muted)" }}>
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
                          className="group"
                          style={{
                            ...PANEL_STYLE,
                            width: "100%",
                            padding: "12px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "border-color var(--dur-micro) var(--ease-out)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.borderColor = "var(--border-strong)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.borderColor = "var(--border)")
                          }
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
