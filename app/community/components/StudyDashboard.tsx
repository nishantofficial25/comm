"use client";
import { useState, useEffect, useCallback } from "react";
import { API, authFetch, fmtHrs, lsGet, lsSet, dateKey } from "../lib/utils";
import { TodoList, StudyData } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import TodoTab from "./TodoTab";
import TrackerTab from "./TrackerTab";
import FullscreenStopwatch, {
  FullscreenTimerState,
  MiniTimerBadge,
} from "./FullscreenStopwatch";
import Leaderboard from "./Leaderboard";

const TODAY = dateKey(0);
type Tab = "todo" | "tracker";

/* ── URL hash helpers ────────────────────────────────────────────────────── */
// Hash format:  #tab/listIdx/taskId
// e.g.  #todo          → tab=todo, lists overview
//       #todo/2        → tab=todo, list index 2
function parseHash(hash: string): { tab: Tab; listIdx: number | null } {
  const parts = hash.replace(/^#/, "").split("/");
  const tab = (
    ["todo", "tracker"].includes(parts[0]) ? parts[0] : "todo"
  ) as Tab;
  const listIdx =
    parts[1] !== undefined && parts[1] !== "" ? parseInt(parts[1], 10) : null;
  return { tab, listIdx: isNaN(listIdx as number) ? null : listIdx };
}

function buildHash(tab: Tab, listIdx: number | null): string {
  if (listIdx !== null) return `#${tab}/${listIdx}`;
  return `#${tab}`;
}

/* ── Profile modal ───────────────────────────────────────────────────────── */
function ProfileModal({
  user,
  todaySecs,
  totalSecs,
  dailyGoalHrs,
  onGoalChange,
  onClose,
  onLogout,
}: {
  user: any;
  todaySecs: number;
  totalSecs: number;
  dailyGoalHrs: number;
  onGoalChange: (h: number) => void;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "28px 28px 0 0",
          width: "100%",
          maxWidth: 480,
          padding: "8px 0 0",
          boxShadow: "0 -20px 60px #00000018",
          animation: "pmSlideUp 0.28s cubic-bezier(.16,1,.3,1)",
          border: "1px solid #f3f4f6",
          borderBottom: "none",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 99,
            background: "#e5e7eb",
            margin: "8px auto 0",
          }}
        />
        <div
          style={{
            height: 64,
            background: "linear-gradient(135deg,#7c3aed,#8b5cf6,#a78bfa)",
            margin: "12px 0 0",
          }}
        />
        <div style={{ padding: "0 24px 28px", marginTop: -40 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 16,
            }}
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  border: "4px solid white",
                  objectFit: "cover",
                  boxShadow: "0 4px 16px #00000018",
                }}
              />
            ) : (
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  border: "4px solid white",
                  background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  color: "white",
                  fontWeight: 800,
                }}
              >
                {user.displayName[0]?.toUpperCase()}
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                background: "#f9fafb",
                border: "1px solid #f3f4f6",
                borderRadius: 99,
                padding: "4px 12px",
                marginBottom: 4,
              }}
            >
              name set at signup
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#1a1a2e",
              letterSpacing: "-0.5px",
            }}
          >
            {user.displayName}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            {user.email}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginTop: 18,
              marginBottom: 20,
            }}
          >
            {[
              { label: "TODAY", value: fmtHrs(todaySecs), color: "#8b5cf6" },
              { label: "ALL TIME", value: fmtHrs(totalSecs), color: "#7c3aed" },
              { label: "GOAL", value: `${dailyGoalHrs}h`, color: "#6d28d9" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#faf9ff",
                  border: "1px solid #ede9fe",
                  borderRadius: 14,
                  padding: "12px 0",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#c4b5fd",
                    letterSpacing: "0.1em",
                    marginTop: 3,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#9ca3af",
                letterSpacing: "0.08em",
                marginBottom: 8,
              }}
            >
              DAILY GOAL
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[4, 6, 8, 10, 12].map((h) => (
                <button
                  key={h}
                  onClick={() => onGoalChange(h)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: dailyGoalHrs === h ? "#8b5cf6" : "#f3f4f6",
                    border: "none",
                    color: dailyGoalHrs === h ? "white" : "#6b7280",
                    transition: "all 0.15s",
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 14,
              background: "none",
              border: "1.5px solid #fee2e2",
              color: "#ef4444",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10.5 5L13 8L10.5 11M13 8H6M7 3H3V13H7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Sign out
          </button>
        </div>
      </div>
      <style>{`@keyframes pmSlideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

/* ── Main dashboard ──────────────────────────────────────────────────────── */
export default function StudyDashboard() {
  const { user, logout } = useAuth();

  // ── Routing state from URL hash ──────────────────────────────────────────
  const [tab, setTabState] = useState<Tab>("todo");
  const [activeListIdx, setActiveListIdx] = useState<number | null>(null);

  // Read initial state from hash on mount
  useEffect(() => {
    const { tab: t, listIdx } = parseHash(window.location.hash);
    setTabState(t);
    setActiveListIdx(listIdx);
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const onPop = () => {
      const { tab: t, listIdx } = parseHash(window.location.hash);
      setTabState(t);
      setActiveListIdx(listIdx);
      // Tell TodoTab to sync its activeIdx
      window.dispatchEvent(
        new CustomEvent("sv_nav", { detail: { tab: t, listIdx } }),
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Push hash when tab changes
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setActiveListIdx(null);
    const hash = buildHash(t, null);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, []);

  // Push hash when list opens/closes inside TodoTab
  const handleListNav = useCallback((listIdx: number | null) => {
    setActiveListIdx(listIdx);
    const hash = buildHash("todo", listIdx);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, []);

  // ── Timer state ──────────────────────────────────────────────────────────
  const [fsTimer, setFsTimer] = useState<FullscreenTimerState | null>(null);
  const [fsMinimised, setFsMinimised] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dailyGoalHrs, setDailyGoalHrs] = useState(8);
  const [todaySecs, setTodaySecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  /* ── Load ── */
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    authFetch(`${API}/api/void/study/me`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setStudyData(d.data);
          setDailyGoalHrs(d.data.goalHrs || 8);
          const ds = d.data.dailySecs || {};
          Object.entries(ds).forEach(([k, v]) => lsSet("sv_daily_" + k, v));
          if (d.data.todoLists) lsSet("sv_todo_lists", d.data.todoLists);
          setTodaySecs(ds[TODAY] || 0);
          const lifetime = Object.values(ds).reduce(
            (a: number, v) => a + (v as number),
            0,
          );
          setTotalSecs(lifetime);
        } else {
          setTodaySecs(lsGet<number>("sv_daily_" + TODAY, 0));
        }
      })
      .catch(() => setTodaySecs(lsGet<number>("sv_daily_" + TODAY, 0)))
      .finally(() => setDataLoading(false));
  }, [user?.uid]); // eslint-disable-line

  useEffect(() => {
    const h = () => setTodaySecs(lsGet<number>("sv_daily_" + TODAY, 0));
    window.addEventListener("sv_update", h);
    return () => window.removeEventListener("sv_update", h);
  }, []);

  /* ── Study time helpers ── */
  const addStudyTime = useCallback((secs: number) => {
    if (secs <= 0) return;
    const next = lsGet<number>("sv_daily_" + TODAY, 0) + secs;
    lsSet("sv_daily_" + TODAY, next);
    setTodaySecs(next);
    setTotalSecs((t) => t + secs);
    authFetch(`${API}/api/void/study/sync`, {
      method: "POST",
      body: JSON.stringify({ dailySecsIncrement: { date: TODAY, secs } }),
    }).catch(() => {});
    window.dispatchEvent(new Event("sv_update"));
  }, []);

  const removeStudyTime = useCallback((secs: number) => {
    if (secs <= 0) return;
    const cur = lsGet<number>("sv_daily_" + TODAY, 0);
    const next = Math.max(0, cur - secs);
    lsSet("sv_daily_" + TODAY, next);
    setTodaySecs(next);
    setTotalSecs((t) => Math.max(0, t - secs));
    authFetch(`${API}/api/void/study/sync`, {
      method: "POST",
      body: JSON.stringify({
        dailySecsIncrement: { date: TODAY, secs: -secs },
      }),
    }).catch(() => {});
    window.dispatchEvent(new Event("sv_update"));
  }, []);

  const saveGoal = (hrs: number) => {
    setDailyGoalHrs(hrs);
    lsSet("sv_goal_hrs", hrs);
    authFetch(`${API}/api/void/study/sync`, {
      method: "POST",
      body: JSON.stringify({ goalHrs: hrs }),
    }).catch(() => {});
  };

  /* ── Fullscreen callbacks ── */
  const handleFsMinimise = useCallback(() => {
    // Re-read persisted timer AFTER FullscreenStopwatch wrote pauseState to localStorage
    // so MiniTimerBadge receives the current pausedAt / totalPausedMs
    try {
      const raw = localStorage.getItem("sv_running_timer");
      if (raw) {
        const t = JSON.parse(raw);
        setFsTimer((prev) =>
          prev
            ? {
                ...prev,
                pausedAt: t.pausedAt ?? null,
                totalPausedMs: t.totalPausedMs ?? 0,
              }
            : prev,
        );
      }
    } catch {}
    setFsMinimised(true);
  }, []);
  const handleFsExpand = useCallback(() => setFsMinimised(false), []);

  const handleFsDone = useCallback(
    (elapsedThisSession: number) => {
      if (!fsTimer) return;
      const lists = lsGet<TodoList[]>("sv_todo_lists", []);
      const timer = (() => {
        try {
          const r = localStorage.getItem("sv_running_timer");
          return r ? JSON.parse(r) : null;
        } catch {
          return null;
        }
      })();
      const savedSecs = timer?.savedSecs ?? 0;
      const newTotal = savedSecs + elapsedThisSession;
      const updated = lists.map((l, li) =>
        li === fsTimer.listIdx
          ? {
              ...l,
              items: l.items.map((t) =>
                t.id === fsTimer.taskId ? { ...t, studiedSecs: newTotal } : t,
              ),
            }
          : l,
      );
      lsSet("sv_todo_lists", updated);
      localStorage.removeItem("sv_running_timer");
      if (elapsedThisSession > 0) addStudyTime(elapsedThisSession);
      authFetch(`${API}/api/void/study/sync`, {
        method: "POST",
        body: JSON.stringify({ todoLists: updated }),
      }).catch(() => {});
      setFsTimer(null);
      setFsMinimised(false);
      window.dispatchEvent(new Event("sv_update"));
      window.dispatchEvent(new Event("sv_timer_stopped"));
    },
    [fsTimer, addStudyTime],
  );

  const handleFsDiscard = useCallback(() => {
    localStorage.removeItem("sv_running_timer");
    setFsTimer(null);
    setFsMinimised(false);
    window.dispatchEvent(new Event("sv_timer_stopped"));
  }, []);

  // Reset: wipe all studiedSecs for the task + deduct TOTAL time from all counters
  const handleFsReset = useCallback(() => {
    if (!fsTimer) return;
    const lists = lsGet<TodoList[]>("sv_todo_lists", []);
    const task = lists[fsTimer.listIdx]?.items.find(
      (t) => t.id === fsTimer.taskId,
    );
    // Include any unsaved live session time from persisted timer
    const timerRaw = (() => {
      try {
        const r = localStorage.getItem("sv_running_timer");
        return r ? JSON.parse(r) : null;
      } catch {
        return null;
      }
    })();
    const savedSecs = timerRaw?.savedSecs ?? task?.studiedSecs ?? 0;
    const sessionStart = timerRaw?.sessionStart ?? Date.now();
    const totalPausedMs = timerRaw?.totalPausedMs ?? 0;
    const pausedAt = timerRaw?.pausedAt ?? null;
    const pauseOffset = pausedAt ? Date.now() - pausedAt : 0;
    const liveSession = Math.max(
      0,
      Math.floor(
        (Date.now() - sessionStart - totalPausedMs - pauseOffset) / 1000,
      ),
    );
    // Total time that was ever attributed to this task (saved + current live session)
    const totalForTask = savedSecs + liveSession;

    const updated = lists.map((l, li) =>
      li === fsTimer.listIdx
        ? {
            ...l,
            items: l.items.map((t) =>
              t.id === fsTimer.taskId ? { ...t, studiedSecs: 0 } : t,
            ),
          }
        : l,
    );
    lsSet("sv_todo_lists", updated);
    localStorage.removeItem("sv_running_timer");
    // Deduct all time from today + lifetime counters
    if (totalForTask > 0) removeStudyTime(totalForTask);
    authFetch(`${API}/api/void/study/sync`, {
      method: "POST",
      body: JSON.stringify({ todoLists: updated }),
    }).catch(() => {});
    setFsTimer(null);
    setFsMinimised(false);
    window.dispatchEvent(new Event("sv_update"));
    window.dispatchEvent(new Event("sv_timer_stopped"));
  }, [fsTimer, removeStudyTime]);

  const progressPct = Math.min((todaySecs / (dailyGoalHrs * 3600)) * 100, 100);

  const TABS: { key: Tab; icon: string; label: string }[] = [
    { key: "todo", icon: "✓", label: "Tasks" },
    { key: "tracker", icon: "◎", label: "Tracker" },
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#f8f7ff",
        color: "#1a1a2e",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{CSS}</style>

      {/* Fullscreen overlay */}
      {fsTimer && !fsMinimised && (
        <FullscreenStopwatch
          state={fsTimer}
          onMinimise={handleFsMinimise}
          onStop={handleFsDiscard}
          onDone={handleFsDone}
          onReset={handleFsReset}
        />
      )}

      {/* Mini badge when minimised */}
      {fsTimer && fsMinimised && (
        <MiniTimerBadge state={fsTimer} onExpand={handleFsExpand} />
      )}

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}

      {showProfile && user && (
        <ProfileModal
          user={user}
          todaySecs={todaySecs}
          totalSecs={totalSecs}
          dailyGoalHrs={dailyGoalHrs}
          onGoalChange={saveGoal}
          onClose={() => setShowProfile(false)}
          onLogout={logout}
        />
      )}

      {/* Progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 300,
          background: "#ede9fe",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "linear-gradient(90deg,#7c3aed,#8b5cf6,#a78bfa)",
            transition: "width 0.6s ease",
            boxShadow: "0 0 8px #8b5cf688",
          }}
        />
      </div>

      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(248,247,255,0.96)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #ede9fe",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "0 16px",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginRight: 6,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                color: "white",
                boxShadow: "0 4px 14px #8b5cf644",
              }}
            >
              ✦
            </div>
            <span
              className="sv-hide-xs"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 800,
                fontSize: 16,
                color: "#1a1a2e",
                letterSpacing: "-0.5px",
              }}
            >
              StudyVoid
            </span>
          </div>

          <nav className="sv-desktop-nav" style={{ display: "flex", gap: 2 }}>
            {TABS.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: tab === key ? "#8b5cf618" : "transparent",
                  border:
                    tab === key
                      ? "1px solid #8b5cf644"
                      : "1px solid transparent",
                  color: tab === key ? "#7c3aed" : "#6b7280",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Target pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              background: "white",
              border: "1.5px solid #ede9fe",
              borderRadius: 12,
              boxShadow: "0 1px 4px #8b5cf610",
            }}
          >
            <div
              className="sv-pulse"
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#8b5cf6",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed" }}>
              {fmtHrs(todaySecs)}
            </span>
            <span
              className="sv-hide-xs"
              style={{ fontSize: 11, color: "#9ca3af" }}
            >
              / {dailyGoalHrs}h target
            </span>
          </div>

          <button
            onClick={() => setShowLeaderboard(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 11px",
              background: "white",
              border: "1.5px solid #ede9fe",
              borderRadius: 11,
              color: "#f59e0b",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🏆
            <span
              className="sv-hide-xs"
              style={{ marginLeft: 2, color: "#92400e" }}
            >
              Board
            </span>
          </button>

          {user && (
            <button
              className="sv-hide-xs"
              onClick={() => setShowProfile(true)}
              style={{
                padding: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                borderRadius: "50%",
                flexShrink: 0,
              }}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "2px solid #ede9fe",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    color: "white",
                    fontWeight: 800,
                  }}
                >
                  {user.displayName[0]?.toUpperCase()}
                </div>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main
        style={{ maxWidth: 860, margin: "0 auto", padding: "20px 14px 96px" }}
      >
        {dataLoading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 260,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                className="sv-spin"
                style={{
                  width: 36,
                  height: 36,
                  border: "3px solid #ede9fe",
                  borderTopColor: "#8b5cf6",
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                }}
              />
              <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</div>
            </div>
          </div>
        ) : (
          <>
            {tab === "todo" && (
              <TodoTab
                onStartFullscreen={(state) => {
                  setFsTimer(state);
                  setFsMinimised(false);
                }}
                onStudyTime={addStudyTime}
                onRemoveStudyTime={removeStudyTime}
                initialLists={studyData?.todoLists}
                externalListIdx={activeListIdx}
                onListNavChange={handleListNav}
              />
            )}
            {tab === "tracker" && (
              <TrackerTab
                onStudyTime={addStudyTime}
                initialTopics={studyData?.topics?.[TODAY]}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sv-bottom-nav">
        <div
          style={{
            display: "flex",
            background: "rgba(255,255,255,0.98)",
            borderTop: "1px solid #ede9fe",
            padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
            boxShadow: "0 -4px 20px #8b5cf610",
          }}
        >
          {TABS.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "4px 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: tab === key ? "#7c3aed" : "#9ca3af",
                transition: "color 0.15s",
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
              {tab === key && (
                <div
                  style={{
                    width: 18,
                    height: 2,
                    borderRadius: 99,
                    background: "#8b5cf6",
                  }}
                />
              )}
            </button>
          ))}
          <button
            onClick={() => setShowProfile(true)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "4px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9ca3af",
            }}
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "1.5px solid #ede9fe",
                }}
              />
            ) : (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "white",
                  fontWeight: 800,
                }}
              >
                {user?.displayName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <span style={{ fontSize: 10, fontWeight: 700 }}>Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  @keyframes svFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes svPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
  @keyframes svSpin   { to{transform:rotate(360deg)} }
  .sv-fadein { animation: svFadeUp 0.3s ease; }
  .sv-pulse  { animation: svPulse 2s ease infinite; }
  .sv-spin   { animation: svSpin 0.8s linear infinite; }
  * { box-sizing: border-box; }
  input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #ede9fe; border-radius: 99px; }
  ::placeholder { color: #d1d5db; }
  body { overflow-x: hidden; background: #f8f7ff; }
  .sv-desktop-nav { display: flex; }
  .sv-bottom-nav  { display: none; }
  .sv-hide-xs     { display: inline !important; }
  @media (max-width: 640px) {
    .sv-desktop-nav { display: none !important; }
    .sv-bottom-nav  { display: block; position: fixed; bottom: 0; left: 0; right: 0; z-index: 200; }
    .sv-hide-xs     { display: none !important; }
  }
`;
