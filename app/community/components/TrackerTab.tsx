"use client";
/**
 * TrackerTab — Professional Study Analysis Dashboard
 *
 * KEY RULES:
 *  - NO manual topic/subject add. All subjects come from TodoLists (sv_todo_lists).
 *  - Every time figure shown is derived from task.studiedSecs (the server-confirmed
 *    source of truth). No re-computation from timer state here.
 *  - Pomodoro focus time (sv_pomo_today_*) shown as "🍅 Pomodoro / Misc" in Subjects.
 *  - Sections: Overview · Analysis · Subjects (pie charts) · Tasks
 */
import { useState, useMemo } from "react";
import { fmtSecs, fmtHrs, lsGet, dateKey, COLORS } from "../lib/utils";
import { TodoList, TodoItem } from "../lib/utils";

/* ══════════════════════ TYPES ══════════════════════ */
interface DayData {
  key: string;
  label: string;
  shortLabel: string;
  secs: number;
  isToday: boolean;
  weekday: number;
}

/* ══════════════════════ ANALYTICS HELPERS ══════════════════════ */
function getDailyData(days = 90): DayData[] {
  return Array.from({ length: days }).map((_, i) => {
    const offset = -(days - 1 - i);
    const k = dateKey(offset);
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      key: k,
      label: d.toLocaleDateString("en", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortLabel: d.toLocaleDateString("en", { weekday: "short" }),
      secs: lsGet<number>("sv_daily_" + k, 0),
      isToday: k === dateKey(0),
      weekday: d.getDay(),
    };
  });
}

function getStreak(daily: DayData[]): number {
  let streak = 0;
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].isToday && daily[i].secs === 0) continue;
    if (daily[i].secs > 0) streak++;
    else break;
  }
  return streak;
}

function getLongestStreak(daily: DayData[]): number {
  let max = 0,
    cur = 0;
  for (const d of daily) {
    if (d.secs > 0) {
      cur++;
      max = Math.max(max, cur);
    } else cur = 0;
  }
  return max;
}

function getWeekdayAvgs(
  daily: DayData[],
): { label: string; avg: number; count: number }[] {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sums = Array(7).fill(0),
    counts = Array(7).fill(0);
  for (const d of daily) {
    if (!d.isToday) {
      sums[d.weekday] += d.secs;
      counts[d.weekday]++;
    }
  }
  return DAYS.map((label, i) => ({
    label,
    avg: counts[i] > 0 ? Math.round(sums[i] / counts[i]) : 0,
    count: counts[i],
  }));
}

function getStudyVelocity(daily: DayData[], windowDays = 7) {
  const points: { label: string; avg: number }[] = [];
  for (let i = windowDays; i <= 30; i++) {
    const slice = daily.slice(
      daily.length - 30 + i - windowDays,
      daily.length - 30 + i,
    );
    const avg = slice.reduce((a, d) => a + d.secs, 0) / windowDays;
    const d = daily[daily.length - 30 + i - 1];
    if (d) points.push({ label: d.shortLabel, avg });
  }
  return points;
}

