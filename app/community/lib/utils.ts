// ─── Constants ────────────────────────────────────────────────────────────────
export const API = "https://api.hindanbazar.cloud";

// ⚠️  Do NOT use a module-level TODAY constant — it would be frozen at the time
// the module first loaded (could be yesterday if the tab stayed open overnight).
// Always call dateKey() at the point of use instead.
export function dateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

// Kept for backwards-compat with files that still import TODAY, but NOW it's
// a getter so it always returns the real current date.
export const TODAY = dateKey(0); // used only at module load for non-timer display

export const COLORS = [
  "#a855f7",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#3b82f6",
  "#f97316",
  "#14b8a6",
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  priority: "low" | "normal" | "high";
  assignedMins?: number;
  studiedSecs: number;
  createdAt: string;
}

export interface TodoList {
  id: string;
  name: string;
  color: string;
  items: TodoItem[];
}

export interface TrackerTopic {
  id: string;
  name: string;
  color: string;
  secs: number;
}

export interface PomodoroSettings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

export interface StudyData {
  uid: string;
  dailySecs: Record<string, number>;
  todoLists: TodoList[];
  topics: Record<string, TrackerTopic[]>;
  pomodoroSettings: PomodoroSettings;
  pomodoroSessions: Record<string, number>;
  goalHrs: number;
  updatedAt: string;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  picture: string;
  secs: number;
  rank: number;
  isMe: boolean;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function fmtSecs(s: number): string {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
export function pad(n: number) {
  return String(n).padStart(2, "0");
}
export function fmtHrs(s: number) {
  return (s / 3600).toFixed(1) + "h";
}

export function lsGet<T>(key: string, def: T): T {
  try {
    if (typeof window === "undefined") return def;
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
export function lsSet(key: string, val: unknown) {
  try {
    if (typeof window !== "undefined")
      localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sv_token");
}

export async function authFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
