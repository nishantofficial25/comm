"use client";
/**
 * Leaderboard — Global + Community tabs, date filters: Today / Yesterday / This Week / Calendar picker
 * Props:
 *   onClose        — close the modal
 *   communitySlug  — if provided, shows community tab by default and fetches community rankings
 *   communityName  — display name for the community tab
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { API, authFetch, fmtHrs, dateKey } from "../lib/utils";
import { LeaderboardEntry } from "../lib/utils";

interface Props {
  onClose: () => void;
  communitySlug?: string;
  communityName?: string;
}

type DateMode = "today" | "yesterday" | "week" | "custom";
type BoardTab = "global" | "community";

// Week range helper: returns YYYY-MM-DD for start/end of current week (Mon–Sun)
function weekRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return {
    start: fmt(monday),
    end: fmt(sunday),
    label: `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${sunday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
  };
}

function fmtDateLabel(date: string, mode: DateMode): string {
  if (mode === "today") return "Today";
  if (mode === "yesterday") return "Yesterday";
  if (mode === "week") return weekRange().label;
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Leaderboard({
  onClose,
  communitySlug,
  communityName,
}: Props) {
  const today = dateKey(0);
  const yesterday = dateKey(-1);

  const [boardTab, setBoardTab] = useState<BoardTab>(
    communitySlug ? "community" : "global",
  );
  const [dateMode, setDateMode] = useState<DateMode>("yesterday");
  const [customDate, setCustomDate] = useState(yesterday);
  const [showCalendar, setShowCalendar] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const calRef = useRef<HTMLDivElement>(null);

  // Derived: which date(s) to query
  const queryDate =
    dateMode === "today"
      ? today
      : dateMode === "yesterday"
        ? yesterday
        : dateMode === "custom"
          ? customDate
          : null; // week mode: handled separately

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url: string;
      const isWeek = dateMode === "week";
      const week = weekRange();

      if (boardTab === "community" && communitySlug) {
        url = isWeek
          ? `${API}/api/void/leaderboard/community/${communitySlug}?start=${week.start}&end=${week.end}`
          : `${API}/api/void/leaderboard/community/${communitySlug}?date=${queryDate}`;
      } else {
        url = isWeek
          ? `${API}/api/void/leaderboard/v2?start=${week.start}&end=${week.end}`
          : `${API}/api/void/leaderboard/v2?date=${queryDate}`;
      }

      const r = await authFetch(url);
      const d = await r.json();
      setEntries(d.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [boardTab, dateMode, queryDate, communitySlug]);

  useEffect(() => {
    load();
  }, [load]);

  // Close calendar on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node))
        setShowCalendar(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const medals = ["🥇", "🥈", "🥉"];
  const dateLabel = fmtDateLabel(queryDate || today, dateMode);
  const hasCommunity = !!communitySlug;

  // Pills
  const datePills: { key: DateMode; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "week", label: "This Week" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(4,4,14,0.88)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 500,
          background: "#0d0d1f",
          border: "1px solid #2a2a4e",
          borderRadius: 24,
          overflow: "hidden",
          animation: "svSlideIn 0.25s ease",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          style={{
            padding: "20px 20px 0",
            borderBottom: "1px solid #1e1e38",
            background: "linear-gradient(135deg,#12122a,#0d0d1f)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#f0f0ff",
                  letterSpacing: "-0.5px",
                }}
              >
                🏆 Leaderboard
              </div>
              <div style={{ fontSize: 11, color: "#3a3a5e", marginTop: 2 }}>
                {dateMode === "week" ? weekRange().label : dateLabel} · Study
                rankings
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#1a1a38",
                border: "1px solid #2a2a4e",
                color: "#5050a0",
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Board tabs — only when community is provided */}
          {hasCommunity && (
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {(["global", "community"] as BoardTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setBoardTab(t)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    border: "none",
                    background:
                      boardTab === t
                        ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                        : "#1a1a38",
                    color: boardTab === t ? "white" : "#3a3a5e",
                    boxShadow: boardTab === t ? "0 4px 14px #a855f733" : "none",
                  }}
                >
                  {t === "global"
                    ? "🌍 Global"
                    : `🌐 ${communityName || "Community"}`}
                </button>
              ))}
            </div>
          )}

          {/* Date filter row */}
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              paddingBottom: 14,
              flexWrap: "wrap",
            }}
          >
            {datePills.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateMode(key)}
                style={{
                  padding: "5px 13px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: dateMode === key ? "#a855f722" : "#12122a",
                  border:
                    dateMode === key
                      ? "1px solid #a855f766"
                      : "1px solid #2a2a4e",
                  color: dateMode === key ? "#a855f7" : "#3a3a5e",
                }}
              >
                {label}
              </button>
            ))}

            {/* Calendar picker pill */}
            <div
              ref={calRef}
              style={{ position: "relative", marginLeft: "auto" }}
            >
              <button
                onClick={() => setShowCalendar((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: dateMode === "custom" ? "#a855f722" : "#12122a",
                  border:
                    dateMode === "custom"
                      ? "1px solid #a855f766"
                      : "1px solid #2a2a4e",
                  color: dateMode === "custom" ? "#a855f7" : "#3a3a5e",
                }}
              >
                <CalIco />{" "}
                {dateMode === "custom"
                  ? new Date(customDate + "T00:00:00").toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short" },
                    )
                  : "Pick date"}
              </button>

              {showCalendar && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    zIndex: 20,
                    background: "#12122a",
                    border: "1px solid #2a2a4e",
                    borderRadius: 14,
                    padding: 12,
                    boxShadow: "0 12px 40px #00000066",
                    minWidth: 200,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: "#3a3a5e",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    PICK A DATE
                  </div>
                  <input
                    type="date"
                    value={customDate}
                    max={today}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateMode("custom");
                      setShowCalendar(false);
                    }}
                    style={{
                      width: "100%",
                      background: "#0e0e20",
                      border: "1px solid #2a2a4e",
                      borderRadius: 10,
                      padding: "8px 12px",
                      color: "#e0e0f0",
                      fontSize: 13,
                      outline: "none",
                      cursor: "pointer",
                      colorScheme: "dark",
                    }}
                  />
                  <div style={{ fontSize: 10, color: "#2a2a4e", marginTop: 8 }}>
                    Select any past or current date
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats bar (week mode) ───────────────────────────────── */}
        {dateMode === "week" && !loading && entries.length > 0 && (
          <WeekStatsBar entries={entries} />
        )}

        {/* ── Body ───────────────────────────────────────────────── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 60,
                    borderRadius: 14,
                    background: "#12122a",
                    animation: "svSkel 1.4s ease infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <div style={{ color: "#3a3a5e", fontSize: 14, fontWeight: 700 }}>
                No data for {dateMode === "week" ? "this week" : dateLabel}
              </div>
              <div style={{ color: "#2a2a4e", fontSize: 12, marginTop: 6 }}>
                {boardTab === "community"
                  ? "Members haven't studied yet"
                  : "No users have studied yet"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {entries.map((e, i) => (
                <EntryRow
                  key={e.uid}
                  entry={e}
                  rank={i}
                  medals={medals}
                  isWeek={dateMode === "week"}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        {!loading && entries.length > 0 && (
          <div
            style={{
              padding: "10px 16px 16px",
              borderTop: "1px solid #1e1e38",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#2a2a4e" }}>
              {entries.length} users ranked
            </span>
            <button
              onClick={load}
              style={{
                fontSize: 11,
                color: "#3a3a5e",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <RefreshIco /> Refresh
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes svSlideIn { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes svFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes svSkel { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.4); cursor:pointer; }
      `}</style>
    </div>
  );
}

// ── Entry row ──────────────────────────────────────────────────────────────────
function EntryRow({
  entry: e,
  rank: i,
  medals,
  isWeek,
}: {
  entry: LeaderboardEntry & { weekSecs?: number };
  rank: number;
  medals: string[];
  isWeek: boolean;
}) {
  const secs = isWeek ? (e.weekSecs ?? e.secs) : e.secs;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 14,
        background: e.isMe ? "#a855f712" : i === 0 ? "#f59e0b08" : "#0e0e1e",
        border: e.isMe
          ? "1px solid #a855f744"
          : i === 0
            ? "1px solid #f59e0b22"
            : "1px solid #1e1e38",
        animation: `svFadeUp 0.3s ease ${i * 0.04}s both`,
        transition: "all 0.15s",
      }}
    >
      {/* Rank */}
      <div style={{ width: 28, flexShrink: 0, textAlign: "center" }}>
        {i < 3 ? (
          <span style={{ fontSize: 20 }}>{medals[i]}</span>
        ) : (
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#3a3a5e",
              fontFamily: "'Space Grotesk',sans-serif",
            }}
          >
            #{e.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      {e.picture ? (
        <img
          src={e.picture}
          alt=""
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            objectFit: "cover",
            border: `1.5px solid ${e.isMe ? "#a855f766" : "#2a2a4e"}`,
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "#a855f722",
            border: "1.5px solid #a855f744",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
            color: "#a855f7",
          }}
        >
          {e.displayName[0]?.toUpperCase()}
        </div>
      )}

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: e.isMe ? "#c084fc" : "#d0d0f0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {e.displayName}
          </span>
          {e.isMe && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: "#a855f7",
                background: "#a855f720",
                border: "1px solid #a855f740",
                padding: "1px 6px",
                borderRadius: 99,
                letterSpacing: "0.08em",
                flexShrink: 0,
              }}
            >
              YOU
            </span>
          )}
        </div>
        {isWeek && (
          <div style={{ fontSize: 10, color: "#2a2a4e", marginTop: 2 }}>
            {e.secs > 0 ? `Today: ${fmtHrs(e.secs)}` : ""}
          </div>
        )}
      </div>

      {/* Hours + bar */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: 16,
            fontWeight: 800,
            color: i === 0 ? "#f59e0b" : e.isMe ? "#a855f7" : "#5050a0",
          }}
        >
          {fmtHrs(secs)}
        </div>
        <div style={{ fontSize: 9, color: "#2a2a4e" }}>
          {isWeek ? "THIS WEEK" : "STUDIED"}
        </div>
      </div>
    </div>
  );
}

