"use client";
/**
 * StudyDashboard — Changes:
 *  • Profile image: uses onError fallback to show initials avatar if image fails to load
 *  • UnifiedTimerFAB replaces MiniTimerBadge
 *  • Pomodoro receives taskTimerState + onExpandTaskTimer props for mutual exclusion
 */
import { useState, useEffect, useCallback } from "react";
import { API, authFetch, fmtHrs, lsGet, lsSet, dateKey } from "../lib/utils";
import { TodoList, StudyData } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import TodoTab from "./TodoTab";
import TrackerTab from "./TrackerTab";
import FullscreenStopwatch, {
  FullscreenTimerState,
} from "./FullscreenStopwatch";
import Leaderboard from "./Leaderboard";
import FlexScreen from "./flexscreen";
import PomodoroTimer, { UnifiedTimerFAB } from "./Pomodorotimer";

type Tab = "todo" | "tracker";

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

/* ── Avatar component with fallback ─────────────────────────────────────── */
function UserAvatar({
  user,
  size = 32,
  fontSize = 13,
  border = "2px solid #ede9fe",
}: {
  user: any;
  size?: number;
  fontSize?: number;
  border?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset on user change
  useEffect(() => {
    setImgFailed(false);
  }, [user?.picture]);

  if (user?.picture && !imgFailed) {
    return (
      <img
        src={user.picture}
        alt=""
        onError={() => setImgFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border,
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize,
        color: "white",
        fontWeight: 800,
        border,
        flexShrink: 0,
      }}
    >
      {user?.displayName?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

/* ── Profile modal ─────────────────────────────────────────────────────── */
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
  const [customGoal, setCustomGoal] = useState("");
  const [imgFailed, setImgFailed] = useState(false);

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
            {user.picture && !imgFailed ? (
              <img
                src={user.picture}
                alt=""
                onError={() => setImgFailed(true)}
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
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {[4, 8, 12].map((h) => (
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
                  }}
                >
                  {h}h
                </button>
              ))}
              <div style={{ display: "flex" }}>
                <input
                  type="number"
                  min="1"
                  max="20"
                  placeholder="hrs"
                  value={customGoal}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || (Number(v) >= 1 && Number(v) <= 20))
                      setCustomGoal(v);
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    background: "#f3f4f6",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                />
                <button
                  onClick={() => {
                    if (customGoal >= 1 && customGoal <= 20)
                      onGoalChange(Number(customGoal));
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 99,
                    border: "none",
                    background: "#10b981",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✓
                </button>
              </div>
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

  const [tab, setTabState] = useState<Tab>("todo");
  const [activeListIdx, setActiveListIdx] = useState<number | null>(null);

  useEffect(() => {
    const { tab: t, listIdx } = parseHash(window.location.hash);
    setTabState(t);
    setActiveListIdx(listIdx);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const { tab: t, listIdx } = parseHash(window.location.hash);
      setTabState(t);
      setActiveListIdx(listIdx);
      window.dispatchEvent(
        new CustomEvent("sv_nav", { detail: { tab: t, listIdx } }),
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setActiveListIdx(null);
    const hash = buildHash(t, null);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, []);

  const handleListNav = useCallback((listIdx: number | null) => {
    setActiveListIdx(listIdx);
    const hash = buildHash("todo", listIdx);
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  }, []);

  /* ── Timer state ── */
  const [fsTimer, setFsTimer] = useState<FullscreenTimerState | null>(null);
  const [fsMinimised, setFsMinimised] = useState(false);

  /* ── Pomodoro state (read for UnifiedTimerFAB) ── */
  const [pomoState, setPomoState] = useState<any>(null);
  const [pomoCfg, setPomoCfg] = useState<any>({
    focusMins: 25,
    shortBreakMins: 5,
    longBreakMins: 15,
    longBreakAfter: 4,
    autoStartBreak: false,
    autoStartFocus: false,
    soundEnabled: true,
  });

  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem("sv_pomo_timer");
        setPomoState(raw ? JSON.parse(raw) : null);
        const cfgRaw = localStorage.getItem("sv_pomo_settings");
        if (cfgRaw) setPomoCfg(JSON.parse(cfgRaw));
      } catch {}
    };
    refresh();
    const iv = setInterval(refresh, 1000);
    return () => clearInterval(iv);
  }, []);

  /* ── UI state ── */
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFlex, setShowFlex] = useState(false);
  const [dailyGoalHrs, setDailyGoalHrs] = useState(8);
  const [todaySecs, setTodaySecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const h = (e: Event) => {
      const { pausedAt, totalPausedMs } = (e as CustomEvent).detail as {
        pausedAt: number | null;
        totalPausedMs: number;
      };
      setFsTimer((prev) =>
        prev
          ? { ...prev, pausedAt: pausedAt ?? undefined, totalPausedMs }
          : prev,
      );
    };
    window.addEventListener("sv_timer_state_change", h);
    return () => window.removeEventListener("sv_timer_state_change", h);
  }, []);

  useEffect(() => {
    const onForceLogout = () => {
      setFsTimer(null);
      setFsMinimised(false);
    };
    window.addEventListener("sv_force_logout", onForceLogout);
    return () => window.removeEventListener("sv_force_logout", onForceLogout);
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel("sv_timer_lock");
    const onTimerStart = () =>
      bc.postMessage({ type: "timer_started", tabId: _tabId });
    bc.onmessage = (e) => {
      if (e.data?.type === "timer_started" && e.data?.tabId !== _tabId) {
        if (fsTimer) {
          localStorage.removeItem("sv_running_timer");
          setFsTimer(null);
          setFsMinimised(false);
          window.dispatchEvent(new Event("sv_timer_stopped"));
        }
      }
    };
    window.addEventListener("sv_timer_broadcast", onTimerStart);
    return () => {
      bc.close();
      window.removeEventListener("sv_timer_broadcast", onTimerStart);
    };
  }, [fsTimer]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const TODAY = dateKey(0);
    authFetch(`${API}/api/void/study/me`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setStudyData(d.data);
          setDailyGoalHrs(d.data.goalHrs || 8);
          const ds = d.data.dailySecs || {};
          Object.entries(ds).forEach(([k, v]) => lsSet("sv_daily_" + k, v));
          if (d.data.todoLists) lsSet("sv_todo_lists", d.data.todoLists);
          setTodaySecs(
            (ds[TODAY] || 0) + lsGet<number>("sv_pomo_today_" + TODAY, 0),
          );
          const lifetime = Object.values(ds).reduce(
            (a: number, v) => a + (v as number),
            0,
          );
          setTotalSecs(lifetime);
        } else {
          setTodaySecs(lsGet<number>("sv_daily_" + TODAY, 0));
        }
      })
      .catch(() => setTodaySecs(lsGet<number>("sv_daily_" + dateKey(0), 0)))
      .finally(() => setDataLoading(false));
  }, [user?.uid]); // eslint-disable-line

  const computeLifetime = () => {
    let sum = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("sv_daily_") || k.startsWith("sv_pomo_today_")) {
        try {
          sum += Number(localStorage.getItem(k)) || 0;
        } catch {}
      }
    }
    return sum;
  };

  useEffect(() => {
    const h = () => {
      const TODAY = dateKey(0);
      setTodaySecs(
        lsGet<number>("sv_daily_" + TODAY, 0) +
          lsGet<number>("sv_pomo_today_" + TODAY, 0),
      );
      setTotalSecs(computeLifetime());
    };
    window.addEventListener("sv_update", h);
    return () => window.removeEventListener("sv_update", h);
  }, []);

  const addStudyTime = useCallback((secs: number) => {
    if (secs <= 1 || secs > 43200) return;
    const TODAY = dateKey(0);
    const next = lsGet<number>("sv_daily_" + TODAY, 0) + secs;
    lsSet("sv_daily_" + TODAY, next);
    setTodaySecs(next + lsGet<number>("sv_pomo_today_" + TODAY, 0));
    setTotalSecs(computeLifetime());
    authFetch(`${API}/api/void/study/sync`, {
      method: "POST",
      body: JSON.stringify({ dailySecsIncrement: { date: TODAY, secs } }),
    }).catch(() => {});
    window.dispatchEvent(new Event("sv_update"));
  }, []); // eslint-disable-line

  const removeStudyTime = useCallback((secs: number) => {
    if (secs <= 0) return;
    const TODAY = dateKey(0);
    const next = Math.max(0, lsGet<number>("sv_daily_" + TODAY, 0) - secs);
    lsSet("sv_daily_" + TODAY, next);
    setTodaySecs(next);
    setTotalSecs(computeLifetime());
    authFetch(`${API}/api/void/study/sync`, {
      method: "POST",
      body: JSON.stringify({
        dailySecsIncrement: { date: TODAY, secs: -secs },
      }),
    }).catch(() => {});
    window.dispatchEvent(new Event("sv_update"));
  }, []); // eslint-disable-line

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
    (totalSecs: number) => {
      if (!fsTimer) return;
      if (totalSecs < 2) {
        localStorage.removeItem("sv_running_timer");
        localStorage.removeItem("sv_autosave");
        setFsTimer(null);
        setFsMinimised(false);
        window.dispatchEvent(new Event("sv_timer_stopped"));
        return;
      }
      window.dispatchEvent(
        new CustomEvent("sv_timer_done", {
          detail: {
            taskId: fsTimer.taskId,
            listIdx: fsTimer.listIdx,
            totalSecs,
          },
        }),
      );
      setFsTimer(null);
      setFsMinimised(false);
    },
    [fsTimer],
  );

  const handleFsDiscard = useCallback(() => {
    localStorage.removeItem("sv_running_timer");
    localStorage.removeItem("sv_autosave");
    setFsTimer(null);
    setFsMinimised(false);
    window.dispatchEvent(new Event("sv_timer_stopped"));
  }, []);

  const handleFsReset = useCallback(() => {
    if (!fsTimer) return;
    const lists = lsGet<TodoList[]>("sv_todo_lists", []);
    const task = lists[fsTimer.listIdx]?.items.find(
      (t) => t.id === fsTimer.taskId,
    );
    const totalForTask = task?.studiedSecs ?? 0;
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
    localStorage.removeItem("sv_autosave");
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

      {/* Fullscreen task timer */}
      {fsTimer && !fsMinimised && (
        <FullscreenStopwatch
          state={fsTimer}
          onMinimise={handleFsMinimise}
          onStop={handleFsDiscard}
          onDone={handleFsDone}
          onReset={handleFsReset}
        />
      )}

      {/* ── UNIFIED FAB ── */}
      {(fsMinimised || (!fsTimer && pomoState)) && (
        <UnifiedTimerFAB
          pomoState={pomoState}
          pomoCfg={pomoCfg}
          onOpenPomo={() => {
            window.dispatchEvent(new Event("sv_pomo_open"));
          }}
          taskTimer={fsMinimised ? fsTimer : null}
          onOpenTask={handleFsExpand}
        />
      )}

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}

      {showFlex && user && (
        <FlexScreen
          todaySecs={todaySecs}
          totalSecs={computeLifetime()}
          dailyGoalHrs={dailyGoalHrs}
          user={user}
          onClose={() => setShowFlex(false)}
        />
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

          {/* Flex button */}
          <button
            onClick={() => setShowFlex(true)}
            title="Flex your study session"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg,#7c3aed18,#a78bfa18)",
              border: "1.5px solid rgba(139,92,246,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 16,
              transition: "all 0.18s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(139,92,246,0.18)";
              (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "linear-gradient(135deg,#7c3aed18,#a78bfa18)";
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
          >
            ⚡
          </button>

          {/* Today time pill */}
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
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              / {dailyGoalHrs}h
            </span>
            <span
              className="sv-hide-xs"
              style={{ fontSize: 11, color: "#9ca3af" }}
            >
              target
            </span>
          </div>

          <a
            href="/community?view=communities"
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
            <span style={{ marginLeft: 2, color: "#92400e" }}>Groups</span>
          </a>

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
              <UserAvatar
                user={user}
                size={32}
                fontSize={13}
                border="2px solid #ede9fe"
              />
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
                  window.dispatchEvent(new Event("sv_timer_broadcast"));
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
                initialTopics={studyData?.topics?.[dateKey(0)]}
              />
            )}
          </>
        )}
      </main>

      {/* Pomodoro Timer */}
      <PomodoroTimer
        onStudyTime={addStudyTime}
        taskTimerState={fsTimer}
        onExpandTaskTimer={handleFsExpand}
      />

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
            <UserAvatar
              user={user}
              size={24}
              fontSize={11}
              border="1.5px solid #ede9fe"
            />
            <span style={{ fontSize: 10, fontWeight: 700 }}>Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

const _tabId = Math.random().toString(36).slice(2);

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
