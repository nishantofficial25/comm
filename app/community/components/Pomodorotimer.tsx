"use client";
/**
 * PomodoroTimer — Production-grade standalone focus timer
 *
 * CHANGES:
 *  • Mutual exclusion: blocks start if a task timer (sv_running_timer) is active
 *  • UnifiedTimerFAB replaces MiniTimerBadge — one beautiful floating circle
 *    handles BOTH Pomodoro and task timer display when minimised
 *  • Break time is tracked separately and shown in the FAB/stats
 *  • All alerts replaced with beautiful modal popups
 *  • Save & finish popup on skip/mode-switch when focus session is running
 *  • Pomo focus time stored in sv_pomo_today_<date> (already) + dispatches sv_update
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { lsGet, lsSet, dateKey, fmtSecs } from "../lib/utils";
import { FullscreenTimerState } from "./FullscreenStopwatch";

/* ───────────────────── constants ───────────────────────────────────── */
const POMO_KEY = "sv_pomo_timer";
const POMO_LABEL = "sv_pomo_label";
const POMO_SETTINGS = "sv_pomo_settings";
const TASK_TIMER_KEY = "sv_running_timer";
const FAB_D = 72;
const FAB_BOTTOM = 90;

/* ───────────────────── types ───────────────────────────────────────── */
type Mode = "focus" | "short" | "long";
type Phase = "hidden" | "expanding" | "open" | "collapsing";

interface Cfg {
  focusMins: number;
  shortBreakMins: number;
  longBreakMins: number;
  longBreakAfter: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
}

interface PS {
  mode: Mode;
  sessionStart: number;
  totalPausedMs: number;
  pausedAt: number | null;
  savedSecs: number;
  sessionBaseSecs: number;
  completedFocus: number;
  label: string;
}

interface TaskTimerState {
  taskId: string;
  listIdx: number;
  savedSecs: number;
  sessionStart: number;
  pausedAt?: number | null;
  totalPausedMs?: number;
}

interface Props {
  onStudyTime: (s: number) => void;
  taskTimerState?: FullscreenTimerState | null;
  onExpandTaskTimer?: () => void;
}

/* ───────────────────── helpers ─────────────────────────────────────── */
const N = () => Date.now();
const p2 = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");

function fmt(s: number): string {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h > 0 ? `${p2(h)}:${p2(m)}:${p2(ss)}` : `${p2(m)}:${p2(ss)}`;
}