/* ══════════════════════ UI PRIMITIVES ══════════════════════ */
const AC = "#8b5cf6";

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: string;
  trend?: { val: string; up: boolean } | null;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1.5px solid #f3f4f6",
        borderRadius: 18,
        padding: "16px 18px",
        boxShadow: "0 2px 10px #00000008",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -14,
          right: -14,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: color + "0d",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: color + "18",
            border: `1.5px solid ${color}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
          }}
        >
          {icon}
        </div>
        {trend && (
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: trend.up ? "#22c55e" : "#ef4444",
              background: (trend.up ? "#22c55e" : "#ef4444") + "14",
              padding: "3px 7px",
              borderRadius: 99,
            }}
          >
            {trend.up ? "↑" : "↓"} {trend.val}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 26,
          fontWeight: 800,
          color: "#111827",
          letterSpacing: "-1px",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 5 }}>
          {sub}
        </div>
      )}
      <div
        style={{
          fontSize: 9,
          fontWeight: 800,
          color,
          letterSpacing: "0.1em",
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>
        {title}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "white",
        border: "1.5px solid #f3f4f6",
        borderRadius: 18,
        padding: "18px 20px",
        boxShadow: "0 2px 10px #00000008",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function BarChart({
  data,
  height = 96,
  accentColor,
  showLabels = true,
}: {
  data: { key: string; shortLabel: string; secs: number; isToday: boolean }[];
  height?: number;
  accentColor: string;
  showLabels?: boolean;
}) {
  const [hov, setHov] = useState<string | null>(null);
  const max = Math.max(...data.map((d) => d.secs), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 3,
        height: height + (showLabels ? 28 : 4),
      }}
    >
      {data.map((d) => {
        const barH = d.secs > 0 ? Math.max((d.secs / max) * height, 3) : 2;
        const isH = hov === d.key;
        return (
          <div
            key={d.key}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              position: "relative",
            }}
            onMouseEnter={() => setHov(d.key)}
            onMouseLeave={() => setHov(null)}
          >
            {isH && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#111827",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 7,
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                  marginBottom: 4,
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                {d.secs > 0 ? fmtHrs(d.secs) : "—"} · {d.shortLabel}
              </div>
            )}
            <div
              style={{
                width: "100%",
                height,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  borderRadius: "4px 4px 2px 2px",
                  height: barH,
                  background: d.isToday
                    ? `linear-gradient(180deg,${accentColor},${accentColor}cc)`
                    : isH
                      ? accentColor + "88"
                      : accentColor + "2e",
                  boxShadow: d.isToday ? `0 0 10px ${accentColor}55` : "none",
                  transition: "all 0.15s",
                }}
              />
            </div>
            {showLabels && (
              <div
                style={{
                  fontSize: 8,
                  color: d.isToday ? accentColor : "#c4c4d4",
                  fontWeight: d.isToday ? 800 : 400,
                }}
              >
                {d.shortLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeatMap({ accentColor }: { accentColor: string }) {
  const WEEKS = 15;
  const TODAY = dateKey(0);
  const cells: { key: string; secs: number; label: string }[] = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const k = dateKey(-i);
    const d = new Date();
    d.setDate(d.getDate() - i);
    cells.push({
      key: k,
      secs: lsGet<number>("sv_daily_" + k, 0),
      label: d.toLocaleDateString("en", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }
  const max = Math.max(...cells.map((c) => c.secs), 1);
  const weeks: (typeof cells)[] = [];
  for (let w = 0; w < WEEKS; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));
  const [hov, setHov] = useState<string | null>(null);
  const hovCell = cells.find((c) => c.key === hov);
  return (
    <div>
      <div
        style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, height: 18 }}
      >
        {hovCell ? (
          <>
            {hovCell.label} —{" "}
            <span
              style={{
                fontWeight: 700,
                color: hovCell.secs > 0 ? accentColor : "#9ca3af",
              }}
            >
              {hovCell.secs > 0 ? fmtHrs(hovCell.secs) : "no study"}
            </span>
          </>
        ) : (
          <span style={{ color: "#d1d5db" }}>hover a cell</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        {weeks.map((week, wi) => (
          <div
            key={wi}
            style={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            {week.map((cell) => {
              const intensity =
                cell.secs > 0 ? 0.15 + (cell.secs / max) * 0.85 : 0;
              return (
                <div
                  key={cell.key}
                  onMouseEnter={() => setHov(cell.key)}
                  onMouseLeave={() => setHov(null)}
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: 3,
                    cursor: "default",
                    background: cell.secs > 0 ? accentColor : "#f3f4f6",
                    opacity: cell.secs > 0 ? intensity : 1,
                    outline:
                      cell.key === TODAY
                        ? `2px solid ${accentColor}`
                        : hov === cell.key
                          ? `1.5px solid ${accentColor}88`
                          : "none",
                    outlineOffset: 1,
                    transition: "all 0.1s",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div
        style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 10 }}
      >
        <span style={{ fontSize: 10, color: "#9ca3af" }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div
            key={v}
            style={{
              width: 11,
              height: 11,
              borderRadius: 3,
              background: v === 0 ? "#f3f4f6" : accentColor,
              opacity: v === 0 ? 1 : 0.15 + v * 0.85,
            }}
          />
        ))}
        <span style={{ fontSize: 10, color: "#9ca3af" }}>More</span>
      </div>
    </div>
  );
}

function PieChart({
  slices,
  size = 180,
  center,
}: {
  slices: { color: string; pct: number; label: string; value: string }[];
  size?: number;
  center?: React.ReactNode;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const r = size / 2 - 16;
  const cx = size / 2,
    cy = size / 2;
  let cum = -90;
  const arcs = slices.map((s, i) => {
    const deg = (s.pct / 100) * 360;
    const start = cum;
    cum += deg;
    const end = cum;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const sx = cx + r * Math.cos(toRad(start)),
      sy = cy + r * Math.sin(toRad(start));
    const ex = cx + r * Math.cos(toRad(end)),
      ey = cy + r * Math.sin(toRad(end));
    const large = deg > 180 ? 1 : 0;
    const ri = r * 0.55;
    const ix = cx + ri * Math.cos(toRad(start)),
      iy = cy + ri * Math.sin(toRad(start));
    const iex = cx + ri * Math.cos(toRad(end)),
      iey = cy + ri * Math.sin(toRad(end));
    return {
      path: `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} L ${iex} ${iey} A ${ri} ${ri} 0 ${large} 0 ${ix} ${iy} Z`,
      ...s,
      i,
    };
  });
  return (
    <div
      style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.length === 0 ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={r * 0.45}
          />
        ) : (
          arcs.map((arc) => (
            <path
              key={arc.i}
              d={arc.path}
              fill={arc.color}
              opacity={hov === null ? 1 : hov === arc.i ? 1 : 0.45}
              stroke="white"
              strokeWidth={2}
              style={{
                cursor: "pointer",
                transition: "opacity 0.15s",
                transform: hov === arc.i ? `scale(1.04)` : "scale(1)",
                transformOrigin: `${cx}px ${cy}px`,
              }}
              onMouseEnter={() => setHov(arc.i)}
              onMouseLeave={() => setHov(null)}
            />
          ))
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {hov !== null && slices[hov] ? (
          <>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: slices[hov].color,
                textAlign: "center",
                maxWidth: r * 1.1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {slices[hov].label}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>
              {slices[hov].value}
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>
              {slices[hov].pct.toFixed(1)}%
            </div>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  );
}

function WeekdayBars({
  data,
  accentColor,
}: {
  data: { label: string; avg: number; count: number }[];
  accentColor: string;
}) {
  const max = Math.max(...data.map((d) => d.avg), 1);
  const [hov, setHov] = useState<number | null>(null);
  return (
    <div
      style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 90 }}
    >
      {data.map((d, i) => {
        const h = d.avg > 0 ? Math.max((d.avg / max) * 70, 4) : 2;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              position: "relative",
            }}
            onMouseEnter={() => setHov(i)}
            onMouseLeave={() => setHov(null)}
          >
            {hov === i && d.avg > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#111827",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 7,
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                  marginBottom: 4,
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                avg {fmtHrs(d.avg)}
              </div>
            )}
            <div
              style={{
                width: "100%",
                height: 72,
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: h,
                  borderRadius: "4px 4px 2px 2px",
                  background: hov === i ? accentColor : accentColor + "44",
                  transition: "all 0.15s",
                }}
              />
            </div>
            <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 700 }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SparkLine({
  points,
  color,
}: {
  points: { avg: number }[];
  color: string;
}) {
  const W = 280,
    H = 50;
  const max = Math.max(...points.map((p) => p.avg), 1);
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - (p.avg / max) * (H - 6) - 3);
  const path = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`)
    .join(" ");
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={xs[xs.length - 1]}
          cy={ys[ys.length - 1]}
          r="4"
          fill={color}
        />
      )}
    </svg>
  );
}

