"use client";
/**
 * FullscreenStopwatch
 *
 * Key fix: onDone(totalSecs) sends resumeSecs + thisSessionElapsed.
 * The parent must SET task.studiedSecs = totalSecs directly (not add a delta)
 * and compute the daily-total increment as:
 *   increment = totalSecs - previousStudiedSecs (read fresh from localStorage)
 * This avoids double-counting when localCheckpoint has already baked time in.
 *
 * Pause is persisted into TIMER_KEY so MiniTimerBadge respects it.
 * TIMER_KEY format (extended):
 *   { taskId, listIdx, savedSecs, sessionStart, pausedAt?: number, totalPausedMs: number }
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { fmtSecs } from "../lib/utils";

const TIMER_KEY = "sv_running_timer";

export interface FullscreenTimerState {
  taskId: string;
  listIdx: number;
  taskName: string;
  listColor: string;
  startTime: number;
  initialSecs: number;
  resumeSecs?: number;
  sessionStart?: number;
  pausedAt?: number | null;
  totalPausedMs?: number;
}

interface Props {
  state: FullscreenTimerState;
  onMinimise: () => void;
  onStop: () => void;
  /** Called with the FULL total studied seconds (resumeSecs + this session).
   *  Parent should SET studiedSecs to this value, not add it as a delta. */
  onDone: (totalSecs: number) => void;
  onReset: () => void;
}

/* helper: compute elapsed seconds from persisted state */
function computeElapsed(
  sessionStart: number,
  totalPausedMs: number,
  pausedAt: number | null | undefined,
): number {
  const pauseOffset = pausedAt ? Date.now() - pausedAt : 0;
  return Math.max(
    0,
    Math.floor(
      (Date.now() - sessionStart - totalPausedMs - pauseOffset) / 1000,
    ),
  );
}

/* persist pause state to localStorage */
function savePauseState(
  paused: boolean,
  pausedAt: number | null,
  totalPausedMs: number,
) {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return;
    const t = JSON.parse(raw);
    localStorage.setItem(
      TIMER_KEY,
      JSON.stringify({
        ...t,
        pausedAt: paused ? pausedAt : null,
        totalPausedMs,
      }),
    );
  } catch {}
}