function fmtH(s: number): string {
  s = Math.max(0, s);
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function getLive(ps: PS): number {
  const po = ps.pausedAt ? N() - ps.pausedAt : 0;
  return (
    ps.savedSecs +
    Math.max(
      0,
      Math.floor((N() - ps.sessionStart - ps.totalPausedMs - po) / 1000),
    )
  );
}

function rPS(): PS | null {
  try {
    const r = localStorage.getItem(POMO_KEY);
    return r ? (JSON.parse(r) as PS) : null;
  } catch {
    return null;
  }
}
function wPS(s: PS) {
  try {
    localStorage.setItem(POMO_KEY, JSON.stringify(s));
  } catch {}
}
function dPS() {
  localStorage.removeItem(POMO_KEY);
  sessionStorage.removeItem("sv_pomo_alive");
}

function rCfg(): Cfg {
  return lsGet<Cfg>(POMO_SETTINGS, {
    focusMins: 25,
    shortBreakMins: 5,
    longBreakMins: 15,
    longBreakAfter: 4,
    autoStartBreak: false,
    autoStartFocus: false,
    soundEnabled: true,
  });
}

function todayFocusSecs() {
  return lsGet<number>("sv_pomo_today_" + dateKey(0), 0);
}
function addFocusSecs(inc: number) {
  const k = "sv_pomo_today_" + dateKey(0);
  lsSet(k, lsGet<number>(k, 0) + inc);
}

/* ───────────────────── audio ───────────────────────────────────────── */
function tone(freq: number, dur: number, delay = 0) {
  setTimeout(() => {
    try {
      const ctx = new (
        (window as any).AudioContext || (window as any).webkitAudioContext
      )() as AudioContext;
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.22, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      o.start();
      o.stop(ctx.currentTime + dur);
      setTimeout(() => ctx.close(), 700);
    } catch {}
  }, delay);
}
function chime() {
  tone(523, 0.22, 0);
  tone(659, 0.22, 175);
  tone(784, 0.32, 350);
}

/* ───────────────────── SVG ring ────────────────────────────────────── */
function Ring({
  pct,
  sz,
  sw,
  color,
  track = "#1c1c38",
}: {
  pct: number;
  sz: number;
  sw: number;
  color: string;
  track?: string;
}) {
  const r = (sz - sw) / 2;
  const cir = 2 * Math.PI * r;
  const off = cir * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return (
    <svg
      width={sz}
      height={sz}
      style={{
        position: "absolute",
        inset: 0,
        transform: "rotate(-90deg)",
        pointerEvents: "none",
      }}
    >
      <circle
        cx={sz / 2}
        cy={sz / 2}
        r={r}
        fill="none"
        stroke={track}
        strokeWidth={sw}
      />
      <circle
        cx={sz / 2}
        cy={sz / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeDasharray={cir}
        strokeDashoffset={off}
        strokeLinecap="round"
        style={{
          transition: "stroke-dashoffset 0.85s ease",
          filter: `drop-shadow(0 0 ${sw * 2}px ${color}99)`,
        }}
      />
    </svg>
  );
}

/* ───────────────────── palette ─────────────────────────────────────── */
const PAL: Record<
  Mode,
  {
    c: string;
    cl: string;
    label: string;
    emoji: string;
    glow: string;
    fabTrack: string;
  }
> = {
  focus: {
    c: "#7c3aed",
    cl: "#a78bfa",
    label: "Focus",
    emoji: "🎯",
    glow: "radial-gradient(ellipse at 50% 50%, #7c3aed26 0%, transparent 70%)",
    fabTrack: "rgba(139,92,246,0.18)",
  },
  short: {
    c: "#047857",
    cl: "#34d399",
    label: "Short Break",
    emoji: "☕",
    glow: "radial-gradient(ellipse at 50% 50%, #04785726 0%, transparent 70%)",
    fabTrack: "rgba(52,211,153,0.18)",
  },
  long: {
    c: "#0369a1",
    cl: "#38bdf8",
    label: "Long Break",
    emoji: "🌿",
    glow: "radial-gradient(ellipse at 50% 50%, #0369a126 0%, transparent 70%)",
    fabTrack: "rgba(56,189,248,0.18)",
  },
};

/* ═══════════════════════════════════════════════════════
   BEAUTIFUL MODAL SYSTEM
   ═══════════════════════════════════════════════════════ */
interface ModalAction {
  label: string;
  variant: "primary" | "danger" | "ghost";
  onClick: () => void;
  color?: string;
}

function Modal({
  icon,
  iconBg,
  title,
  subtitle,
  body,
  actions,
  onClose,
  dark,
}: {
  icon: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
  actions: ModalAction[];
  onClose: () => void;
  dark?: boolean;
}) {
  const bg = dark ? "#0b0b1e" : "white";
  const border = dark ? "#1a1a36" : "#f3f0ff";
  const titleColor = dark ? "#e0deff" : "#111827";
  const subColor = dark ? "#44447a" : "#6b7280";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "modalBgIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: bg,
          border: `1.5px solid ${border}`,
          borderRadius: 26,
          padding: "32px 28px 26px",
          maxWidth: 380,
          width: "100%",
          boxShadow: dark
            ? "0 32px 80px rgba(0,0,0,0.85)"
            : "0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px #f3f0ff",
          animation: "modalCardIn 0.25s cubic-bezier(.16,1,.3,1)",
        }}
      >
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 20px",
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: titleColor,
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: "-0.3px",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 13,
              color: subColor,
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: body ? 16 : 28,
            }}
          >
            {subtitle}
          </div>
        )}
        {body && <div style={{ marginBottom: 26 }}>{body}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s",
                ...(a.variant === "primary"
                  ? {
                      background: a.color
                        ? `linear-gradient(135deg,${a.color},${a.color}cc)`
                        : "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                      color: "white",
                      boxShadow: `0 4px 16px ${a.color ?? "#8b5cf6"}44`,
                    }
                  : a.variant === "danger"
                    ? {
                        background: "linear-gradient(135deg,#dc2626,#ef4444)",
                        color: "white",
                        boxShadow: "0 4px 16px #ef444430",
                      }
                    : {
                        background: dark ? "#1a1a38" : "#f9fafb",
                        color: dark ? "#6a6a9a" : "#6b7280",
                        border: `1.5px solid ${dark ? "#2a2a48" : "#e5e7eb"}`,
                      }),
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes modalBgIn   { from{opacity:0} to{opacity:1} }
        @keyframes modalCardIn { from{opacity:0;transform:scale(.92) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SAVE & SKIP MODAL — shown when skipping/switching during focus
   ═══════════════════════════════════════════════════════ */
function SaveSkipModal({
  focusSecs,
  targetLabel,
  onSaveAndSkip,
  onSkipOnly,
  onCancel,
}: {
  focusSecs: number;
  targetLabel: string;
  onSaveAndSkip: () => void;
  onSkipOnly: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 950,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "modalBgIn 0.2s ease",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0b0b1e",
          border: "1.5px solid #1a1a36",
          borderRadius: 26,
          padding: "32px 28px 26px",
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 32px 80px rgba(0,0,0,0.85)",
          animation: "modalCardIn 0.25s cubic-bezier(.16,1,.3,1)",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: "linear-gradient(135deg,#1a0a30,#2d1060)",
            border: "1.5px solid #4c1d95",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            margin: "0 auto 20px",
          }}
        >
          🎯
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#e0deff",
            marginBottom: 8,
            letterSpacing: "-0.3px",
          }}
        >
          Save focus time?
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#44447a",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          You've focused for{" "}
          <span style={{ color: "#a78bfa", fontWeight: 800 }}>
            {fmtH(focusSecs)}
          </span>
          . Save it to your stats before switching to{" "}
          <span style={{ color: "#6ee7b7", fontWeight: 700 }}>
            {targetLabel}
          </span>
          ?
        </div>

        {/* Time display */}
        <div
          style={{
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 16,
            padding: "14px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>🎯</span>
          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: 26,
                fontWeight: 900,
                color: "#a78bfa",
                letterSpacing: "-1px",
                lineHeight: 1,
              }}
            >
              {fmt(focusSecs)}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#44447a",
                marginTop: 3,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              FOCUS TIME
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={onSaveAndSkip}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              border: "none",
              background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
              color: "white",
              boxShadow: "0 4px 16px #8b5cf644",
            }}
          >
            ✓ Save & continue to {targetLabel}
          </button>
          <button
            onClick={onSkipOnly}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: "#1a1a38",
              color: "#6a6a9a",
              border: "1.5px solid #2a2a48",
            }}
          >
            Skip without saving
          </button>
          <button
            onClick={onCancel}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              background: "transparent",
              color: "#33335a",
              border: "none",
            }}
          >
            Cancel — keep focusing
          </button>
        </div>
      </div>
      <style>{`
        @keyframes modalBgIn   { from{opacity:0} to{opacity:1} }
        @keyframes modalCardIn { from{opacity:0;transform:scale(.92) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   UNIFIED TIMER FAB
   ═══════════════════════════════════════════════════════ */
export function UnifiedTimerFAB({
  pomoState,
  pomoCfg,
  onOpenPomo,
  taskTimer,
  onOpenTask,
}: {
  pomoState: PS | null;
  pomoCfg: Cfg;
  onOpenPomo: () => void;
  taskTimer: FullscreenTimerState | null;
  onOpenTask: () => void;
}) {
  const [, tick] = useState(0);
  const [taskElapsed, setTaskElapsed] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!taskTimer) return;
    const compute = () => {
      const raw = localStorage.getItem("sv_running_timer");
      if (!raw) return;
      try {
        const t = JSON.parse(raw);
        const po = t.pausedAt ? N() - t.pausedAt : 0;
        const tpm = t.totalPausedMs ?? 0;
        const el =
          t.savedSecs +
          Math.max(0, Math.floor((N() - t.sessionStart - tpm - po) / 1000));
        setTaskElapsed(el);
      } catch {}
    };
    compute();
    const iv = setInterval(compute, 1000);
    return () => clearInterval(iv);
  }, [taskTimer?.taskId, taskTimer?.pausedAt]);

  const hasTask = !!taskTimer;
  const hasPomo = !!pomoState;

  if (!hasTask && !hasPomo) return null;

  if (hasTask) {
    const raw = (() => {
      try {
        return JSON.parse(localStorage.getItem("sv_running_timer") || "null");
      } catch {
        return null;
      }
    })();
    const isPaused = raw ? !!raw.pausedAt : !!taskTimer?.pausedAt;
    const c = taskTimer!.listColor;
    const total = taskElapsed;
    const assigned = taskTimer!.initialSecs;
    const pct =
      assigned > 0
        ? Math.min((total / assigned) * 100, 100)
        : Math.min((total / 3600) * 100, 100);

    return (
      <>
        <button
          onClick={onOpenTask}
          className="unified-fab"
          style={{ "--fab-color": c } as any}
          title="Open task timer"
        >
          <div
            className="ufab-glow"
            style={{
              background: `radial-gradient(circle, ${c}33 0%, transparent 70%)`,
            }}
          />
          <svg
            className="ufab-ring"
            width={FAB_D}
            height={FAB_D}
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx={FAB_D / 2}
              cy={FAB_D / 2}
              r={(FAB_D - 6) / 2}
              fill="none"
              stroke={c + "25"}
              strokeWidth={4}
            />
            <circle
              cx={FAB_D / 2}
              cy={FAB_D / 2}
              r={(FAB_D - 6) / 2}
              fill="none"
              stroke={isPaused ? "#f59e0b" : c}
              strokeWidth={4}
              strokeDasharray={(2 * Math.PI * (FAB_D - 6)) / 2}
              strokeDashoffset={
                ((2 * Math.PI * (FAB_D - 6)) / 2) * (1 - pct / 100)
              }
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 1s ease",
                filter: `drop-shadow(0 0 6px ${isPaused ? "#f59e0b" : c}88)`,
              }}
            />
          </svg>
          <div className="ufab-inner">
            {!isPaused && (
              <div className="ufab-live-dot" style={{ background: c }} />
            )}
            <div
              className="ufab-time"
              style={{ color: isPaused ? "#f59e0b" : c }}
            >
              {fmt(total)}
            </div>
            <div
              className="ufab-label"
              style={{ color: (isPaused ? "#f59e0b" : c) + "aa" }}
            >
              {isPaused ? "PAUSED" : "TASK"}
            </div>
          </div>
          <div className="ufab-expand">⛶</div>
          <div className="ufab-tooltip">
            <span style={{ color: c, fontWeight: 800, fontSize: 10 }}>
              {taskTimer!.taskName.length > 18
                ? taskTimer!.taskName.slice(0, 18) + "…"
                : taskTimer!.taskName}
            </span>
          </div>
        </button>
        <style>{FAB_CSS}</style>
      </>
    );
  }

  const mode = pomoState!.mode;
  const pal = PAL[mode];
  const isPaused = !!pomoState!.pausedAt;
  const live = getLive(pomoState!);
  const tgtSecs =
    (mode === "focus"
      ? pomoCfg.focusMins
      : mode === "short"
        ? pomoCfg.shortBreakMins
        : pomoCfg.longBreakMins) * 60;
  const remaining = Math.max(0, tgtSecs - live);
  const pct = tgtSecs > 0 ? Math.min((live / tgtSecs) * 100, 100) : 0;
  const dots = pomoState!.completedFocus;
  const c = isPaused ? "#f59e0b" : pal.c;
  const cl = isPaused ? "#fbbf24" : pal.cl;

  return (
    <>
      <button
        onClick={onOpenPomo}
        className="unified-fab"
        style={{ "--fab-color": c } as any}
        title="Open Pomodoro timer"
      >
        <div
          className="ufab-glow"
          style={{
            background: `radial-gradient(circle, ${c}33 0%, transparent 70%)`,
          }}
        />
        <svg
          className="ufab-ring"
          width={FAB_D}
          height={FAB_D}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={FAB_D / 2}
            cy={FAB_D / 2}
            r={(FAB_D - 6) / 2}
            fill="none"
            stroke={c + "25"}
            strokeWidth={4}
          />
          <circle
            cx={FAB_D / 2}
            cy={FAB_D / 2}
            r={(FAB_D - 6) / 2}
            fill="none"
            stroke={c}
            strokeWidth={4}
            strokeDasharray={(2 * Math.PI * (FAB_D - 6)) / 2}
            strokeDashoffset={
              ((2 * Math.PI * (FAB_D - 6)) / 2) * (1 - pct / 100)
            }
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.85s ease",
              filter: `drop-shadow(0 0 6px ${c}88)`,
            }}
          />
        </svg>
        <div className="ufab-inner">
          {!isPaused && (
            <div className="ufab-live-dot" style={{ background: cl }} />
          )}
          <div className="ufab-time" style={{ color: cl }}>
            {fmt(remaining)}
          </div>
          <div className="ufab-label" style={{ color: cl + "99" }}>
            {isPaused ? "PAUSED" : mode === "focus" ? "FOCUS" : "BREAK"}
          </div>
        </div>
        {pomoCfg.longBreakAfter > 0 && (
          <div className="ufab-dots">
            {Array.from({ length: pomoCfg.longBreakAfter }).map((_, i) => (
              <div
                key={i}
                className="ufab-dot"
                style={{
                  background:
                    i < dots % pomoCfg.longBreakAfter ? cl : cl + "30",
                }}
              />
            ))}
          </div>
        )}
        <div className="ufab-expand">⛶</div>
        <div className="ufab-tooltip">
          <span style={{ color: cl, fontWeight: 800, fontSize: 10 }}>
            {pal.emoji} {pal.label}
          </span>
        </div>
      </button>
      <style>{FAB_CSS}</style>
    </>
  );
}

const FAB_CSS = `
  .unified-fab {
    position: fixed;
    bottom: ${FAB_BOTTOM}px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 250;
    width: ${FAB_D}px;
    height: ${FAB_D}px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(145deg, #100820, #06030f);
    box-shadow:
      0 6px 28px rgba(0,0,0,0.6),
      0 0 0 1.5px var(--fab-color, #8b5cf6)44,
      inset 0 1px 0 rgba(255,255,255,0.05);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;
    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
    -webkit-tap-highlight-color: transparent;
    animation: fabSlideIn 0.35s cubic-bezier(.16,1,.3,1);
  }
  .unified-fab:hover {
    transform: translateX(-50%) scale(1.1);
    box-shadow:
      0 10px 36px rgba(0,0,0,0.7),
      0 0 0 2px var(--fab-color, #8b5cf6)88,
      inset 0 1px 0 rgba(255,255,255,0.07);
  }
  .unified-fab:active { transform: translateX(-50%) scale(0.93); }
  .ufab-glow { position: absolute; width: 120%; height: 120%; border-radius: 50%; top: -10%; left: -10%; pointer-events: none; opacity: 0.6; }
  .ufab-ring { position: absolute; inset: 0; pointer-events: none; }
  .ufab-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; pointer-events: none; }
  .ufab-live-dot { width: 5px; height: 5px; border-radius: 50%; animation: fabDotPulse 1.8s ease infinite; margin-bottom: 1px; }
  .ufab-time { font-family: 'Space Grotesk', 'SF Mono', monospace; font-size: 13px; font-weight: 900; letter-spacing: -0.8px; font-variant-numeric: tabular-nums; line-height: 1; }
  .ufab-label { font-size: 7px; font-weight: 800; letter-spacing: 0.08em; line-height: 1; }
  .ufab-dots { position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); display: flex; gap: 3px; pointer-events: none; }
  .ufab-dot { width: 5px; height: 5px; border-radius: 50%; transition: background 0.3s; }
  .ufab-expand { position: absolute; top: 3px; right: 3px; font-size: 9px; color: rgba(255,255,255,0.18); pointer-events: none; line-height: 1; }
  .ufab-tooltip { position: absolute; bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%) translateY(6px); background: rgba(10,8,24,0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 5px 10px; white-space: nowrap; opacity: 0; transition: opacity 0.18s, transform 0.18s; pointer-events: none; backdrop-filter: blur(8px); }
  .unified-fab:hover .ufab-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
  @keyframes fabSlideIn   { from{opacity:0;transform:translateX(-50%) scale(0.7) translateY(20px)} to{opacity:1;transform:translateX(-50%) scale(1) translateY(0)} }
  @keyframes fabDotPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }
`;

/* ══════════════════════ MAIN COMPONENT ════════════════════════════════ */
export default function PomodoroTimer({
  onStudyTime,
  taskTimerState,
  onExpandTaskTimer,
}: Props) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [ps, setPS] = useState<PS | null>(null);
  const [cfg, setCfg] = useState<Cfg>(rCfg);
  const [showCfg, setShowCfg] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showDisc, setShowDisc] = useState(false);
  const [showTaskConflict, setShowTaskConflict] = useState(false);
  // Save & skip modal state
  const [saveSkipAction, setSaveSkipAction] = useState<null | {
    type: "skip" | "mode";
    mode?: Mode;
  }>(null);
  const [label, setLabel] = useState(() =>
    lsGet<string>(POMO_LABEL, "Focus Session"),
  );
  const [editLbl, setEditLbl] = useState(false);
  const [lblDraft, setLblDraft] = useState("");
  const [, tick] = useState(0);

  const psRef = useRef<PS | null>(null);
  const cfgRef = useRef<Cfg>(cfg);
  const ivRef = useRef<ReturnType<typeof setInterval>>();
  const cpRef = useRef<ReturnType<typeof setInterval>>();
  const fabRef = useRef<HTMLButtonElement>(null);
  const [origin, setOrigin] = useState({ x: 50, y: 100 });

  useEffect(() => {
    psRef.current = ps;
  }, [ps]);
  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  const updateOrigin = useCallback(() => {
    const el = fabRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setOrigin({
      x: ((r.left + r.width / 2) / window.innerWidth) * 100,
      y: ((r.top + r.height / 2) / window.innerHeight) * 100,
    });
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateOrigin);
    return () => window.removeEventListener("resize", updateOrigin);
  }, [updateOrigin]);

  useEffect(() => {
    if (ps && !ps.pausedAt) {
      ivRef.current = setInterval(() => tick((x) => x + 1), 500);
    } else {
      clearInterval(ivRef.current);
    }
    return () => clearInterval(ivRef.current);
  }, [!!ps, ps?.pausedAt]);

  /* ── Listen for sv_pomo_open event from parent ── */
  useEffect(() => {
    const h = () => openFs();
    window.addEventListener("sv_pomo_open", h);
    return () => window.removeEventListener("sv_pomo_open", h);
  }, []);

  /* ── Handle browser back button to close fullscreen ── */
  useEffect(() => {
    if (phase === "open" || phase === "expanding") {
      window.history.pushState({ pomoOpen: true }, "");

      const onPop = () => {
        closeFs();
      };

      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
  }, [phase]); // eslint-disable-line

  /* ── checkpoint ── */
  const checkpoint = useCallback(() => {
    const s = psRef.current;
    if (!s || s.mode !== "focus") return;
    const live = getLive(s);
    const u: PS = {
      ...s,
      savedSecs: live,
      sessionStart: N(),
      totalPausedMs: 0,
      pausedAt: s.pausedAt ? N() : null,
    };
    wPS(u);
    psRef.current = u;
    setPS(u);
  }, []);

  useEffect(() => {
    if (ps && !ps.pausedAt) {
      cpRef.current = setInterval(checkpoint, 3 * 60 * 1000);
    } else {
      clearInterval(cpRef.current);
    }
    return () => clearInterval(cpRef.current);
  }, [!!ps, ps?.pausedAt, checkpoint]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") checkpoint();
    };
    const onUnload = () => checkpoint();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [checkpoint]);

  /* ── mount restore ── */
  useEffect(() => {
    const saved = rPS();
    if (!saved) return;
    if (sessionStorage.getItem("sv_pomo_alive")) {
      setPS(saved);
      setLabel(saved.label);
    } else {
      const r: PS = {
        ...saved,
        sessionStart: N(),
        totalPausedMs: 0,
        pausedAt: N(),
      };
      wPS(r);
      setPS(r);
      setLabel(saved.label);
    }
  }, []);

  /* ── auto-complete ── */
  useEffect(() => {
    if (!ps || ps.pausedAt) return;
    const c = cfgRef.current;
    const tgt =
      ps.mode === "focus"
        ? c.focusMins * 60
        : ps.mode === "short"
          ? c.shortBreakMins * 60
          : c.longBreakMins * 60;
    if (tgt > 0 && getLive(ps) >= tgt) advance(ps);
  });

  /* ── advance ── */
  const advance = useCallback(
    (s: PS) => {
      if (psRef.current?.sessionStart !== s.sessionStart) return;
      const c = cfgRef.current;
      if (c.soundEnabled) chime();
      if (s.mode === "focus") {
        const live = getLive(s);
        if (live > 1) {
          addFocusSecs(live);
          onStudyTime(live);
          window.dispatchEvent(new Event("sv_update"));
        }
        const done = s.completedFocus + 1;
        const isLong = done % c.longBreakAfter === 0;
        const next: PS = {
          ...s,
          mode: isLong ? "long" : "short",
          sessionStart: N(),
          totalPausedMs: 0,
          savedSecs: 0,
          sessionBaseSecs: 0,
          completedFocus: done,
          pausedAt: c.autoStartBreak ? null : N(),
        };
        wPS(next);
        psRef.current = next;
        setPS(next);
      } else {
        const next: PS = {
          ...s,
          mode: "focus",
          sessionStart: N(),
          totalPausedMs: 0,
          savedSecs: 0,
          sessionBaseSecs: todayFocusSecs(),
          pausedAt: c.autoStartFocus ? null : N(),
        };
        wPS(next);
        psRef.current = next;
        setPS(next);
      }
    },
    [onStudyTime],
  );

  /* ── open / close ── */
  const openFs = useCallback(() => {
    updateOrigin();
    setPhase("expanding");
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("open")));
  }, [updateOrigin]);

  const closeFs = useCallback(() => {
    setPhase("collapsing");
    setTimeout(() => setPhase("hidden"), 420);
  }, []);

  /* ── timer actions ── */
  const startFocus = useCallback(() => {
    const taskRaw = localStorage.getItem(TASK_TIMER_KEY);
    if (taskRaw) {
      try {
        const t = JSON.parse(taskRaw);
        if (t && !t.pausedAt) {
          setShowTaskConflict(true);
          return;
        }
      } catch {}
    }
    const s: PS = {
      mode: "focus",
      sessionStart: N(),
      totalPausedMs: 0,
      pausedAt: null,
      savedSecs: 0,
      sessionBaseSecs: todayFocusSecs(),
      completedFocus: 0,
      label,
    };
    wPS(s);
    sessionStorage.setItem("sv_pomo_alive", "1");
    setPS(s);
  }, [label]);

  const togglePause = useCallback(() => {
    const s = psRef.current;
    if (!s) return;
    const u: PS = s.pausedAt
      ? {
          ...s,
          totalPausedMs: s.totalPausedMs + (N() - s.pausedAt!),
          pausedAt: null,
        }
      : { ...s, pausedAt: N() };
    wPS(u);
    psRef.current = u;
    setPS(u);
  }, []);

  /* ── SKIP: show save modal if in focus mode with >10s elapsed ── */
  const skip = useCallback(() => {
    const s = psRef.current;
    if (!s) return;
    if (s.mode === "focus") {
      const live = getLive(s);
      if (live > 10) {
        setSaveSkipAction({ type: "skip" });
        return;
      }
    }
    advance(s);
  }, [advance]);

  /* ── MODE SWITCH: show save modal if switching away from active focus ── */
  const switchMode = useCallback(
    (m: Mode) => {
      const s = psRef.current;
      if (s && s.mode === "focus" && m !== "focus") {
        const live = getLive(s);
        if (live > 10) {
          setSaveSkipAction({ type: "mode", mode: m });
          return;
        }
      }
      // Directly switch
      const fresh: PS = {
        mode: m,
        sessionStart: N(),
        totalPausedMs: 0,
        pausedAt: N(),
        savedSecs: 0,
        sessionBaseSecs: m === "focus" ? todayFocusSecs() : 0,
        completedFocus: s?.completedFocus ?? 0,
        label: s?.label ?? label,
      };
      wPS(fresh);
      sessionStorage.setItem("sv_pomo_alive", "1");
      psRef.current = fresh;
      setPS(fresh);
    },
    [label],
  );

  /* ── Save & Skip handlers ── */
  const handleSaveAndSkip = useCallback(() => {
    const s = psRef.current;
    const action = saveSkipAction;
    setSaveSkipAction(null);
    if (!s) return;

    // Save the focus time
    const live = getLive(s);
    if (live > 1) {
      addFocusSecs(live);
      onStudyTime(live);
      window.dispatchEvent(new Event("sv_update"));
    }

    if (action?.type === "skip") {
      advance(s);
    } else if (action?.type === "mode" && action.mode) {
      const m = action.mode;
      const fresh: PS = {
        mode: m,
        sessionStart: N(),
        totalPausedMs: 0,
        pausedAt: N(),
        savedSecs: 0,
        sessionBaseSecs: m === "focus" ? todayFocusSecs() : 0,
        completedFocus: s.completedFocus,
        label: s.label,
      };
      wPS(fresh);
      psRef.current = fresh;
      setPS(fresh);
    }
  }, [saveSkipAction, advance, onStudyTime]);

  const handleSkipOnly = useCallback(() => {
    const s = psRef.current;
    const action = saveSkipAction;
    setSaveSkipAction(null);
    if (!s) return;

    if (action?.type === "skip") {
      advance(s);
    } else if (action?.type === "mode" && action.mode) {
      const m = action.mode;
      const fresh: PS = {
        mode: m,
        sessionStart: N(),
        totalPausedMs: 0,
        pausedAt: N(),
        savedSecs: 0,
        sessionBaseSecs: m === "focus" ? todayFocusSecs() : 0,
        completedFocus: s.completedFocus,
        label: s.label,
      };
      wPS(fresh);
      psRef.current = fresh;
      setPS(fresh);
    }
  }, [saveSkipAction, advance]);

  const handleDone = useCallback(() => {
    const s = psRef.current;
    if (!s) return;
    if (s.mode === "focus") {
      let fp = s.totalPausedMs;
      if (s.pausedAt) fp += N() - s.pausedAt;
      const inc = Math.max(
        0,
        s.savedSecs + Math.floor((N() - s.sessionStart - fp) / 1000),
      );
      if (inc > 1) {
        addFocusSecs(inc);
        onStudyTime(inc);
        window.dispatchEvent(new Event("sv_update"));
      }
    }
    dPS();
    setPS(null);
    closeFs();
  }, [onStudyTime, closeFs]);

  const handleReset = useCallback(() => {
    const s = psRef.current;
    if (!s) return;
    const fresh: PS = {
      ...s,
      sessionStart: N(),
      totalPausedMs: 0,
      pausedAt: N(),
      savedSecs: 0,
      sessionBaseSecs: s.mode === "focus" ? todayFocusSecs() : 0,
    };
    wPS(fresh);
    psRef.current = fresh;
    setPS(fresh);
    setShowReset(false);
  }, []);

  const handleDiscard = useCallback(() => {
    dPS();
    setPS(null);
    setShowDisc(false);
    closeFs();
  }, [closeFs]);

  const patchCfg = useCallback((patch: Partial<Cfg>) => {
    const next = { ...cfgRef.current, ...patch };
    lsSet(POMO_SETTINGS, next);
    setCfg(next);
  }, []);

  const saveLabel = useCallback(() => {
    const v = lblDraft.trim() || "Focus Session";
    setLabel(v);
    lsSet(POMO_LABEL, v);
    setEditLbl(false);
    if (psRef.current) {
      const u = { ...psRef.current, label: v };
      wPS(u);
      psRef.current = u;
      setPS(u);
    }
  }, [lblDraft]);

  /* ── derived ── */
  const live = ps ? getLive(ps) : 0;
  const mode = ps?.mode ?? "focus";
  const pal = PAL[mode];
  const isPaused = !!ps?.pausedAt;
  const isRunning = !!ps && !isPaused;
  const tgtSecs = ps
    ? (mode === "focus"
        ? cfg.focusMins
        : mode === "short"
          ? cfg.shortBreakMins
          : cfg.longBreakMins) * 60
    : cfg.focusMins * 60;
  const remaining = Math.max(0, tgtSecs - live);
  const pct = tgtSecs > 0 ? Math.min((live / tgtSecs) * 100, 100) : 0;
  const dots = ps?.completedFocus ?? 0;
  const todayFocus = todayFocusSecs() + (ps?.mode === "focus" ? live : 0);
  const isOpen =
    phase === "open" || phase === "expanding" || phase === "collapsing";

  const closed = `circle(${FAB_D / 2 + 2}px at ${origin.x}% ${origin.y}%)`;
  const opened = `circle(200% at ${origin.x}% ${origin.y}%)`;
  const fsClip = phase === "expanding" || phase === "open" ? opened : closed;
  const fsTrans =
    phase === "expanding" || phase === "collapsing"
      ? "clip-path 0.42s cubic-bezier(0.4,0,0.2,1)"
      : "none";

  /* ── determine save/skip modal target label ── */
  const skipTargetLabel =
    saveSkipAction?.type === "skip"
      ? ps?.completedFocus !== undefined &&
        (ps.completedFocus + 1) % cfg.longBreakAfter === 0
        ? "Long Break"
        : "Short Break"
      : saveSkipAction?.mode
        ? PAL[saveSkipAction.mode].label
        : "Break";

  return (
    <>
      <style>{CSS}</style>

      {/* ── Save & Skip Modal ── */}
      {saveSkipAction && ps && ps.mode === "focus" && (
        <SaveSkipModal
          focusSecs={live}
          targetLabel={skipTargetLabel}
          onSaveAndSkip={handleSaveAndSkip}
          onSkipOnly={handleSkipOnly}
          onCancel={() => setSaveSkipAction(null)}
        />
      )}

      {/* ── Conflict Modal ── */}
      {showTaskConflict && (
        <Modal
          icon="⏱"
          iconBg="linear-gradient(135deg,#ede9fe,#ddd6fe)"
          title="Task Timer is Running"
          subtitle="A task timer is currently active. Stop or save it before starting a Pomodoro session."
          actions={[
            {
              label: "Got it",
              variant: "primary",
              onClick: () => setShowTaskConflict(false),
            },
          ]}
          onClose={() => setShowTaskConflict(false)}
        />
      )}

      {/* ── Internal Pomo FAB ── */}
      {phase === "hidden" && ps && !taskTimerState && (
        <button
          ref={fabRef}
          className="pomo-fab-internal"
          onClick={openFs}
          title="Open Pomodoro"
          style={
            {
              "--fc": isPaused ? "#f59e0b" : pal.c,
              "--fcl": isPaused ? "#fbbf24" : pal.cl,
            } as any
          }
        >
          <Ring
            pct={pct}
            sz={FAB_D}
            sw={4}
            color={isPaused ? "#f59e0b" : pal.c}
            track={ps ? pal.fabTrack : "rgba(139,92,246,0.15)"}
          />
          <div className="pomo-fab-body">
            {!isPaused && (
              <div
                className="pomo-fab-dot-live"
                style={{ background: pal.cl }}
              />
            )}
            <span
              className="pomo-fab-time"
              style={{ color: isPaused ? "#f59e0b" : pal.cl }}
            >
              {fmt(remaining)}
            </span>
            <span
              className="pomo-fab-sub"
              style={{ color: (isPaused ? "#f59e0b" : pal.cl) + "99" }}
            >
              {isPaused ? "PAUSED" : mode === "focus" ? "FOCUS" : "BREAK"}
            </span>
          </div>
          {dots > 0 && (
            <div className="pomo-fab-dots-row">
              {Array.from({ length: cfg.longBreakAfter }).map((_, i) => (
                <span
                  key={i}
                  className="pomo-fab-dot-sm"
                  style={{
                    background:
                      i < dots % cfg.longBreakAfter ? pal.cl : pal.cl + "28",
                  }}
                />
              ))}
            </div>
          )}
        </button>
      )}

      {phase === "hidden" && !ps && !taskTimerState && (
        <button
          ref={fabRef}
          className="pomo-fab-idle"
          onClick={openFs}
          title="Start a focus session"
        >
          <span style={{ fontSize: 22 }}>🍅</span>
          <span className="pomo-idle-lbl">FOCUS</span>
        </button>
      )}

      {/* ── fullscreen panel ── */}
      {isOpen && (
        <div
          className="pomo-fs"
          style={{ clipPath: fsClip, transition: fsTrans }}
        >
          <div
            className="pomo-ambient"
            style={{ background: pal.glow, transition: "background 0.6s ease" }}
          />

          {/* top bar */}
          <div className="pomo-bar">
            <button
              className="pomo-ibtn"
              onClick={() => setShowCfg(true)}
              title="Settings"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <span className="pomo-bar-title">
              {pal.emoji}&nbsp;{pal.label}
            </span>
            <button className="pomo-ibtn" onClick={closeFs} title="Minimise">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 19 19 12 12 5" />
              </svg>
            </button>
          </div>

          {/* mode tabs */}
          <div className="pomo-tabs">
            {(["focus", "short", "long"] as Mode[]).map((m) => (
              <button
                key={m}
                className={"pomo-tab" + (mode === m ? " active" : "")}
                style={
                  mode === m
                    ? {
                        color: PAL[m].c,
                        borderColor: PAL[m].c + "55",
                        background: PAL[m].c + "1a",
                      }
                    : {}
                }
                onClick={() => switchMode(m)}
              >
                {PAL[m].emoji}&nbsp;{PAL[m].label}
              </button>
            ))}
          </div>

          {/* session dots */}
          <div className="pomo-sdots">
            {Array.from({ length: cfg.longBreakAfter }).map((_, i) => (
              <span
                key={i}
                className="pomo-sdot"
                style={{
                  background:
                    i < dots % cfg.longBreakAfter
                      ? pal.cl
                      : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
            <span className="pomo-sdots-lbl">
              {dots} session{dots !== 1 ? "s" : ""} done
              {dots > 0 && dots % cfg.longBreakAfter === 0
                ? " · long break!"
                : ""}
            </span>
          </div>

          {/* big ring */}
          <div className="pomo-ring">
            <Ring
              pct={pct}
              sz={268}
              sw={10}
              color={isPaused ? "#f59e0b" : pal.c}
              track="#1a1a36"
            />
            {isRunning && (
              <div
                className="pomo-ring-pulse"
                style={
                  { boxShadow: `0 0 0 0 ${pal.c}66`, "--pc": pal.c } as any
                }
              />
            )}
            <div className="pomo-ring-inner">
              <span
                className="pomo-ring-chip"
                style={{ color: isPaused ? "#f59e0b" : pal.cl }}
              >
                {isPaused
                  ? "⏸ PAUSED"
                  : mode === "focus"
                    ? "🎯 FOCUSING"
                    : mode === "short"
                      ? "☕ SHORT BREAK"
                      : "🌿 LONG BREAK"}
              </span>
              <span
                className="pomo-ring-time"
                style={{
                  color: isPaused ? "#f59e0b" : "#eeeeff",
                  textShadow: `0 0 40px ${isPaused ? "#f59e0b44" : pal.c + "77"}`,
                }}
              >
                {ps ? fmt(remaining) : fmt(tgtSecs)}
              </span>
              <span className="pomo-ring-elapsed" style={{ color: "#aaaaae" }}>
                {ps
                  ? mode === "focus"
                    ? `focused : ${fmt(live)}`
                    : `break : ${fmt(live)}`
                  : "tap to start"}
              </span>
            </div>
          </div>

          <br />

          {/* quick presets */}
          {!ps && (
            <div className="pomo-presets">
              {(mode === "focus"
                ? [15, 20, 25, 45, 60, 90]
                : mode === "short"
                  ? [3, 5, 10, 15]
                  : [10, 15, 20, 30]
              ).map((m) => {
                const isSel =
                  (mode === "focus"
                    ? cfg.focusMins
                    : mode === "short"
                      ? cfg.shortBreakMins
                      : cfg.longBreakMins) === m;
                return (
                  <button
                    key={m}
                    className={"pomo-preset" + (isSel ? " sel" : "")}
                    style={
                      isSel
                        ? {
                            background: pal.c,
                            borderColor: pal.c,
                            color: "#fff",
                          }
                        : { color: pal.cl }
                    }
                    onClick={() => {
                      if (mode === "focus") patchCfg({ focusMins: m });
                      else if (mode === "short")
                        patchCfg({ shortBreakMins: m });
                      else patchCfg({ longBreakMins: m });
                    }}
                  >
                    {m}m
                  </button>
                );
              })}
            </div>
          )}

          {/* controls */}
          <div className="pomo-ctrls">
            {ps ? (
              <>
                <button
                  className="pomo-ctrl-rnd"
                  onClick={() => setShowReset(true)}
                  title="Reset"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
                <button
                  className="pomo-ctrl-main"
                  style={{
                    background: isPaused
                      ? `linear-gradient(135deg,${pal.c},${pal.cl})`
                      : `linear-gradient(135deg,#1a1040,#2a1a60)`,
                    boxShadow: isPaused ? `0 0 32px ${pal.c}55` : "none",
                    border: isPaused ? "none" : `1.5px solid ${pal.c}44`,
                    color: isPaused ? "#fff" : pal.cl,
                  }}
                  onClick={togglePause}
                >
                  {isPaused ? "▶\u2002Resume" : "⏸\u2002Pause"}
                </button>
                <button className="pomo-ctrl-rnd" onClick={skip} title="Skip">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <polygon points="5 4 15 12 5 20 5 4" />
                    <line x1="19" y1="5" x2="19" y2="19" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                className="pomo-ctrl-start"
                style={{
                  background: `linear-gradient(135deg,${pal.c},${pal.cl})`,
                  boxShadow: `0 0 40px ${pal.c}55`,
                }}
                onClick={startFocus}
              >
                ▶&ensp;Start {pal.label}
              </button>
            )}
          </div>

          {/* secondary */}
          {ps && (
            <div className="pomo-sec">
              <button className="pomo-sec-btn green" onClick={handleDone}>
                ✓ Save & finish session
              </button>
              <span className="pomo-sec-sep">·</span>
              <button
                className="pomo-sec-btn red"
                onClick={() => setShowDisc(true)}
              >
                Discard
              </button>
            </div>
          )}

          {/* stat bar */}
          <div className="pomo-statbar">
            <div
              className="pomo-stat-chip"
              style={{ borderColor: PAL.focus.c + "44" }}
            >
              <span>🎯</span>
              <span>
                Focus today&nbsp;
                <strong style={{ color: PAL.focus.cl }}>
                  {fmtH(todayFocus)}
                </strong>
              </span>
            </div>
            {ps && ps.mode !== "focus" && (
              <div
                className="pomo-stat-chip"
                style={{ borderColor: pal.c + "44" }}
              >
                <span>{pal.emoji}</span>
                <span>
                  Break&nbsp;
                  <strong style={{ color: pal.cl }}>{fmtH(live)}</strong>
                </span>
              </div>
            )}
            <div className="pomo-stat-chip" style={{ borderColor: "#2a2a5a" }}>
              <span>🔄</span>
              <span>
                Cycle&nbsp;
                <strong style={{ color: "#6a6aaa" }}>
                  {dots % cfg.longBreakAfter}/{cfg.longBreakAfter}
                </strong>
              </span>
            </div>
          </div>

          {/* ── SETTINGS MODAL ── */}
          {showCfg && (
            <div className="pomo-overlay" onClick={() => setShowCfg(false)}>
              <div className="pomo-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pomo-modal-hd">⚙&nbsp; Timer Settings</div>
                <div className="pomo-cfg-section-title">Durations</div>
                {(
                  [
                    {
                      lbl: "Focus",
                      key: "focusMins",
                      v: cfg.focusMins,
                      min: 5,
                      max: 120,
                      step: 5,
                    },
                    {
                      lbl: "Short break",
                      key: "shortBreakMins",
                      v: cfg.shortBreakMins,
                      min: 1,
                      max: 30,
                      step: 1,
                    },
                    {
                      lbl: "Long break",
                      key: "longBreakMins",
                      v: cfg.longBreakMins,
                      min: 5,
                      max: 60,
                      step: 5,
                    },
                    {
                      lbl: "Long break after",
                      key: "longBreakAfter",
                      v: cfg.longBreakAfter,
                      min: 2,
                      max: 8,
                      step: 1,
                    },
                  ] as const
                ).map(({ lbl, key, v, min, max, step }) => (
                  <div key={key} className="pomo-cfg-row">
                    <span className="pomo-cfg-lbl">{lbl}</span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <button
                        className="pomo-step"
                        onClick={() =>
                          patchCfg({
                            [key]: Math.max(
                              min as number,
                              (v as number) - step,
                            ),
                          })
                        }
                      >
                        −
                      </button>
                      <span className="pomo-cfg-val">
                        {v}
                        <span className="pomo-cfg-unit">
                          {key === "longBreakAfter" ? " sess" : " min"}
                        </span>
                      </span>
                      <button
                        className="pomo-step"
                        onClick={() =>
                          patchCfg({
                            [key]: Math.min(
                              max as number,
                              (v as number) + step,
                            ),
                          })
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pomo-div" />
                <div className="pomo-cfg-section-title">Behaviour</div>
                {(
                  [
                    {
                      lbl: "Auto-start breaks",
                      key: "autoStartBreak",
                      v: cfg.autoStartBreak,
                    },
                    {
                      lbl: "Auto-start focus",
                      key: "autoStartFocus",
                      v: cfg.autoStartFocus,
                    },
                    {
                      lbl: "Sound alerts",
                      key: "soundEnabled",
                      v: cfg.soundEnabled,
                    },
                  ] as const
                ).map(({ lbl, key, v }) => (
                  <div key={key} className="pomo-cfg-row">
                    <span className="pomo-cfg-lbl">{lbl}</span>
                    <button
                      className={"pomo-tog" + (v ? " on" : "")}
                      style={v ? { background: pal.c } : {}}
                      onClick={() => patchCfg({ [key]: !v })}
                    >
                      <div className="pomo-tog-thumb" />
                    </button>
                  </div>
                ))}
                <button
                  className="pomo-modal-done"
                  onClick={() => setShowCfg(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {showReset && (
            <Modal
              icon="↺"
              iconBg="linear-gradient(135deg,#1a0808,#2a1010)"
              title="Reset session?"
              subtitle={`Resets to ${fmt(tgtSecs)}. Current unsaved time will be lost.`}
              actions={[
                {
                  label: "Keep time",
                  variant: "ghost",
                  onClick: () => setShowReset(false),
                },
                { label: "Reset", variant: "danger", onClick: handleReset },
              ]}
              onClose={() => setShowReset(false)}
              dark
            />
          )}

          {showDisc && (
            <Modal
              icon="🗑"
              iconBg="linear-gradient(135deg,#1a0808,#2a1010)"
              title="Discard session?"
              subtitle="All unsaved focus time will be permanently lost."
              actions={[
                {
                  label: "Keep going",
                  variant: "ghost",
                  onClick: () => setShowDisc(false),
                },
                { label: "Discard", variant: "danger", onClick: handleDiscard },
              ]}
              onClose={() => setShowDisc(false)}
              dark
            />
          )}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════ CSS ══════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');

@keyframes pomoPop     { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
@keyframes pomoFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
@keyframes pomoPulse   { 0%{box-shadow:0 0 0 0 var(--pc,#7c3aed)66} 70%{box-shadow:0 0 0 14px transparent} 100%{box-shadow:0 0 0 0 transparent} }
@keyframes pomoIdlePop { from{opacity:0;transform:translateX(-50%) scale(0.8) translateY(20px)} to{opacity:1;transform:translateX(-50%) scale(1) translateY(0)} }

.pomo-fab-internal {
  position: fixed;
  bottom: ${FAB_BOTTOM}px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 250;
  width: ${FAB_D}px;
  height: ${FAB_D}px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(145deg, #100820, #06030f);
  box-shadow: 0 6px 28px rgba(0,0,0,0.6), 0 0 0 1.5px var(--fc, #8b5cf6)44, inset 0 1px 0 rgba(255,255,255,0.06);
  cursor: pointer;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  overflow: visible;
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
  -webkit-tap-highlight-color: transparent;
  animation: pomoIdlePop 0.3s cubic-bezier(.16,1,.3,1);
}
.pomo-fab-internal:hover { transform: translateX(-50%) scale(1.1); box-shadow: 0 10px 36px rgba(0,0,0,0.7), 0 0 0 2px var(--fc, #8b5cf6)88; }
.pomo-fab-internal:active { transform: translateX(-50%) scale(0.93); }
.pomo-fab-body { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; pointer-events: none; }
.pomo-fab-dot-live { width: 5px; height: 5px; border-radius: 50%; animation: fabDotPulse 1.8s ease infinite; margin-bottom: 2px; }
.pomo-fab-time { font-family: 'Space Grotesk', monospace; font-size: 13px; font-weight: 900; letter-spacing: -0.8px; line-height: 1; font-variant-numeric: tabular-nums; }
.pomo-fab-sub { font-size: 7px; font-weight: 800; letter-spacing: 0.07em; line-height: 1; }
.pomo-fab-dots-row { position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); display: flex; gap: 3px; }
.pomo-fab-dot-sm { width: 5px; height: 5px; border-radius: 50%; transition: background 0.35s; }

.pomo-fab-idle {
  position: fixed;
  bottom: ${FAB_BOTTOM}px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 250;
  width: 60px; height: 60px;
  border-radius: 50%;
  border: 1.5px solid rgba(139,92,246,0.3);
  background: rgba(10,5,22,0.85);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(139,92,246,0.15);
  cursor: pointer;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 2px;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  -webkit-tap-highlight-color: transparent;
  animation: pomoIdlePop 0.3s cubic-bezier(.16,1,.3,1);
}
.pomo-fab-idle:hover { transform: translateX(-50%) scale(1.12); border-color: rgba(139,92,246,0.6); box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.2); }
.pomo-fab-idle:active { transform: translateX(-50%) scale(0.93); }
.pomo-idle-lbl { font-size: 7px; font-weight: 800; letter-spacing: 0.1em; color: rgba(167,139,250,0.6); line-height: 1; }

@keyframes fabDotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.6)} }

.pomo-fs {
  position: fixed; inset: 0; z-index: 600;
  background: #03030c;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start;
  font-family: 'DM Sans', system-ui, sans-serif;
  overflow: hidden;
  will-change: clip-path;
  overscroll-behavior: none;
}
.pomo-ambient { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.pomo-bar {
  position: relative; z-index: 2;
  width: 100%; display: flex;
  align-items: center; justify-content: space-between;
  padding: 14px 18px 0; flex-shrink: 0;
}
.pomo-bar-title { font-size: 12px; font-weight: 800; color: #38386a; letter-spacing: 0.1em; }
.pomo-ibtn {
  width: 38px; height: 38px; border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  color: #383868; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s, background 0.15s; flex-shrink: 0;
}
.pomo-ibtn:hover { color: #a78bfa; background: rgba(139,92,246,0.12); }
.pomo-tabs { display: flex; gap: 6px; margin: 12px 0 6px; position: relative; z-index: 2; flex-shrink: 0; flex-wrap: nowrap; padding: 0 16px; }
.pomo-tab { padding: 5px 13px; border-radius: 99px; font-size: 11px; font-weight: 800; border: 1px solid rgba(255,255,255,0.07); background: transparent; color: #303060; cursor: pointer; transition: all 0.15s; white-space: nowrap; font-family: 'DM Sans', sans-serif; }
.pomo-tab:hover { color: #a78bfa; border-color: rgba(139,92,246,0.3); }
.pomo-tab.active { animation: pomoPop 0.2s ease; }
.pomo-sdots { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; position: relative; z-index: 2; flex-shrink: 0; }
.pomo-sdot { width: 9px; height: 9px; border-radius: 50%; transition: background 0.3s, transform 0.3s; }
.pomo-sdots-lbl { font-size: 10px; color: #20204a; font-weight: 700; margin-left: 4px; }
.pomo-ring { position: relative; width: 268px; height: 268px; flex-shrink: 0; z-index: 2; display: flex; align-items: center; justify-content: center; }
.pomo-ring-pulse { position: absolute; width: 200px; height: 200px; border-radius: 50%; animation: pomoPulse 2s ease infinite; pointer-events: none; }
.pomo-ring-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
.pomo-ring-chip { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; }
.pomo-ring-time { font-family: 'Space Grotesk', sans-serif; font-size: 58px; font-weight: 900; letter-spacing: -4px; line-height: 1; font-variant-numeric: tabular-nums; transition: color 0.4s; }
.pomo-ring-elapsed { font-size: 12px; color: #28285a; margin-top: 2px; }
.pomo-presets { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; margin-bottom: 12px; padding: 0 20px; position: relative; z-index: 2; flex-shrink: 0; }
.pomo-preset { padding: 5px 13px; border-radius: 99px; font-size: 12px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
.pomo-preset:hover { opacity: 0.8; }
.pomo-preset.sel { font-weight: 900; }
.pomo-ctrls { display: flex; gap: 14px; align-items: center; justify-content: center; position: relative; z-index: 2; flex-shrink: 0; }
.pomo-ctrl-main { padding: 0 36px; height: 54px; border-radius: 18px; font-weight: 800; font-size: 16px; cursor: pointer; transition: transform 0.15s, opacity 0.15s; font-family: 'DM Sans', sans-serif; letter-spacing: -0.2px; }
.pomo-ctrl-main:hover  { transform: scale(1.04); }
.pomo-ctrl-main:active { transform: scale(0.96); }
.pomo-ctrl-start { padding: 0 52px; height: 58px; border-radius: 20px; border: none; color: #fff; font-weight: 900; font-size: 18px; cursor: pointer; transition: transform 0.15s; font-family: 'DM Sans', sans-serif; letter-spacing: -0.3px; }
.pomo-ctrl-start:hover  { transform: scale(1.04); }
.pomo-ctrl-start:active { transform: scale(0.96); }
.pomo-ctrl-rnd { width: 50px; height: 50px; border-radius: 50%; background: #111128; border: 1.5px solid rgba(255,255,255,0.07); color: #40407a; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s, transform 0.1s; }
.pomo-ctrl-rnd:hover { background: rgba(139,92,246,0.16); color: #a78bfa; }
.pomo-ctrl-rnd:active { transform: scale(0.9); }
.pomo-sec { display: flex; gap: 10px; align-items: center; margin-top: 8px; position: relative; z-index: 2; flex-shrink: 0; }
.pomo-sec-btn { background: none; border: none; cursor: pointer; font-size: 12px; font-weight: 700; font-family: 'DM Sans', sans-serif; padding: 4px 8px; border-radius: 6px; transition: opacity 0.15s; }
.pomo-sec-btn:hover { opacity: 0.7; }
.pomo-sec-btn.green { color: #22c55e; }
.pomo-sec-btn.red   { color: #ef4444; }
.pomo-sec-sep { color: #1e1e40; font-size: 13px; }
.pomo-statbar { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; justify-content: center; padding: 0 16px; position: relative; z-index: 2; flex-shrink: 0; }
.pomo-stat-chip { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #28285a; font-weight: 600; padding: 4px 10px; border-radius: 99px; border: 1px solid transparent; background: rgba(255,255,255,0.03); }
.pomo-stat-chip strong { font-weight: 800; }
.pomo-overlay { position: absolute; inset: 0; z-index: 30; background: rgba(3,3,14,0.9); display: flex; align-items: center; justify-content: center; padding: 24px; }
.pomo-modal { background: #0b0b1e; border: 1.5px solid #1a1a36; border-radius: 24px; padding: 28px 24px 22px; width: 100%; max-width: 340px; box-shadow: 0 32px 80px rgba(0,0,0,0.85); text-align: center; animation: pomoPop 0.2s cubic-bezier(0.34,1.56,0.64,1); }
.pomo-modal-hd  { font-size: 18px; font-weight: 800; color: #e0deff; margin-bottom: 8px; }
.pomo-modal-done { width: 100%; padding: 12px; border-radius: 13px; margin-top: 18px; background: rgba(139,92,246,0.14); border: 1px solid rgba(139,92,246,0.3); color: #a78bfa; font-weight: 800; font-size: 14px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
.pomo-modal-done:hover { background: rgba(139,92,246,0.24); }
.pomo-cfg-section-title { font-size: 10px; font-weight: 800; color: #2a2a58; letter-spacing: 0.1em; text-align: left; margin: 10px 0 8px; }
.pomo-cfg-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.pomo-cfg-lbl  { font-size: 13px; color: #484878; font-weight: 600; text-align: left; }
.pomo-cfg-val  { font-size: 15px; font-weight: 900; color: #9898cc; min-width: 54px; text-align: center; }
.pomo-cfg-unit { font-size: 10px; color: #444468; font-weight: 600; margin-left: 1px; }
.pomo-step { width: 32px; height: 32px; border-radius: 9px; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.2); color: #a78bfa; font-size: 18px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s; line-height: 1; }
.pomo-step:hover { background: rgba(139,92,246,0.26); }
.pomo-div { height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0 10px; }
.pomo-tog { width: 44px; height: 25px; border-radius: 99px; background: rgba(255,255,255,0.1); border: none; cursor: pointer; position: relative; transition: background 0.22s; padding: 0; flex-shrink: 0; }
.pomo-tog-thumb { position: absolute; top: 3px; left: 3px; width: 19px; height: 19px; border-radius: 50%; background: white; transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1); box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
.pomo-tog.on .pomo-tog-thumb { transform: translateX(19px); }
`;