// ── Week stats bar ──────────────────────────────────────────────────────────────
function WeekStatsBar({ entries }: { entries: LeaderboardEntry[] }) {
  const totalSecs = entries.reduce(
    (a, e) => a + ((e as any).weekSecs ?? e.secs),
    0,
  );
  const avgSecs = entries.length ? Math.floor(totalSecs / entries.length) : 0;
  const topEntry = entries[0];
  return (
    <div style={{ display: "flex", gap: 1, borderBottom: "1px solid #1e1e38" }}>
      {[
        { label: "Users", value: entries.length + "" },
        { label: "Avg", value: fmtHrs(avgSecs) },
        {
          label: "Top",
          value: topEntry
            ? fmtHrs((topEntry as any).weekSecs ?? topEntry.secs)
            : "—",
        },
      ].map((s) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            padding: "10px 0",
            textAlign: "center",
            background: "#0a0a18",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk',sans-serif",
              fontSize: 15,
              fontWeight: 800,
              color: "#a855f7",
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 10, color: "#2a2a4e", marginTop: 2 }}>
            {s.label.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────────
function CalIco() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect
        x="1"
        y="2"
        width="10"
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M1 5h10" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M4 1v2M8 1v2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function RefreshIco() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path
        d="M10.5 6A4.5 4.5 0 1 1 6 1.5c1.2 0 2.3.47 3.1 1.24L10.5 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M10.5 1.5V4H8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
