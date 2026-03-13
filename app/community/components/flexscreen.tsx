"use client";
import { useState, useEffect, useRef } from "react";
import { fmtHrs, lsGet, dateKey } from "../lib/utils";

interface Props {
  todaySecs: number;
  totalSecs: number;
  dailyGoalHrs: number;
  user: { displayName: string; picture?: string };
  onClose: () => void;
}

function pad(n: number) {
  return String(Math.floor(n)).padStart(2, "0");
}

function fmtDetailed(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

function getMotivation(pct: number) {
  if (pct >= 100) return { emoji: "🏆", line: "Goal crushed. Legendary." };
  if (pct >= 75) return { emoji: "🔥", line: "Almost there. Don't stop." };
  if (pct >= 50) return { emoji: "⚡", line: "Halfway through. Keep going." };
  if (pct >= 25) return { emoji: "💪", line: "Locked in. Stay consistent." };
  return { emoji: "🌱", line: "Every minute counts." };
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function FlexScreen({
  todaySecs,
  totalSecs,
  dailyGoalHrs,
  user,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const goalSecs = dailyGoalHrs * 3600;
  const pct = Math.min((todaySecs / goalSecs) * 100, 100);
  const { emoji, line } = getMotivation(pct);
  const timeOfDay = getTimeOfDay();
  const cardRef = useRef<HTMLDivElement>(null);

  // Pull per-task breakdown from localStorage
  const [tasks, setTasks] = useState<
    { name: string; secs: number; color: string }[]
  >([]);
  useEffect(() => {
    const lists = lsGet<any[]>("sv_todo_lists", []);
    const all: { name: string; secs: number; color: string }[] = [];
    lists.forEach((l: any) => {
      l.items?.forEach((t: any) => {
        if ((t.studiedSecs || 0) > 0) {
          all.push({
            name: t.text,
            secs: t.studiedSecs,
            color: l.color || "#8b5cf6",
          });
        }
      });
    });
    all.sort((a, b) => b.secs - a.secs);
    setTasks(all.slice(0, 4));
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 320);
  };

  const handleCopy = () => {
    const text = `📚 ${user.displayName} studied ${fmtDetailed(todaySecs)} today on StudyVoid\n${pct >= 100 ? "🏆 Daily goal crushed!" : `${Math.round(pct)}% of ${dailyGoalHrs}h goal`}\nstudyvoid.com`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const arcR = 54;
  const arcC = 2 * Math.PI * arcR;
  const arcOffset = arcC * (1 - pct / 100);

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        background: "rgba(4,4,20,0.85)",
        backdropFilter: "blur(18px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.32s ease",
      }}
    >
      {/* Card */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(40px) scale(0.95)",
          transition: "transform 0.38s cubic-bezier(.16,1,.3,1)",
          position: "relative",
        }}
      >
        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            top: -60,
            left: "50%",
            transform: "translateX(-50%)",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(circle, #7c3aed55, transparent 70%)",
            pointerEvents: "none",
            filter: "blur(30px)",
          }}
        />

        {/* Main card */}
        <div
          style={{
            background:
              "linear-gradient(160deg, #0d0d22 0%, #12103a 60%, #0a0a1e 100%)",
            borderRadius: 28,
            border: "1px solid rgba(139,92,246,0.25)",
            overflow: "hidden",
            boxShadow:
              "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)",
            position: "relative",
          }}
        >
          {/* Top grain texture */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
              opacity: 0.4,
            }}
          />

          {/* Diagonal accent line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 200,
              height: 200,
              background:
                "linear-gradient(135deg, transparent 50%, rgba(139,92,246,0.06) 50%)",
              pointerEvents: "none",
            }}
          />

          {/* Header strip */}
          <div
            style={{
              padding: "20px 24px 0",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      border: "2px solid rgba(139,92,246,0.5)",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      color: "white",
                      fontWeight: 800,
                      border: "2px solid rgba(139,92,246,0.5)",
                    }}
                  >
                    {user.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#e0deff",
                      letterSpacing: "-0.2px",
                    }}
                  >
                    {user.displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#5a5a8a",
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                    }}
                  >
                    GOOD {timeOfDay.toUpperCase()}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  borderRadius: 99,
                  padding: "4px 10px",
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#a78bfa",
                    boxShadow: "0 0 6px #a78bfa",
                    animation: "fxPulse 2s ease infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#a78bfa",
                    letterSpacing: "0.08em",
                  }}
                >
                  STUDYVOID
                </span>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)",
                marginBottom: 24,
              }}
            />
          </div>

          {/* Hero section */}
          <div
            style={{ padding: "0 24px 20px", position: "relative", zIndex: 1 }}
          >
            {/* Big time + ring */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                marginBottom: 20,
              }}
            >
              {/* SVG ring */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg
                  width="130"
                  height="130"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  {/* Track */}
                  <circle
                    cx="65"
                    cy="65"
                    r={arcR}
                    fill="none"
                    stroke="rgba(139,92,246,0.1)"
                    strokeWidth="7"
                  />
                  {/* Secondary glow ring */}
                  <circle
                    cx="65"
                    cy="65"
                    r={arcR}
                    fill="none"
                    stroke="rgba(139,92,246,0.08)"
                    strokeWidth="14"
                    strokeDasharray={arcC}
                    strokeDashoffset={arcOffset}
                    strokeLinecap="round"
                  />
                  {/* Main progress */}
                  <circle
                    cx="65"
                    cy="65"
                    r={arcR}
                    fill="none"
                    stroke="url(#ringGrad)"
                    strokeWidth="7"
                    strokeDasharray={arcC}
                    strokeDashoffset={arcOffset}
                    strokeLinecap="round"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(167,139,250,0.8))",
                      transition:
                        "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
                    }}
                  />
                  <defs>
                    <linearGradient
                      id="ringGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center text */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: "#5a5a8a",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
                    TODAY
                  </span>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      color: "#e0deff",
                      letterSpacing: "-1.5px",
                      lineHeight: 1.1,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtHrs(todaySecs)}
                  </span>
                  <span
                    style={{ fontSize: 10, color: "#7c6aaa", fontWeight: 700 }}
                  >
                    of {dailyGoalHrs}h
                  </span>
                </div>
              </div>

              {/* Right stats */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#4a4a7a",
                    letterSpacing: "0.1em",
                    marginBottom: 10,
                  }}
                >
                  TODAY'S SESSION
                </div>

                {/* Detailed time */}
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: "#e0deff",
                    letterSpacing: "-1.5px",
                    lineHeight: 1,
                    marginBottom: 6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtDetailed(todaySecs)}
                </div>

                {/* Pct bar */}
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        color: "#5a5a8a",
                        fontWeight: 700,
                      }}
                    >
                      GOAL PROGRESS
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: pct >= 100 ? "#22c55e" : "#a78bfa",
                      }}
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "rgba(139,92,246,0.12)",
                      borderRadius: 99,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background:
                          pct >= 100
                            ? "linear-gradient(90deg,#16a34a,#22c55e)"
                            : "linear-gradient(90deg,#7c3aed,#a78bfa)",
                        borderRadius: 99,
                        boxShadow:
                          pct >= 100
                            ? "0 0 8px #22c55e88"
                            : "0 0 8px #a78bfa88",
                        transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
                      }}
                    />
                  </div>
                </div>

                {/* Motivation */}
                <div
                  style={{
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.15)",
                    borderRadius: 10,
                    padding: "7px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{emoji}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#8b7ab8",
                      lineHeight: 1.3,
                    }}
                  >
                    {line}
                  </span>
                </div>
              </div>
            </div>

            {/* Tasks breakdown */}
            {tasks.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#3a3a6a",
                    letterSpacing: "0.1em",
                    marginBottom: 10,
                  }}
                >
                  FOCUSED ON
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {tasks.map((t, i) => {
                    const taskPct = Math.min(
                      (t.secs / Math.max(todaySecs, 1)) * 100,
                      100,
                    );
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: t.color,
                            boxShadow: `0 0 6px ${t.color}88`,
                          }}
                        />
                        <div
                          style={{
                            flex: 1,
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#7070a0",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.name}
                        </div>
                        <div
                          style={{
                            width: 60,
                            height: 3,
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: 99,
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${taskPct}%`,
                              background: t.color,
                              borderRadius: 99,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#4a4a7a",
                            flexShrink: 0,
                            width: 36,
                            textAlign: "right",
                          }}
                        >
                          {fmtHrs(t.secs)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                height: 1,
                background: "rgba(139,92,246,0.1)",
                marginBottom: 16,
              }}
            />

            {/* Footer date + studyvoid */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#2e2e5a",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                {new Date()
                  .toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                  .toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#2e2e5a",
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                }}
              >
                STUDYVOID.COM
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons below card */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.4s ease 0.2s",
          }}
        >
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 14,
              background: copied
                ? "rgba(34,197,94,0.15)"
                : "rgba(139,92,246,0.12)",
              border: `1.5px solid ${copied ? "rgba(34,197,94,0.4)" : "rgba(139,92,246,0.25)"}`,
              color: copied ? "#22c55e" : "#a78bfa",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            {copied ? "✓ Copied!" : "⎘  Copy to share"}
          </button>
          <button
            onClick={handleClose}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1.5px solid rgba(255,255,255,0.08)",
              color: "#3a3a6a",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "#3a3a6a";
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fxPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(0.7); }
        }
      `}</style>
    </div>
  );
}