/* ── Reset confirmation ────────────────────────────────────────────────── */
function ResetConfirm({
  taskName,
  studied,
  color,
  onConfirm,
  onCancel,
}: {
  taskName: string;
  studied: string;
  color: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 600,
        background: "rgba(4,4,14,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0d0d20",
          border: "1.5px solid #2a1a1a",
          borderRadius: 24,
          padding: "30px 28px 26px",
          maxWidth: 360,
          width: "100%",
          boxShadow: "0 32px 80px #000000cc",
          animation: "rcPop 0.18s cubic-bezier(.16,1,.3,1)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 18,
            background: "#1a0808",
            border: "1.5px solid #3a1a1a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            margin: "0 auto 18px",
          }}
        >
          ↺
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#e0e0f0",
            marginBottom: 10,
          }}
        >
          Reset timer?
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#5a5a7a",
            lineHeight: 1.7,
            marginBottom: 8,
          }}
        >
          <span style={{ color: "#a0a0c0", fontWeight: 600 }}>
            "{taskName}"
          </span>
        </div>
        <div
          style={{
            background: "#1a0a0a",
            border: "1px solid #3a1a1a",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#5a3a3a",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            THIS WILL PERMANENTLY DELETE
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>
            {studied}
          </div>
          <div style={{ fontSize: 12, color: "#5a3a3a", marginTop: 2 }}>
            of studied time for this task
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 13,
              background: "#1a1a38",
              border: "1px solid #2a2a48",
              color: "#6a6a9a",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Keep time
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 13,
              border: "none",
              background: "linear-gradient(135deg,#7f1d1d,#dc2626)",
              color: "white",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 20px #dc262644",
            }}
          >
            Reset & delete
          </button>
        </div>
      </div>
      <style>{`@keyframes rcPop { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

/* ── Mini badge (shown when minimised) ─────────────────────────────────── */
export function MiniTimerBadge({
  state,
  onExpand,
}: {
  state: FullscreenTimerState;
  onExpand: () => void;
}) {
  const sessionStart = state.sessionStart ?? Date.now();
  const resumeSecs = state.resumeSecs ?? 0;
  const totalPausedMs = state.totalPausedMs ?? 0;
  const pausedAt =
    state.pausedAt != null && state.pausedAt > 0 ? state.pausedAt : null;
  const isPaused = pausedAt !== null;

  const [elapsed, setElapsed] = useState(() =>
    computeElapsed(sessionStart, totalPausedMs, isPaused ? pausedAt : null),
  );

  useEffect(() => {
    if (isPaused) {
      setElapsed(computeElapsed(sessionStart, totalPausedMs, pausedAt));
      return;
    }
    const iv = setInterval(
      () => setElapsed(computeElapsed(sessionStart, totalPausedMs, null)),
      500,
    );
    return () => clearInterval(iv);
  }, [isPaused, pausedAt, sessionStart, totalPausedMs]); // eslint-disable-line

  const total = resumeSecs + elapsed;
  const c = state.listColor;

  return (
    <button
      onClick={onExpand}
      style={{
        position: "fixed",
        bottom: 80,
        right: 16,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#0d0d20",
        border: `1.5px solid ${isPaused ? "#f59e0b55" : c + "55"}`,
        borderRadius: 20,
        padding: "10px 16px 10px 12px",
        boxShadow: `0 8px 32px #000000cc, 0 0 0 1px ${c}22`,
        cursor: "pointer",
        animation: "mbSlideIn 0.3s cubic-bezier(.16,1,.3,1)",
      }}
    >
      <div
        style={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}
      >
        {!isPaused && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: c,
              animation: "mbPing 1.5s ease infinite",
              opacity: 0.5,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 2,
            borderRadius: "50%",
            background: isPaused ? "#f59e0b" : c,
          }}
        />
      </div>
      <div
        style={{
          maxWidth: 130,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: 12,
          fontWeight: 700,
          color: "#c0c0e0",
        }}
      >
        {state.taskName}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 15,
          fontWeight: 800,
          color: isPaused ? "#f59e0b" : c,
          letterSpacing: "-0.5px",
        }}
      >
        {fmtSecs(total)}
      </div>
      {isPaused && (
        <div style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800 }}>⏸</div>
      )}
      <div style={{ fontSize: 13, color: "#3a3a5a", marginLeft: 2 }}>⛶</div>
      <style>{`
        @keyframes mbPing    { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(1.8);opacity:0} }
        @keyframes mbSlideIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </button>
  );
}

/* ── Main fullscreen ───────────────────────────────────────────────────── */
export default function FullscreenStopwatch({
  state,
  onMinimise,
  onStop,
  onDone,
  onReset,
}: Props) {
  const sessionStart = state.sessionStart ?? Date.now();
  const resumeSecs = state.resumeSecs ?? 0;

  const initTotalPaused = state.totalPausedMs ?? 0;
  const initPausedAt = state.pausedAt ?? null;
  const initPaused = initPausedAt != null;

  const [elapsed, setElapsed] = useState(() =>
    computeElapsed(sessionStart, initTotalPaused, initPausedAt),
  );
  const [paused, setPaused] = useState(initPaused);
  const [showReset, setShowReset] = useState(false);

  const pausedAt = useRef<number | null>(initPausedAt);
  const totalPaused = useRef(initTotalPaused);

  /* ── Back button → minimise ── */
  useEffect(() => {
    window.history.pushState({ fsTimerOpen: true }, "");

    const onPop = () => {
      onMinimise();
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(
      () => setElapsed(computeElapsed(sessionStart, totalPaused.current, null)),
      500,
    );
    return () => clearInterval(iv);
  }, [paused, sessionStart]);

  const togglePause = useCallback(() => {
    if (!paused) {
      pausedAt.current = Date.now();
      setPaused(true);
      savePauseState(true, pausedAt.current, totalPaused.current);
      window.dispatchEvent(
        new CustomEvent("sv_timer_state_change", {
          detail: {
            pausedAt: pausedAt.current,
            totalPausedMs: totalPaused.current,
          },
        }),
      );
    } else {
      if (pausedAt.current)
        totalPaused.current += Date.now() - pausedAt.current;
      pausedAt.current = null;
      setPaused(false);
      savePauseState(false, null, totalPaused.current);
      window.dispatchEvent(
        new CustomEvent("sv_timer_state_change", {
          detail: { pausedAt: null, totalPausedMs: totalPaused.current },
        }),
      );
    }
  }, [paused]);

  const handleMinimise = useCallback(() => {
    savePauseState(paused, pausedAt.current, totalPaused.current);
    onMinimise();
  }, [paused, onMinimise]);

  const handleDone = useCallback(() => {
    // Freeze clock at this exact moment
    if (!paused && pausedAt.current == null) pausedAt.current = Date.now();
    if (pausedAt.current) totalPaused.current += Date.now() - pausedAt.current;

    const sessionElapsed = computeElapsed(
      sessionStart,
      totalPaused.current,
      null,
    );

    // ─── KEY FIX ───────────────────────────────────────────────────────────
    // Send the FULL total studied time (resumeSecs + this session).
    // The parent SETS task.studiedSecs to this value directly.
    // It must NOT add this as a delta — localCheckpoint may have already
    // baked intermediate time into studiedSecs and the daily total.
    // Instead the parent should compute:
    //   dailyIncrement = totalSecs - (fresh studiedSecs from localStorage)
    // to avoid double-counting.
    // ───────────────────────────────────────────────────────────────────────
    onDone(resumeSecs + sessionElapsed);
  }, [paused, sessionStart, resumeSecs, onDone]);

  const totalStudied = resumeSecs + elapsed;
  const assigned = state.initialSecs;
  const remaining = assigned > 0 ? Math.max(assigned - totalStudied, 0) : null;
  const pct =
    assigned > 0
      ? Math.min((totalStudied / assigned) * 100, 100)
      : Math.min((elapsed / 3600) * 100, 100);
  const circumference = 2 * Math.PI * 110;
  const c = state.listColor;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap');
        @keyframes fsPulse   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fsSlideIn { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 500,
          background: "#04040e",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 50% 38%, ${c}16, transparent 65%)`,
            pointerEvents: "none",
          }}
        />

        {/* Top-right controls */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            display: "flex",
            gap: 8,
          }}
        >
          <button
            onClick={handleMinimise}
            title="Minimise"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#1a1a38",
              border: "1px solid #2a2a48",
              color: "#6a6a9a",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = c + "22";
              (e.currentTarget as HTMLElement).style.borderColor = c + "66";
              (e.currentTarget as HTMLElement).style.color = c;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#1a1a38";
              (e.currentTarget as HTMLElement).style.borderColor = "#2a2a48";
              (e.currentTarget as HTMLElement).style.color = "#6a6a9a";
            }}
          >
            ⊟
          </button>
          <button
            onClick={() => setShowReset(true)}
            title="Reset timer"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#1a0808",
              border: "1px solid #3a1a1a",
              color: "#7a3a3a",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#2a0a0a";
              (e.currentTarget as HTMLElement).style.borderColor = "#ef444444";
              (e.currentTarget as HTMLElement).style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#1a0808";
              (e.currentTarget as HTMLElement).style.borderColor = "#3a1a1a";
              (e.currentTarget as HTMLElement).style.color = "#7a3a3a";
            }}
          >
            ↺
          </button>
        </div>

        <div
          style={{
            position: "relative",
            textAlign: "center",
            animation: "fsSlideIn 0.3s ease",
            padding: "0 20px",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#4a4a6a",
              letterSpacing: "0.18em",
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            IN PROGRESS
          </div>
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "#e0e0f0",
              marginBottom: 36,
              maxWidth: 380,
              lineHeight: 1.35,
            }}
          >
            {state.taskName}
          </div>

          <div
            style={{
              position: "relative",
              width: 260,
              height: 260,
              margin: "0 auto 36px",
            }}
          >
            <svg
              width="260"
              height="260"
              style={{
                transform: "rotate(-90deg)",
                position: "absolute",
                inset: 0,
              }}
            >
              <circle
                cx="130"
                cy="130"
                r="110"
                fill="none"
                stroke="#1a1a38"
                strokeWidth="8"
              />
              <circle
                cx="130"
                cy="130"
                r="110"
                fill="none"
                stroke={c}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s ease",
                  filter: `drop-shadow(0 0 10px ${c}88)`,
                }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              {remaining !== null ? (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#3a3a5e",
                      letterSpacing: "0.12em",
                    }}
                  >
                    REMAINING
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 52,
                      fontWeight: 800,
                      color: remaining === 0 ? "#22c55e" : c,
                      letterSpacing: "-3px",
                      lineHeight: 1,
                      textShadow: `0 0 36px ${c}55`,
                    }}
                  >
                    {fmtSecs(remaining)}
                  </div>
                  <div style={{ fontSize: 12, color: "#dcdce4", marginTop: 5 }}>
                    Studied: {fmtSecs(totalStudied)}
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#3a3a5e",
                      letterSpacing: "0.12em",
                    }}
                  >
                    STUDIED
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 52,
                      fontWeight: 800,
                      color: c,
                      letterSpacing: "-3px",
                      lineHeight: 1,
                      textShadow: `0 0 36px ${c}55`,
                    }}
                  >
                    {fmtSecs(totalStudied)}
                  </div>
                </>
              )}
              {paused && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#f59e0b",
                    fontWeight: 800,
                    marginTop: 6,
                    animation: "fsPulse 1.4s ease infinite",
                  }}
                >
                  ⏸ PAUSED
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <button
              onClick={togglePause}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#1a1a38",
                border: `1.5px solid ${c}44`,
                color: c,
                fontSize: 20,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = c + "22";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#1a1a38";
              }}
            >
              {paused ? "▶" : "⏸"}
            </button>
            <button
              onClick={handleDone}
              style={{
                padding: "0 28px",
                height: 52,
                borderRadius: 16,
                background: `linear-gradient(135deg,${c},${c}cc)`,
                border: "none",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                boxShadow: `0 0 28px ${c}44`,
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  "scale(1.04)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
            >
              ✓ Done — Save Time
            </button>
            <button
              onClick={handleMinimise}
              title="Minimise"
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "#1a1a38",
                border: "1.5px solid #2a2a4e",
                color: "#4a4a6a",
                fontSize: 18,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = c + "22";
                (e.currentTarget as HTMLElement).style.color = c;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#1a1a38";
                (e.currentTarget as HTMLElement).style.color = "#4a4a6a";
              }}
            >
              ⊟
            </button>
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "#3a3a5e" }}>
            {paused
              ? "Paused · ▶ resume  or  ✓ save"
              : "⊟ minimise keeps timer running · ✓ saves"}
          </div>
        </div>
      </div>

      {showReset && (
        <ResetConfirm
          taskName={state.taskName}
          studied={fmtSecs(totalStudied)}
          color={c}
          onConfirm={() => {
            setShowReset(false);
            onReset();
          }}
          onCancel={() => setShowReset(false)}
        />
      )}
    </>
  );
}