function TaskRow({
  task,
  listColor,
  listName,
}: {
  task: TodoItem;
  listColor: string;
  listName: string;
}) {
  const secs = task.studiedSecs || 0;
  const assignedSecs = (task.assignedMins || 0) * 60;
  const pct =
    assignedSecs > 0
      ? Math.min(Math.round((secs / assignedSecs) * 100), 100)
      : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "white",
        border: `1.5px solid ${task.done ? "#f3f4f6" : "#e5e7eb"}`,
        borderRadius: 13,
        opacity: task.done ? 0.6 : 1,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: listColor,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: task.done ? "#9ca3af" : "#111827",
            textDecoration: task.done ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.text}
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>
          {listName}
          {task.assignedMins ? ` · ${task.assignedMins}m target` : ""}
        </div>
      </div>
      {secs > 0 && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: listColor,
            flexShrink: 0,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {fmtSecs(secs)}
        </div>
      )}
      {pct !== null && (
        <div
          style={{ width: 36, height: 36, flexShrink: 0, position: "relative" }}
        >
          <svg
            viewBox="0 0 36 36"
            style={{ transform: "rotate(-90deg)", width: 36, height: 36 }}
          >
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke={pct >= 100 ? "#22c55e" : listColor}
              strokeWidth="3"
              strokeDasharray={`${(pct / 100) * 87.96} 87.96`}
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: 800,
              color: pct >= 100 ? "#22c55e" : listColor,
            }}
          >
            {pct}%
          </div>
        </div>
      )}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          background: task.done ? "#22c55e18" : "#f3f4f6",
          border: `1.5px solid ${task.done ? "#22c55e55" : "#e5e7eb"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: task.done ? "#22c55e" : "#d1d5db",
          flexShrink: 0,
        }}
      >
        {task.done ? "✓" : ""}
      </div>
    </div>
  );
}

/* ══════════════════════ MAIN ══════════════════════ */
interface Props {
  onStudyTime: (secs: number) => void;
  initialTopics?: never;
}

type Section = "overview" | "analysis" | "subjects" | "tasks";

export default function TrackerTab({ onStudyTime }: Props) {
  const TODAY = dateKey(0);
  const [chartRange, setChartRange] = useState<7 | 14 | 30>(30);
  const [section, setSection] = useState<Section>("overview");
  const [taskFilter, setTaskFilter] = useState<
    "all" | "done" | "active" | "studied"
  >("all");
  const [taskSort, setTaskSort] = useState<"time" | "name" | "list">("time");
  const [expandedList, setExpandedList] = useState<string | null>(null);

  const todoLists: TodoList[] = lsGet("sv_todo_lists", []);
  const allTasks: (TodoItem & {
    listName: string;
    listColor: string;
    listId: string;
  })[] = todoLists.flatMap((l) =>
    l.items.map((t) => ({
      ...t,
      listName: l.name,
      listColor: l.color,
      listId: l.id,
    })),
  );

  const daily90 = useMemo(() => getDailyData(90), []);
  const daily30 = useMemo(() => daily90.slice(-30), [daily90]);
  const dailyN = useMemo(() => getDailyData(chartRange), [chartRange]);

  const totalLifetime = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return Object.keys(localStorage)
      .filter((k) => k.startsWith("sv_daily_"))
      .reduce((a, k) => a + lsGet<number>(k, 0), 0);
  }, []);

  const todaySecs = lsGet<number>("sv_daily_" + TODAY, 0);
  const weekSecs = daily30.slice(-7).reduce((a, d) => a + d.secs, 0);
  const prevWeekSecs = daily30.slice(-14, -7).reduce((a, d) => a + d.secs, 0);
  const monthSecs = daily30.reduce((a, d) => a + d.secs, 0);
  const avgDaily = Math.round(monthSecs / 30);
  const bestDay = Math.max(...daily90.map((d) => d.secs));
  const streak = getStreak(daily30);
  const longestStr = getLongestStreak(daily90);
  const activeDays = daily30.filter((d) => d.secs > 0).length;
  const consistency = Math.round((activeDays / 30) * 100);

  const goalHrs = lsGet<number>("sv_goal_hrs", 8);
  const goalSecs = goalHrs * 3600;
  const goalDays = daily30.filter((d) => d.secs >= goalSecs * 0.8).length;
  const todayPct =
    goalSecs > 0 ? Math.min(Math.round((todaySecs / goalSecs) * 100), 100) : 0;

  const weekTrend =
    prevWeekSecs > 0
      ? {
          val:
            Math.abs(
              Math.round(((weekSecs - prevWeekSecs) / prevWeekSecs) * 100),
            ) + "%",
          up: weekSecs >= prevWeekSecs,
        }
      : null;

  const weekdayAvgs = useMemo(() => getWeekdayAvgs(daily30), [daily30]);
  const bestWeekday = weekdayAvgs.reduce(
    (a, d) => (d.avg > a.avg ? d : a),
    weekdayAvgs[0],
  );
  const worstWeekday = weekdayAvgs
    .filter((d) => d.count > 0)
    .reduce((a, d) => (d.avg < a.avg ? d : a), weekdayAvgs[0]);
  const velocity = useMemo(() => getStudyVelocity(daily90), [daily90]);

  const sessionCount = daily90.filter((d) => d.secs > 0).length;
  const avgSession =
    sessionCount > 0
      ? Math.round(daily90.reduce((a, d) => a + d.secs, 0) / sessionCount)
      : 0;

  /* ── Pomodoro lifetime total (all sv_pomo_today_* keys) ── */
  const pomoLifetimeSecs = useMemo(() => {
    if (typeof window === "undefined") return 0;
    return Object.keys(localStorage)
      .filter((k) => k.startsWith("sv_pomo_today_"))
      .reduce((a, k) => a + lsGet<number>(k, 0), 0);
  }, []);

  const pomoTodaySecs = lsGet<number>("sv_pomo_today_" + TODAY, 0);

  /* ── Subject (list-based) time breakdown ── */
  const listSummaries = todoLists
    .map((l, li) => {
      const studied = l.items.reduce((a, t) => a + (t.studiedSecs || 0), 0);
      const done = l.items.filter((t) => t.done).length;
      const overdue = l.items.filter(
        (t) => !t.done && t.createdAt?.slice(0, 10) < TODAY,
      ).length;
      return {
        ...l,
        studied,
        done,
        overdue,
        color: l.color || COLORS[li % COLORS.length],
      };
    })
    .filter((l) => l.items.length > 0 || l.studied > 0);

  /* ── Add Pomodoro / Miscellaneous entry if there's any pomo time ── */
  const POMO_MISC_COLOR = "#f59e0b";
  const pomoMiscEntry =
    pomoLifetimeSecs > 0
      ? {
          id: "__pomo_misc__",
          name: "Pomodoro / Miscellaneous",
          color: POMO_MISC_COLOR,
          studied: pomoLifetimeSecs,
          done: 0,
          overdue: 0,
          items: [],
        }
      : null;

  const allListSummaries = pomoMiscEntry
    ? [...listSummaries, pomoMiscEntry]
    : listSummaries;

  const totalStudiedInLists = allListSummaries.reduce(
    (a, l) => a + l.studied,
    0,
  );
  const listSlices = allListSummaries.map((l) => ({
    color: l.color,
    pct: totalStudiedInLists > 0 ? (l.studied / totalStudiedInLists) * 100 : 0,
    label: l.name,
    value: fmtHrs(l.studied),
  }));

  const studiedTasks = allTasks.filter((t) => (t.studiedSecs || 0) > 0);
  const totalTaskStudied = studiedTasks.reduce(
    (a, t) => a + (t.studiedSecs || 0),
    0,
  );
  const taskSlices = studiedTasks
    .sort((a, b) => (b.studiedSecs || 0) - (a.studiedSecs || 0))
    .slice(0, 8)
    .map((t) => ({
      color: t.listColor,
      pct:
        totalTaskStudied > 0
          ? ((t.studiedSecs || 0) / totalTaskStudied) * 100
          : 0,
      label: t.text,
      value: fmtSecs(t.studiedSecs || 0),
    }));

  const doneTasks = allTasks.filter((t) => t.done);
  const pendingTasks = allTasks.filter((t) => !t.done);
  const overdueTasks = allTasks.filter(
    (t) => !t.done && t.createdAt?.slice(0, 10) < TODAY,
  );
  const completionRate =
    allTasks.length > 0
      ? Math.round((doneTasks.length / allTasks.length) * 100)
      : 0;
  const totalAssigned = allTasks.reduce(
    (a, t) => a + (t.assignedMins || 0) * 60,
    0,
  );
  const remainingStudy = Math.max(0, totalAssigned - totalTaskStudied);

  const filteredTasks = allTasks
    .filter((t) => {
      if (taskFilter === "done") return t.done;
      if (taskFilter === "active") return !t.done;
      if (taskFilter === "studied") return (t.studiedSecs || 0) > 0;
      return true;
    })
    .sort((a, b) => {
      if (taskSort === "time")
        return (b.studiedSecs || 0) - (a.studiedSecs || 0);
      if (taskSort === "name") return a.text.localeCompare(b.text);
      if (taskSort === "list") return a.listName.localeCompare(b.listName);
      return 0;
    });

  const SECTIONS: { key: Section; icon: string; label: string }[] = [
    { key: "overview", icon: "⚡", label: "Overview" },
    { key: "analysis", icon: "📈", label: "Analysis" },
    { key: "subjects", icon: "◎", label: "Subjects" },
    { key: "tasks", icon: "✓", label: "Tasks" },
  ];

  return (
    <div
      className="sv-fadein"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes trFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .tr-sec { animation: trFadeIn 0.22s ease; }
        .tr-pill { transition: all 0.15s; }
        .tr-pill:hover { opacity: 0.85; }
      `}</style>

      {/* Section tabs */}
      <div
        style={{ display: "flex", gap: 5, marginBottom: 22, flexWrap: "wrap" }}
      >
        {SECTIONS.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className="tr-pill"
            style={{
              padding: "7px 14px",
              borderRadius: 11,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: section === key ? AC : "#f3f4f6",
              border: "none",
              color: section === key ? "white" : "#6b7280",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════ OVERVIEW ════════════════ */}
      {section === "overview" && (
        <div className="tr-sec">
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <div
                  style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}
                >
                  Today's Progress
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {fmtHrs(todaySecs)} of {goalHrs}h goal
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  color: todayPct >= 100 ? "#22c55e" : AC,
                }}
              >
                {todayPct}%
              </div>
            </div>
            <div
              style={{
                height: 10,
                background: "#f3f4f6",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${todayPct}%`,
                  background:
                    todayPct >= 100
                      ? "linear-gradient(90deg,#22c55e,#16a34a)"
                      : `linear-gradient(90deg,${AC},${AC}cc)`,
                  borderRadius: 99,
                  transition: "width 0.5s",
                  boxShadow: `0 0 10px ${todayPct >= 100 ? "#22c55e" : AC}44`,
                }}
              />
            </div>
            {todayPct >= 100 && (
              <div
                style={{
                  fontSize: 12,
                  color: "#22c55e",
                  fontWeight: 700,
                  marginTop: 10,
                }}
              >
                🎉 Daily goal reached!
              </div>
            )}
          </Card>

          {/* Pomodoro today banner if any */}
          {pomoTodaySecs > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                border: "1.5px solid #fde68a",
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>🍅</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}
                >
                  Pomodoro Focus Today
                </div>
                <div style={{ fontSize: 11, color: "#b45309" }}>
                  Untracked task time from Pomodoro sessions
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#d97706",
                }}
              >
                {fmtHrs(pomoTodaySecs)}
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <StatCard
              label="THIS WEEK"
              value={fmtHrs(weekSecs)}
              sub="last 7 days"
              color="#06b6d4"
              icon="📅"
              trend={weekTrend}
            />
            <StatCard
              label="STREAK"
              value={`${streak}d`}
              sub={`best ${longestStr}d`}
              color="#f59e0b"
              icon="🔥"
              trend={null}
            />
            <StatCard
              label="CONSISTENCY"
              value={`${consistency}%`}
              sub={`${activeDays}/30 days`}
              color="#22c55e"
              icon="📊"
              trend={null}
            />
            <StatCard
              label="ALL TIME"
              value={fmtHrs(totalLifetime)}
              sub="lifetime"
              color="#ec4899"
              icon="🏆"
              trend={null}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <StatCard
              label="AVG / DAY"
              value={fmtHrs(avgDaily)}
              sub="30d average"
              color="#f97316"
              icon="⏱"
              trend={null}
            />
            <StatCard
              label="BEST DAY"
              value={fmtHrs(bestDay)}
              sub="single day"
              color={AC}
              icon="⭐"
              trend={null}
            />
            <StatCard
              label="GOAL DAYS"
              value={`${goalDays}/30`}
              sub="≥80% of goal"
              color="#8b5cf6"
              icon="🎯"
              trend={null}
            />
          </div>

          <Card style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <SectionHead title="Daily Study" />
              <div style={{ display: "flex", gap: 4 }}>
                {([7, 14, 30] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setChartRange(n)}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      background: chartRange === n ? AC : "#f3f4f6",
                      border: "none",
                      color: chartRange === n ? "white" : "#6b7280",
                    }}
                  >
                    {n}d
                  </button>
                ))}
              </div>
            </div>
            <BarChart data={dailyN} height={90} accentColor={AC} />
          </Card>

          <Card>
            <SectionHead title="Study Heatmap" sub="Last 15 weeks" />
            <div style={{ overflowX: "auto", paddingBottom: 4 }}>
              <HeatMap accentColor={AC} />
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════ ANALYSIS ════════════════ */}
      {section === "analysis" && (
        <div className="tr-sec">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="SESSIONS"
              value={`${sessionCount}`}
              sub="study days"
              color={AC}
              icon="📚"
              trend={null}
            />
            <StatCard
              label="AVG SESSION"
              value={fmtHrs(avgSession)}
              sub="per active day"
              color="#f59e0b"
              icon="⏲"
              trend={null}
            />
            <StatCard
              label="THIS MONTH"
              value={fmtHrs(monthSecs)}
              sub="30d total"
              color="#22c55e"
              icon="📅"
              trend={null}
            />
          </div>

          <Card style={{ marginBottom: 16 }}>
            <SectionHead
              title="Study Velocity"
              sub="7-day rolling average over last 30 days"
            />
            {velocity.length > 1 ? (
              <>
                <SparkLine points={velocity} color={AC} />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    30 days ago
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: AC }}>
                    avg {fmtHrs(velocity[velocity.length - 1]?.avg ?? 0)}/day
                    now
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>today</div>
                </div>
              </>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              >
                Not enough data yet — keep studying!
              </div>
            )}
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <SectionHead
              title="Weekday Patterns"
              sub="Average study per day of week (last 30d)"
            />
            <WeekdayBars data={weekdayAvgs} accentColor={AC} />
            {bestWeekday && (
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 14,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "#9ca3af" }}>Best: </span>
                  <span style={{ fontWeight: 800, color: "#16a34a" }}>
                    {bestWeekday.label} · {fmtHrs(bestWeekday.avg)}
                  </span>
                </div>
                {worstWeekday && worstWeekday.label !== bestWeekday.label && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 10,
                      padding: "8px 14px",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "#9ca3af" }}>Needs work: </span>
                    <span style={{ fontWeight: 800, color: "#dc2626" }}>
                      {worstWeekday.label} · {fmtHrs(worstWeekday.avg)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <SectionHead
                title="Goal Adherence"
                sub={`Days ≥80% of ${goalHrs}h goal in last 30d`}
              />
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 22,
                  fontWeight: 800,
                  color:
                    goalDays >= 20
                      ? "#22c55e"
                      : goalDays >= 10
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              >
                {goalDays}
                <span style={{ fontSize: 13, color: "#9ca3af" }}>/30</span>
              </div>
            </div>
            <div
              style={{
                height: 10,
                background: "#f3f4f6",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(goalDays / 30) * 100}%`,
                  background: `linear-gradient(90deg,${AC},${AC}aa)`,
                  borderRadius: 99,
                  boxShadow: `0 0 8px ${AC}44`,
                }}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(30,1fr)",
                gap: 2,
                marginTop: 14,
              }}
            >
              {daily30.map((d) => (
                <div
                  key={d.key}
                  title={`${d.label}: ${fmtHrs(d.secs)}`}
                  style={{
                    height: 10,
                    borderRadius: 2,
                    background:
                      d.secs === 0
                        ? "#f3f4f6"
                        : d.secs >= goalSecs
                          ? "#22c55e"
                          : d.secs >= goalSecs * 0.8
                            ? AC
                            : AC + "55",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                fontSize: 10,
                color: "#9ca3af",
              }}
            >
              {[
                ["#22c55e", "Goal"],
                [AC, "≥80%"],
                [AC + "55", "<80%"],
                ["#f3f4f6", "None"],
              ].map(([col, lbl]) => (
                <span
                  key={lbl}
                  style={{ display: "flex", alignItems: "center", gap: 3 }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 1,
                      background: col,
                      display: "inline-block",
                    }}
                  />
                  {lbl}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ════════════════ SUBJECTS ════════════════ */}
      {section === "subjects" && (
        <div className="tr-sec">
          {allListSummaries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>◎</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#6b7280" }}>
                No lists with data yet
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>
                Create lists and run timers in the Todo tab to see your subject
                breakdown here.
              </div>
            </div>
          ) : (
            <>
              {/* PIE 1: Time per List (including Pomo Misc) */}
              <Card style={{ marginBottom: 16 }}>
                <SectionHead
                  title="Study Time by Subject"
                  sub="Based on all timer sessions across tasks + Pomodoro"
                />
                {totalStudiedInLists === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px 0",
                      color: "#9ca3af",
                      fontSize: 13,
                    }}
                  >
                    No studied time yet — start a timer on a task to see
                    breakdown
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <PieChart
                      slices={listSlices}
                      size={180}
                      center={
                        <>
                          <div
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              fontSize: 14,
                              fontWeight: 800,
                              color: "#111827",
                            }}
                          >
                            {fmtHrs(totalStudiedInLists)}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: "#9ca3af",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                            }}
                          >
                            TOTAL
                          </div>
                        </>
                      }
                    />
                    <div
                      style={{
                        flex: 1,
                        minWidth: 140,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      {allListSummaries
                        .sort((a, b) => b.studied - a.studied)
                        .map((l) => {
                          const pct =
                            totalStudiedInLists > 0
                              ? Math.round(
                                  (l.studied / totalStudiedInLists) * 100,
                                )
                              : 0;
                          const isPomo = l.id === "__pomo_misc__";
                          return (
                            <div key={l.id}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 4,
                                }}
                              >
                                <div
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: isPomo ? "2px" : "50%",
                                    background: l.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <div
                                  style={{
                                    flex: 1,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#374151",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {isPomo ? "🍅 " : ""}
                                  {l.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: l.color,
                                  }}
                                >
                                  {fmtHrs(l.studied)}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: "#9ca3af",
                                    minWidth: 28,
                                    textAlign: "right",
                                  }}
                                >
                                  {pct}%
                                </div>
                              </div>
                              <div
                                style={{
                                  height: 3,
                                  background: "#f3f4f6",
                                  borderRadius: 99,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    background: l.color,
                                    borderRadius: 99,
                                    transition: "width 0.5s",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </Card>

              {/* Pomodoro Miscellaneous note */}
              {pomoMiscEntry && (
                <div
                  style={{
                    background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                    border: "1.5px solid #fde68a",
                    borderRadius: 14,
                    padding: "14px 18px",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🍅</span>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#92400e",
                        }}
                      >
                        Pomodoro / Miscellaneous
                      </div>
                      <div style={{ fontSize: 11, color: "#b45309" }}>
                        Focus time from Pomodoro sessions not linked to a
                        specific task
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#d97706",
                      }}
                    >
                      {fmtHrs(pomoLifetimeSecs)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, color: "#92400e" }}>
                      Today:{" "}
                      <span style={{ fontWeight: 800, color: "#d97706" }}>
                        {fmtHrs(pomoTodaySecs)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#92400e" }}>
                      All time:{" "}
                      <span style={{ fontWeight: 800, color: "#d97706" }}>
                        {fmtHrs(pomoLifetimeSecs)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PIE 2: Time per Task (top 8) */}
              {studiedTasks.length > 0 && (
                <Card style={{ marginBottom: 16 }}>
                  <SectionHead
                    title="Top Tasks by Study Time"
                    sub="Your most focused tasks (up to 8 shown)"
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <PieChart
                      slices={taskSlices}
                      size={180}
                      center={
                        <>
                          <div
                            style={{
                              fontFamily: "'Space Grotesk', sans-serif",
                              fontSize: 14,
                              fontWeight: 800,
                              color: "#111827",
                            }}
                          >
                            {fmtHrs(totalTaskStudied)}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: "#9ca3af",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                            }}
                          >
                            TASKS
                          </div>
                        </>
                      }
                    />
                    <div
                      style={{
                        flex: 1,
                        minWidth: 140,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {taskSlices.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: s.color,
                              flexShrink: 0,
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              fontSize: 11,
                              color: "#374151",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.label}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: s.color,
                              flexShrink: 0,
                            }}
                          >
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Per-list expanded view (excluding pomo misc) */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {listSummaries
                  .sort((a, b) => b.studied - a.studied)
                  .map((l) => {
                    const isExp = expandedList === l.id;
                    const pct =
                      l.items.length > 0
                        ? Math.round((l.done / l.items.length) * 100)
                        : 0;
                    return (
                      <div
                        key={l.id}
                        style={{
                          background: "white",
                          border: `1.5px solid ${isExp ? l.color + "55" : "#f3f4f6"}`,
                          borderRadius: 18,
                          overflow: "hidden",
                          boxShadow: "0 2px 10px #00000008",
                          transition: "border-color 0.2s",
                        }}
                      >
                        <div
                          style={{
                            height: 3,
                            background: `linear-gradient(90deg,${l.color},${l.color}66)`,
                          }}
                        />
                        <div
                          onClick={() => setExpandedList(isExp ? null : l.id)}
                          style={{
                            padding: "14px 18px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: l.color,
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: "#111827",
                              }}
                            >
                              {l.name}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                                marginTop: 2,
                              }}
                            >
                              {l.done}/{l.items.length} done
                              {l.overdue > 0 ? ` · ${l.overdue} overdue` : ""}
                            </div>
                          </div>
                          {l.studied > 0 && (
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: l.color,
                              }}
                            >
                              {fmtHrs(l.studied)}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: pct === 100 ? "#22c55e" : l.color,
                            }}
                          >
                            {pct}%
                          </div>
                          <div
                            style={{
                              color: "#9ca3af",
                              fontSize: 14,
                              transition: "transform 0.2s",
                              transform: isExp ? "rotate(90deg)" : "none",
                            }}
                          >
                            ›
                          </div>
                        </div>
                        {l.items.length > 0 && (
                          <div
                            style={{
                              height: 3,
                              background: "#f9f9f9",
                              margin: "0 18px",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                background: l.color,
                                transition: "width 0.4s",
                              }}
                            />
                          </div>
                        )}
                        {isExp && (
                          <div
                            style={{
                              padding: "12px 16px 16px",
                              display: "flex",
                              flexDirection: "column",
                              gap: 7,
                              background: "#fafafa",
                              borderTop: "1px solid #f3f4f6",
                            }}
                          >
                            {l.items.length === 0 ? (
                              <div
                                style={{
                                  textAlign: "center",
                                  padding: "16px 0",
                                  color: "#9ca3af",
                                  fontSize: 12,
                                }}
                              >
                                No tasks in this list
                              </div>
                            ) : (
                              [...l.items]
                                .sort(
                                  (a, b) =>
                                    (b.studiedSecs || 0) - (a.studiedSecs || 0),
                                )
                                .map((task) => (
                                  <TaskRow
                                    key={task.id}
                                    task={task}
                                    listColor={l.color}
                                    listName={l.name}
                                  />
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════ TASKS ════════════════ */}
      {section === "tasks" && (
        <div className="tr-sec">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <StatCard
              label="COMPLETED"
              value={`${doneTasks.length}/${allTasks.length}`}
              sub={`${completionRate}% rate`}
              color="#22c55e"
              icon="✅"
              trend={null}
            />
            <StatCard
              label="TASK TIME"
              value={fmtHrs(totalTaskStudied)}
              sub="studied in tasks"
              color={AC}
              icon="⏱"
              trend={null}
            />
            <StatCard
              label="PENDING"
              value={`${pendingTasks.length}`}
              sub="remaining tasks"
              color="#f59e0b"
              icon="📋"
              trend={null}
            />
            <StatCard
              label="OVERDUE"
              value={`${overdueTasks.length}`}
              sub="not done from past days"
              color="#ef4444"
              icon="⚠️"
              trend={null}
            />
          </div>

          {/* Pomodoro time in tasks section too */}
          {pomoTodaySecs > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                border: "1.5px solid #fde68a",
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>🍅</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 12, fontWeight: 800, color: "#92400e" }}
                >
                  Pomodoro Focus (Today)
                </div>
                <div style={{ fontSize: 10, color: "#b45309" }}>
                  Not attributed to any specific task
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 16,
                  fontWeight: 900,
                  color: "#d97706",
                }}
              >
                {fmtHrs(pomoTodaySecs)}
              </div>
            </div>
          )}

          <Card style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <SectionHead title="Overall Completion" />
              <div style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>
                {completionRate}%
              </div>
            </div>
            <div
              style={{
                height: 10,
                background: "#f3f4f6",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${completionRate}%`,
                  background: "linear-gradient(90deg,#22c55e,#16a34a)",
                  borderRadius: 99,
                  boxShadow: "0 0 8px #22c55e44",
                }}
              />
            </div>
          </Card>

          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "active", "done", "studied"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: taskFilter === f ? AC : "#f3f4f6",
                    border: "none",
                    color: taskFilter === f ? "white" : "#6b7280",
                    transition: "all 0.15s",
                  }}
                >
                  {f === "all"
                    ? `All (${allTasks.length})`
                    : f === "active"
                      ? `Active (${pendingTasks.length})`
                      : f === "done"
                        ? `Done (${doneTasks.length})`
                        : `Studied (${studiedTasks.length})`}
                </button>
              ))}
            </div>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>
                SORT
              </span>
              {(["time", "name", "list"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setTaskSort(s)}
                  style={{
                    padding: "4px 9px",
                    borderRadius: 7,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    background: taskSort === s ? "#111827" : "#f3f4f6",
                    border: "none",
                    color: taskSort === s ? "white" : "#6b7280",
                    transition: "all 0.15s",
                  }}
                >
                  {s === "time" ? "⏱ Time" : s === "name" ? "A–Z" : "List"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {filteredTasks.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#9ca3af",
                  fontSize: 13,
                }}
              >
                No tasks match this filter
              </div>
            ) : (
              filteredTasks.map((task) => (
                <TaskRow
                  key={task.id + task.listId}
                  task={task}
                  listColor={task.listColor}
                  listName={task.listName}
                />
              ))
            )}
          </div>

          {todoLists.length > 0 && (
            <Card style={{ marginTop: 18 }}>
              <SectionHead title="By List" />
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {[...todoLists]
                  .sort(
                    (a, b) =>
                      b.items.reduce((s, t) => s + (t.studiedSecs || 0), 0) -
                      a.items.reduce((s, t) => s + (t.studiedSecs || 0), 0),
                  )
                  .map((list) => {
                    const done = list.items.filter((t) => t.done).length;
                    const total = list.items.length;
                    const studied = list.items.reduce(
                      (a, t) => a + (t.studiedSecs || 0),
                      0,
                    );
                    const over = list.items.filter(
                      (t) => !t.done && t.createdAt?.slice(0, 10) < TODAY,
                    ).length;
                    const p = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={list.id}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: list.color,
                              flexShrink: 0,
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#111827",
                            }}
                          >
                            {list.name}
                          </div>
                          {over > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "#ef4444",
                                fontWeight: 700,
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: 99,
                                padding: "2px 7px",
                              }}
                            >
                              {over} overdue
                            </span>
                          )}
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>
                            {done}/{total}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: list.color,
                            }}
                          >
                            {studied > 0 ? fmtHrs(studied) : "—"}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: p === 100 ? "#22c55e" : list.color,
                              width: 36,
                              textAlign: "right",
                            }}
                          >
                            {p}%
                          </div>
                        </div>
                        <div
                          style={{
                            height: 5,
                            background: "#f3f4f6",
                            borderRadius: 99,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${p}%`,
                              background: `linear-gradient(90deg,${list.color},${list.color}88)`,
                              borderRadius: 99,
                              transition: "width 0.5s",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
