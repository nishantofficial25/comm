"use client";
/**
 * TodoTab — Save strategy
 *
 * LOCAL checkpoint (every 3 min while timer runs + visibilitychange + beforeunload):
 *   • Bakes live elapsed into task.studiedSecs in sv_todo_lists (localStorage)
 *   • Updates savedSecs in TIMER_KEY (so restore always reads the right value)
 *   • Writes crash-recovery blob to AUTOSAVE_KEY
 *   → Zero server cost; fast; survives browser crash
 *
 * SERVER sync (every 1 hour while timer runs + on manual stop/save):
 *   • Sends full lists to /api/void/study/sync
 *   → Low server load; data eventually consistent
 *
 * On next mount:
 *   • If AUTOSAVE_KEY present → merge into sv_todo_lists, flush to DB, clear key
 *   • If TIMER_KEY present → restore paused at the checkpointed savedSecs
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  API,
  authFetch,
  fmtSecs,
  fmtHrs,
  lsGet,
  lsSet,
  dateKey,
  COLORS,
} from "../lib/utils";
import { TodoList, TodoItem } from "../lib/utils";
import { FullscreenTimerState } from "./FullscreenStopwatch";

const TIMER_KEY = "sv_running_timer";
const AUTOSAVE_KEY = "sv_autosave";
const LOCAL_CHECKPOINT_MS = 3 * 60 * 1000;
const SERVER_SYNC_MS = 60 * 60 * 1000;

interface AutosaveSnapshot {
  lists: TodoList[];
  savedAt: number;
  dailyKey: string;
  dailySecs: number;
  recoveredTaskName?: string;
  recoveredSecs?: number;
}

interface PersistedTimer {
  taskId: string;
  listIdx: number;
  savedSecs: number;
  sessionBaseSecs?: number;
  sessionStart: number;
  pausedAt?: number | null;
  totalPausedMs?: number;
}

interface Props {
  onStartFullscreen: (s: FullscreenTimerState) => void;
  onStudyTime: (secs: number) => void;
  onRemoveStudyTime: (secs: number) => void;
  initialLists?: TodoList[];
  externalListIdx?: number | null;
  onListNavChange?: (idx: number | null) => void;
}

/* ── Server sync ─────────────────────────────────────────────────────── */
let syncDebounce: ReturnType<typeof setTimeout> | null = null;
function scheduleSync(lists: TodoList[]) {
  if (syncDebounce) clearTimeout(syncDebounce);
  syncDebounce = setTimeout(() => {
    authFetch(`${API}/api/void/study/sync`, {
      method: "POST",
      body: JSON.stringify({ todoLists: lists }),
    }).catch(() => {});
  }, 1500);
}

function syncNow(lists: TodoList[]) {
  authFetch(`${API}/api/void/study/sync`, {
    method: "POST",
    body: JSON.stringify({ todoLists: lists }),
  }).catch(() => {});
}

const FRESH_LIST: TodoList = {
  id: "default",
  name: "General",
  color: "#8b5cf6",
  items: [],
};

function todayKey() {
  return dateKey(0);
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: diff > 365 ? "numeric" : undefined,
  });
}
function itemDateKey(iso: string) {
  return iso.slice(0, 10);
}

/* ══════════════════════════════════════════════════════
   BEAUTIFUL MODAL SYSTEM
   ══════════════════════════════════════════════════════ */

interface ModalAction {
  label: string;
  variant: "primary" | "danger" | "ghost";
  onClick: () => void;
}

function Modal({
  icon,
  iconBg,
  title,
  subtitle,
  body,
  actions,
  onClose,
}: {
  icon: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  body?: React.ReactNode;
  actions: ModalAction[];
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 800,
        background: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
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
          background: "white",
          borderRadius: 26,
          padding: "32px 28px 26px",
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px #f3f0ff",
          animation: "modalCardIn 0.25s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {/* Icon */}
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
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          {icon}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#111827",
            textAlign: "center",
            marginBottom: 8,
            letterSpacing: "-0.3px",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              fontSize: 13,
              color: "#6b7280",
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: body ? 16 : 28,
            }}
          >
            {subtitle}
          </div>
        )}

        {/* Body */}
        {body && <div style={{ marginBottom: 26 }}>{body}</div>}

        {/* Actions */}
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
                      background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                      color: "white",
                      boxShadow: "0 4px 16px #8b5cf644",
                    }
                  : a.variant === "danger"
                    ? {
                        background: "linear-gradient(135deg,#dc2626,#ef4444)",
                        color: "white",
                        boxShadow: "0 4px 16px #ef444430",
                      }
                    : {
                        background: "#f9fafb",
                        color: "#6b7280",
                        border: "1.5px solid #e5e7eb",
                      }),
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes modalBgIn  { from{opacity:0} to{opacity:1} }
        @keyframes modalCardIn { from{opacity:0;transform:scale(.92) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}

/* ── Delete confirmation ─────────────────────────────────────────────────── */
function DeleteConfirm({
  taskText,
  onConfirm,
  onCancel,
}: {
  taskText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      icon="🗑"
      iconBg="linear-gradient(135deg,#fef2f2,#fee2e2)"
      title="Delete this task?"
      body={
        <div
          style={{
            background: "#fef9f9",
            border: "1px solid #fecaca",
            borderRadius: 14,
            padding: "14px 16px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            "
            <span style={{ fontWeight: 700, color: "#374151" }}>
              {taskText}
            </span>
            "
          </span>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
            This action cannot be undone
          </div>
        </div>
      }
      actions={[
        { label: "Cancel", variant: "ghost", onClick: onCancel },
        { label: "Delete", variant: "danger", onClick: onConfirm },
      ]}
      onClose={onCancel}
    />
  );
}

/* ── Timer conflict modal ────────────────────────────────────────────────── */
function TimerConflictModal({
  conflictType,
  onClose,
}: {
  conflictType: "pomodoro-running" | "task-running";
  onClose: () => void;
}) {
  const isPomo = conflictType === "pomodoro-running";
  return (
    <Modal
      icon={isPomo ? "🍅" : "⏱"}
      iconBg={
        isPomo
          ? "linear-gradient(135deg,#fff7ed,#fed7aa)"
          : "linear-gradient(135deg,#ede9fe,#ddd6fe)"
      }
      title={isPomo ? "Pomodoro is Running" : "Task Timer is Running"}
      subtitle={
        isPomo
          ? "A Pomodoro session is already active. Stop or save it before starting a task timer."
          : "A task timer is already running. Stop or save it before starting a new one."
      }
      actions={[{ label: "Got it", variant: "primary", onClick: onClose }]}
      onClose={onClose}
    />
  );
}

/* ── Delete list confirm modal ───────────────────────────────────────────── */
function DeleteListModal({
  listName,
  onConfirm,
  onCancel,
}: {
  listName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      icon="📋"
      iconBg="linear-gradient(135deg,#fef2f2,#fee2e2)"
      title={`Delete "${listName}"?`}
      subtitle="All tasks in this list will be permanently deleted. This cannot be undone."
      actions={[
        { label: "Cancel", variant: "ghost", onClick: onCancel },
        { label: "Delete List", variant: "danger", onClick: onConfirm },
      ]}
      onClose={onCancel}
    />
  );
}

/* ── Drag-to-reorder ─────────────────────────────────────────────────────── */
function useDrag(items: TodoItem[], onReorder: (items: TodoItem[]) => void) {
  const dragIdx = useRef<number | null>(null);
  const overIdx = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const onDragStart = (i: number) => {
    dragIdx.current = i;
    setDragging(i);
  };
  const onDragEnter = (i: number) => {
    overIdx.current = i;
    setOver(i);
  };
  const onDragEnd = () => {
    if (
      dragIdx.current !== null &&
      overIdx.current !== null &&
      dragIdx.current !== overIdx.current
    ) {
      const next = [...items];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx.current, 0, moved);
      onReorder(next);
    }
    dragIdx.current = null;
    overIdx.current = null;
    setDragging(null);
    setOver(null);
  };
  return { dragging, over, onDragStart, onDragEnter, onDragEnd };
}

/* ── Task row ────────────────────────────────────────────────────────────── */
interface TaskRowProps {
  task: TodoItem;
  lc: string;
  isRunning: boolean;
  isPaused: boolean;
  liveElapsed: number;
  isOverdue: boolean;
  isDragging: boolean;
  isOver: boolean;
  onToggle: () => void;
  onStartTimer: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}
function TaskRow({
  task,
  lc,
  isRunning,
  isPaused,
  liveElapsed,
  isOverdue,
  isDragging,
  isOver,
  onToggle,
  onStartTimer,
  onDelete,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: TaskRowProps) {
  const displaySecs = isRunning ? liveElapsed : task.studiedSecs || 0;
  const assignedSecs = (task.assignedMins || 0) * 60;
  const studPct =
    assignedSecs > 0 ? Math.min((displaySecs / assignedSecs) * 100, 100) : 0;
  const hasStudied = (task.studiedSecs || 0) > 0;
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        background: isRunning ? lc + "0a" : "white",
        border: `1.5px solid ${isOverdue ? "#fca5a5" : isRunning ? lc + "55" : task.done ? "#f3f4f6" : "#e5e7eb"}`,
        borderRadius: 15,
        opacity: isDragging ? 0.4 : task.done ? 0.58 : 1,
        position: "relative",
        overflow: "hidden",
        boxShadow: isOver
          ? `0 0 0 2px ${lc}`
          : isRunning
            ? `0 0 18px ${lc}18`
            : "0 1px 4px #00000008",
        transition: "all 0.15s",
        cursor: "grab",
        transform: isOver && !isDragging ? "scale(1.01)" : "scale(1)",
      }}
    >
      {displaySecs > 0 && assignedSecs > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: 2,
            width: `${studPct}%`,
            background: lc + "88",
            borderRadius: 99,
            transition: "width 0.6s ease",
          }}
        />
      )}
      <div
        style={{
          color: "#d1d5db",
          fontSize: 14,
          cursor: "grab",
          flexShrink: 0,
          padding: "0 2px",
        }}
      >
        ⠿
      </div>
      <button
        onClick={onToggle}
        style={{
          width: 21,
          height: 21,
          borderRadius: 7,
          flexShrink: 0,
          cursor: "pointer",
          background: task.done ? lc : "white",
          border: `2px solid ${task.done ? lc : "#d1d5db"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 11,
          transition: "all 0.2s",
        }}
      >
        {task.done ? "✓" : ""}
      </button>
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
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 2,
            flexWrap: "wrap",
          }}
        >
          {task.assignedMins && (
            <span style={{ fontSize: 10, color: lc, fontWeight: 700 }}>
              {task.assignedMins}m target
            </span>
          )}
          {displaySecs > 0 && (
            <span style={{ fontSize: 10, color: "#9ca3af" }}>
              · {fmtSecs(displaySecs)}
            </span>
          )}
          {isRunning && (
            <span
              style={{
                fontSize: 10,
                color: lc,
                fontWeight: 800,
                animation: "svListPulse 2s ease infinite",
              }}
            >
              ● LIVE
            </span>
          )}
          {isPaused && (
            <span
              style={{
                fontSize: 10,
                color: "#f59e0b",
                fontWeight: 800,
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 6,
                padding: "1px 6px",
              }}
            >
              ⏸ PAUSED
            </span>
          )}
          {isOverdue && !task.done && (
            <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>
              overdue
            </span>
          )}
        </div>
      </div>
      {!task.done && (
        <button
          onClick={onStartTimer}
          style={{
            padding: "5px 12px",
            borderRadius: 9,
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
            background: isRunning ? lc : lc + "16",
            border: `1.5px solid ${lc}44`,
            color: isRunning ? "white" : lc,
            transition: "all 0.2s",
          }}
        >
          {isRunning
            ? "⛶ Open"
            : isPaused
              ? "↩ Resume"
              : hasStudied
                ? "↩ Resume"
                : "▶ Start"}
        </button>
      )}
      <button
        onClick={onDelete}
        style={{
          background: "none",
          border: "none",
          color: "#d1d5db",
          cursor: "pointer",
          fontSize: 15,
          padding: "0 3px",
          flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#d1d5db")}
      >
        ✕
      </button>
    </div>
  );
}

/* ══════════════════════════ MAIN ══════════════════════════ */
export default function TodoTab({
  onStartFullscreen,
  onStudyTime,
  onRemoveStudyTime,
  initialLists,
  externalListIdx,
  onListNavChange,
}: Props) {
  const [lists, setLists] = useState<TodoList[]>(
    () => initialLists ?? lsGet("sv_todo_lists", [{ ...FRESH_LIST }]),
  );
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newMins, setNewMins] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    text: string;
    listIdx: number;
  } | null>(null);
  const [deleteListConfirm, setDeleteListConfirm] = useState<{
    idx: number;
    name: string;
  } | null>(null);
  const [timerConflict, setTimerConflict] = useState<
    "pomodoro-running" | "task-running" | null
  >(null);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [, setTick] = useState(0);
  const ivRef = useRef<ReturnType<typeof setInterval>>();
  const [timerState, setTimerState] = useState<PersistedTimer | null>(null);
  const [autosaveNotice, setAutosaveNotice] = useState<{
    taskName: string;
    secs: number;
  } | null>(null);

  const listsRef = useRef<TodoList[]>(lists);
  const timerStateRef = useRef<PersistedTimer | null>(timerState);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);
  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  /* ── On mount: recover autosave snapshot ────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const aliveToken = sessionStorage.getItem("sv_session_alive");
      if (aliveToken) return;
      const snap: AutosaveSnapshot = JSON.parse(raw);
      if (Date.now() - snap.savedAt > 86_400_000) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return;
      }
      setLists(snap.lists);
      lsSet("sv_todo_lists", snap.lists);
      try {
        const timerRaw = localStorage.getItem(TIMER_KEY);
        if (timerRaw) {
          const t: PersistedTimer = JSON.parse(timerRaw);
          const bakedSecs =
            snap.lists[t.listIdx]?.items.find((i) => i.id === t.taskId)
              ?.studiedSecs ?? t.savedSecs;
          const patched: PersistedTimer = { ...t, savedSecs: bakedSecs };
          localStorage.setItem(TIMER_KEY, JSON.stringify(patched));
        }
      } catch {}
      syncNow(snap.lists);
      localStorage.removeItem(AUTOSAVE_KEY);
      setAutosaveNotice({
        taskName: snap.recoveredTaskName ?? "",
        secs: snap.recoveredSecs ?? 0,
      });
      setTimeout(() => setAutosaveNotice(null), 12_000);
    } catch {
      localStorage.removeItem(AUTOSAVE_KEY);
    }
  }, []); // eslint-disable-line

  /* ── LOCAL CHECKPOINT ────────────────────────────────────────────────── */
  function localCheckpoint() {
    const ts = timerStateRef.current;
    const currentLists = listsRef.current;
    if (!ts) return;
    const { savedSecs, sessionStart, totalPausedMs = 0, pausedAt } = ts;
    const pauseOffset = pausedAt ? Date.now() - pausedAt : 0;
    const liveElapsed =
      savedSecs +
      Math.max(
        0,
        Math.floor(
          (Date.now() - sessionStart - totalPausedMs - pauseOffset) / 1000,
        ),
      );
    const updatedLists = currentLists.map((l, li) =>
      li === ts.listIdx
        ? {
            ...l,
            items: l.items.map((t) =>
              t.id === ts.taskId ? { ...t, studiedSecs: liveElapsed } : t,
            ),
          }
        : l,
    );
    lsSet("sv_todo_lists", updatedLists);
    setLists(updatedLists);
    listsRef.current = updatedLists;
    const updatedTimer: PersistedTimer = {
      ...ts,
      savedSecs: liveElapsed,
      sessionStart: Date.now(),
      totalPausedMs: 0,
      pausedAt: pausedAt ? Date.now() : null,
    };
    localStorage.setItem(TIMER_KEY, JSON.stringify(updatedTimer));
    timerStateRef.current = updatedTimer;
    setTimerState(updatedTimer);
    const taskName =
      currentLists[ts.listIdx]?.items.find((t) => t.id === ts.taskId)?.text ??
      "";
    const today = todayKey();
    const snap: AutosaveSnapshot = {
      lists: updatedLists,
      savedAt: Date.now(),
      dailyKey: today,
      dailySecs: lsGet<number>("sv_daily_" + today, 0),
      recoveredTaskName: taskName,
      recoveredSecs: liveElapsed,
    };
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
    } catch {}
  }

  const localIvRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    if (timerState && !timerState.pausedAt) {
      localIvRef.current = setInterval(localCheckpoint, LOCAL_CHECKPOINT_MS);
    } else {
      clearInterval(localIvRef.current);
      if (!timerState) localStorage.removeItem(AUTOSAVE_KEY);
    }
    return () => clearInterval(localIvRef.current);
  }, [timerState?.taskId, timerState?.pausedAt]); // eslint-disable-line

  const serverIvRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    if (timerState && !timerState.pausedAt) {
      serverIvRef.current = setInterval(() => {
        syncNow(listsRef.current);
      }, SERVER_SYNC_MS);
    } else {
      clearInterval(serverIvRef.current);
    }
    return () => clearInterval(serverIvRef.current);
  }, [timerState?.taskId, timerState?.pausedAt]); // eslint-disable-line

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") localCheckpoint();
    };
    const onUnload = () => localCheckpoint();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (externalListIdx !== undefined) setActiveIdx(externalListIdx ?? null);
  }, [externalListIdx]);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.tab === "todo") setActiveIdx(d.listIdx ?? null);
    };
    window.addEventListener("sv_nav", h);
    return () => window.removeEventListener("sv_nav", h);
  }, []);

  const navToList = (idx: number | null) => {
    setActiveIdx(idx);
    onListNavChange?.(idx);
  };

  useEffect(() => {
    if (!initialLists?.length) return;
    const localLists = lsGet<TodoList[]>("sv_todo_lists", []);
    if (localLists.length) {
      setLists(localLists);
    } else {
      setLists(initialLists);
      lsSet("sv_todo_lists", initialLists);
    }
  }, []); // eslint-disable-line

  /* ── Restore persisted timer on mount ─────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return;
      const t: PersistedTimer = JSON.parse(raw);
      const curLists = lsGet<TodoList[]>("sv_todo_lists", []);
      const taskExists = curLists[t.listIdx]?.items.some(
        (i) => i.id === t.taskId,
      );
      if (!taskExists) {
        localStorage.removeItem(TIMER_KEY);
        return;
      }
      const aliveToken = sessionStorage.getItem("sv_session_alive");
      if (aliveToken) {
        setTimerState(t);
        setActiveIdx(t.listIdx);
      } else {
        const restored: PersistedTimer = {
          ...t,
          sessionStart: Date.now(),
          totalPausedMs: 0,
          pausedAt: Date.now(),
        };
        localStorage.setItem(TIMER_KEY, JSON.stringify(restored));
        setTimerState(restored);
        setActiveIdx(t.listIdx);
      }
    } catch {
      localStorage.removeItem(TIMER_KEY);
    }
  }, []);

  useEffect(() => {
    if (timerState)
      ivRef.current = setInterval(() => setTick((x) => x + 1), 1000);
    else clearInterval(ivRef.current);
    return () => clearInterval(ivRef.current);
  }, [timerState?.taskId]); // eslint-disable-line

  useEffect(() => {
    const h = () => {
      if (!localStorage.getItem(TIMER_KEY)) {
        sessionStorage.removeItem("sv_session_alive");
        setTimerState(null);
        timerStateRef.current = null;
        setLists(lsGet<TodoList[]>("sv_todo_lists", []));
      }
    };
    window.addEventListener("sv_timer_stopped", h);
    return () => window.removeEventListener("sv_timer_stopped", h);
  }, []);

  useEffect(() => {
    const h = (e: Event) => {
      const { pausedAt, totalPausedMs } = (e as CustomEvent).detail as {
        pausedAt: number | null;
        totalPausedMs: number;
      };
      setTimerState((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          pausedAt: pausedAt ?? undefined,
          totalPausedMs,
        };
        timerStateRef.current = next;
        try {
          localStorage.setItem(TIMER_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    window.addEventListener("sv_timer_state_change", h);
    return () => window.removeEventListener("sv_timer_state_change", h);
  }, []);

  useEffect(() => {
    const h = (e: Event) => {
      const { taskId, listIdx, totalSecs } = (e as CustomEvent).detail as {
        taskId: string;
        listIdx: number;
        totalSecs: number;
      };
      const freshLists = lsGet<TodoList[]>("sv_todo_lists", listsRef.current);
      let sessionBaseSecs = 0;
      try {
        const timerRaw = localStorage.getItem(TIMER_KEY);
        if (timerRaw) {
          const t = JSON.parse(timerRaw);
          sessionBaseSecs = t.sessionBaseSecs ?? t.savedSecs ?? 0;
        }
      } catch {}
      const increment = Math.max(0, totalSecs - sessionBaseSecs);
      const finalLists = freshLists.map((l, li) =>
        li === listIdx
          ? {
              ...l,
              items: l.items.map((t) =>
                t.id === taskId ? { ...t, studiedSecs: totalSecs } : t,
              ),
            }
          : l,
      );
      setLists(finalLists);
      lsSet("sv_todo_lists", finalLists);
      listsRef.current = finalLists;
      if (increment > 0) onStudyTime(increment);
      localStorage.removeItem(TIMER_KEY);
      localStorage.removeItem(AUTOSAVE_KEY);
      sessionStorage.removeItem("sv_session_alive");
      setTimerState(null);
      timerStateRef.current = null;
      syncNow(finalLists);
      window.dispatchEvent(new Event("sv_update"));
    };
    window.addEventListener("sv_timer_done", h);
    return () => window.removeEventListener("sv_timer_done", h);
  }, [onStudyTime]); // eslint-disable-line

  const save = useCallback((data: TodoList[]) => {
    if (!data.length) return;
    setLists(data);
    lsSet("sv_todo_lists", data);
    scheduleSync(data);
  }, []);

  function getLiveElapsed(): number {
    if (!timerState) return 0;
    const { savedSecs, sessionStart, totalPausedMs = 0, pausedAt } = timerState;
    const pauseOffset = pausedAt ? Date.now() - pausedAt : 0;
    return (
      savedSecs +
      Math.max(
        0,
        Math.floor(
          (Date.now() - sessionStart - totalPausedMs - pauseOffset) / 1000,
        ),
      )
    );
  }

  function startTimerAndFullscreen(taskId: string, listIdx: number) {
    // ── MUTUAL EXCLUSION: block if Pomodoro is running ──────────────────
    const pomoState = localStorage.getItem("sv_pomo_timer");
    if (pomoState) {
      try {
        const ps = JSON.parse(pomoState);
        // If pomo has an active (non-paused) session, block
        if (ps && !ps.pausedAt) {
          setTimerConflict("pomodoro-running");
          return;
        }
      } catch {}
    }

    const curLists = lsGet<TodoList[]>("sv_todo_lists", []);
    const task = curLists[listIdx]?.items.find((t) => t.id === taskId);
    if (!task) return;
    if (timerState && timerState.taskId !== taskId) {
      setTimerConflict("task-running");
      return;
    }
    let persisted: PersistedTimer;
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) {
        const prev: PersistedTimer = JSON.parse(raw);
        persisted =
          prev.taskId === taskId
            ? prev
            : {
                taskId,
                listIdx,
                savedSecs: task.studiedSecs || 0,
                sessionBaseSecs: task.studiedSecs || 0,
                sessionStart: Date.now(),
                totalPausedMs: 0,
              };
      } else {
        persisted = {
          taskId,
          listIdx,
          savedSecs: task.studiedSecs || 0,
          sessionBaseSecs: task.studiedSecs || 0,
          sessionStart: Date.now(),
          totalPausedMs: 0,
        };
      }
    } catch {
      persisted = {
        taskId,
        listIdx,
        savedSecs: task.studiedSecs || 0,
        sessionBaseSecs: task.studiedSecs || 0,
        sessionStart: Date.now(),
        totalPausedMs: 0,
      };
    }
    localStorage.setItem(TIMER_KEY, JSON.stringify(persisted));
    setTimerState(persisted);
    sessionStorage.setItem("sv_session_alive", "1");
    onStartFullscreen({
      taskId,
      listIdx,
      taskName: task.text,
      listColor: lists[listIdx]?.color ?? "#8b5cf6",
      startTime: persisted.sessionStart,
      initialSecs: (task.assignedMins || 0) * 60,
      resumeSecs: persisted.savedSecs,
      sessionStart: persisted.sessionStart,
      pausedAt: persisted.pausedAt,
      totalPausedMs: persisted.totalPausedMs ?? 0,
    });
    window.dispatchEvent(new Event("sv_timer_broadcast"));
  }

  const safeIdx = activeIdx !== null && lists[activeIdx] ? activeIdx : 0;
  const addTask = () => {
    if (!newTask.trim() || activeIdx === null) return;
    const item: TodoItem = {
      id: Date.now() + "",
      text: newTask.trim(),
      done: false,
      priority: "normal",
      assignedMins: newMins ? +newMins : undefined,
      studiedSecs: 0,
      createdAt: new Date().toISOString(),
    };
    save(
      lists.map((l, i) =>
        i === safeIdx ? { ...l, items: [...l.items, item] } : l,
      ),
    );
    setNewTask("");
    setNewMins("");
  };

  const toggleDone = (lid: number, tid: string) =>
    save(
      lists.map((l, i) =>
        i === lid
          ? {
              ...l,
              items: l.items.map((t) =>
                t.id === tid
                  ? {
                      ...t,
                      done: !t.done,
                      doneAt: !t.done ? new Date().toISOString() : undefined,
                    }
                  : t,
              ),
            }
          : l,
      ),
    );

  const confirmDelete = (lid: number, tid: string) => {
    const task = lists[lid]?.items.find((t) => t.id === tid);
    if (!task) return;
    setDeleteConfirm({ id: tid, text: task.text, listIdx: lid });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    const { id, listIdx } = deleteConfirm;
    if (timerState?.taskId === id) {
      localStorage.removeItem(TIMER_KEY);
      setTimerState(null);
      window.dispatchEvent(new Event("sv_timer_stopped"));
    }
    const updatedLists = lists.map((l, li) =>
      li === listIdx ? { ...l, items: l.items.filter((t) => t.id !== id) } : l,
    );
    const safe = updatedLists.length
      ? updatedLists
      : [{ ...FRESH_LIST, id: Date.now() + "" }];
    setLists(safe);
    lsSet("sv_todo_lists", safe);
    scheduleSync(safe);
    setDeleteConfirm(null);
    window.dispatchEvent(new Event("sv_update"));
  };

  const reorderItems = (newItems: TodoItem[]) =>
    save(lists.map((l, i) => (i === safeIdx ? { ...l, items: newItems } : l)));
  const drag = useDrag(lists[safeIdx]?.items ?? [], reorderItems);

  const addList = () => {
    if (!newListName.trim()) return;
    const nl: TodoList = {
      id: Date.now() + "",
      name: newListName.trim(),
      color: COLORS[lists.length % COLORS.length],
      items: [],
    };
    save([...lists, nl]);
    setNewListName("");
    setAddingList(false);
  };

  const requestDeleteList = (idx: number) => {
    setDeleteListConfirm({ idx, name: lists[idx].name });
  };

  const executeDeleteList = () => {
    if (!deleteListConfirm) return;
    const { idx } = deleteListConfirm;
    if (timerState?.listIdx === idx) {
      localStorage.removeItem(TIMER_KEY);
      setTimerState(null);
      window.dispatchEvent(new Event("sv_timer_stopped"));
    }
    const next = lists.filter((_, i) => i !== idx);
    const safe = next.length
      ? next
      : [{ id: Date.now() + "", name: "General", color: "#8b5cf6", items: [] }];
    setLists(safe);
    lsSet("sv_todo_lists", safe);
    scheduleSync(safe);
    if (activeIdx === idx) navToList(null);
    else if (activeIdx !== null && activeIdx > idx) setActiveIdx(activeIdx - 1);
    setDeleteListConfirm(null);
    window.dispatchEvent(new Event("sv_update"));
  };

  const saveListName = (idx: number) => {
    if (!editingListName.trim()) {
      setEditingListId(null);
      return;
    }
    save(
      lists.map((l, i) =>
        i === idx ? { ...l, name: editingListName.trim() } : l,
      ),
    );
    setEditingListId(null);
  };

  const list = activeIdx !== null ? lists[activeIdx] : null;
  const lc = list?.color ?? "#8b5cf6";
  const doneCount = list?.items.filter((t) => t.done).length ?? 0;
  const totalCount = list?.items.length ?? 0;
  const studied =
    list?.items.reduce((a, t) => a + (t.studiedSecs || 0), 0) ?? 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const todayStr = todayKey();

  function groupItems(
    items: TodoItem[],
  ): { label: string; dateKey: string; items: TodoItem[]; isToday: boolean }[] {
    const map: Record<string, TodoItem[]> = {};
    for (const t of items) {
      const dk = itemDateKey(t.createdAt);
      if (!map[dk]) map[dk] = [];
      map[dk].push(t);
    }
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dk, its]) => ({
        label: dateLabel(its[0].createdAt),
        dateKey: dk,
        items: its,
        isToday: dk === todayStr,
      }));
  }

  const activeTasks = list?.items.filter((t) => !t.done) ?? [];
  const doneTasks = list?.items.filter((t) => t.done) ?? [];
  const activeGroups = groupItems(activeTasks);
  const doneGroups = groupItems(doneTasks);

  return (
    <div className="sv-fadein">
      {/* Modals */}
      {timerConflict && (
        <TimerConflictModal
          conflictType={timerConflict}
          onClose={() => setTimerConflict(null)}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirm
          taskText={deleteConfirm.text}
          onConfirm={executeDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      {deleteListConfirm && (
        <DeleteListModal
          listName={deleteListConfirm.name}
          onConfirm={executeDeleteList}
          onCancel={() => setDeleteListConfirm(null)}
        />
      )}

      {autosaveNotice && (
        <div
          style={{
            background: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
            border: "1.5px solid #6ee7b7",
            borderRadius: 16,
            padding: "14px 16px",
            marginBottom: 16,
            boxShadow: "0 2px 16px #10b98118",
            animation: "modalCardIn 0.25s cubic-bezier(.16,1,.3,1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 20, lineHeight: 1.3 }}>🛡️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#065f46",
                  marginBottom: 4,
                }}
              >
                Session recovered — timer paused
              </div>
              {autosaveNotice.secs > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      color: "#059669",
                      letterSpacing: "-0.5px",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtSecs(autosaveNotice.secs)}
                  </span>
                  {autosaveNotice.taskName && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#047857",
                        background: "#a7f3d0",
                        border: "1px solid #6ee7b7",
                        borderRadius: 8,
                        padding: "2px 9px",
                        fontWeight: 700,
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {autosaveNotice.taskName}
                    </span>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 5 }}>
                Tap <strong>▶ Resume</strong> on the task below to continue
              </div>
            </div>
            <button
              onClick={() => setAutosaveNotice(null)}
              style={{
                background: "none",
                border: "none",
                color: "#6ee7b7",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {activeIdx === null && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#111827",
                  letterSpacing: "-0.5px",
                }}
              >
                Subjects
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                {lists.length} list{lists.length !== 1 ? "s" : ""} · tap to open
              </div>
            </div>
            <button
              onClick={() => setAddingList(true)}
              style={{
                padding: "9px 18px",
                borderRadius: 13,
                background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                border: "none",
                color: "white",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "0 4px 16px #8b5cf633",
              }}
            >
              + Add
            </button>
          </div>
          {addingList && (
            <div
              style={{
                background: "white",
                border: "1.5px solid #ede9fe",
                borderRadius: 18,
                padding: "18px 20px",
                marginBottom: 14,
                boxShadow: "0 4px 20px #8b5cf610",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#8b5cf6",
                  letterSpacing: "0.12em",
                  marginBottom: 8,
                }}
              >
                NEW LIST NAME
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addList()}
                  placeholder="e.g. Physics, Mock Tests…"
                  style={{
                    flex: 1,
                    background: "#faf9ff",
                    border: "1.5px solid #ede9fe",
                    borderRadius: 11,
                    padding: "10px 14px",
                    fontSize: 14,
                    color: "#111827",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                  onBlur={(e) => (e.target.style.borderColor = "#ede9fe")}
                />
                <button
                  onClick={addList}
                  style={{
                    padding: "10px 18px",
                    background: "#8b5cf6",
                    border: "none",
                    borderRadius: 11,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setAddingList(false);
                    setNewListName("");
                  }}
                  style={{
                    padding: "10px 14px",
                    background: "none",
                    border: "1px solid #e5e7eb",
                    borderRadius: 11,
                    fontSize: 14,
                    color: "#9ca3af",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lists.map((l, i) => {
              const dn = l.items.filter((t) => t.done).length;
              const tot = l.items.length;
              const p = tot > 0 ? Math.round((dn / tot) * 100) : 0;
              const st = l.items.reduce((a, t) => a + (t.studiedSecs || 0), 0);
              const isEditing = editingListId === l.id;
              const hasRunning = timerState?.listIdx === i;
              return (
                <div
                  key={l.id}
                  style={{
                    background: "white",
                    border: `1.5px solid ${isEditing ? l.color + "55" : "#f3f4f6"}`,
                    borderRadius: 20,
                    overflow: "hidden",
                    boxShadow: "0 2px 12px #00000008",
                    cursor: isEditing ? "default" : "pointer",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onClick={() => !isEditing && navToList(i)}
                  onMouseEnter={(e) => {
                    if (!isEditing) {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        l.color + "66";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        `0 4px 20px ${l.color}12`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isEditing) {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#f3f4f6";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 2px 12px #00000008";
                    }
                  }}
                >
                  <div
                    style={{
                      height: 4,
                      background: `linear-gradient(90deg,${l.color},${l.color}66)`,
                    }}
                  />
                  <div style={{ padding: "15px 18px 18px" }}>
                    {isEditing ? (
                      <div
                        style={{ display: "flex", gap: 8 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveListName(i);
                            if (e.key === "Escape") setEditingListId(null);
                          }}
                          style={{
                            flex: 1,
                            background: "#faf9ff",
                            border: `1.5px solid ${l.color}66`,
                            borderRadius: 10,
                            padding: "8px 12px",
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#111827",
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => saveListName(i)}
                          style={{
                            padding: "8px 14px",
                            background: l.color,
                            border: "none",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            color: "white",
                            cursor: "pointer",
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingListId(null)}
                          style={{
                            padding: "8px 12px",
                            background: "none",
                            border: "1px solid #e5e7eb",
                            borderRadius: 10,
                            fontSize: 13,
                            color: "#9ca3af",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 15,
                                fontWeight: 800,
                                color: "#111827",
                              }}
                            >
                              {l.name}
                            </span>
                            {hasRunning && (
                              <span
                                className="sv-pulse"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: l.color,
                                  background: l.color + "18",
                                  border: `1px solid ${l.color}33`,
                                  padding: "2px 8px",
                                  borderRadius: 99,
                                }}
                              >
                                ● RUNNING
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              fontSize: 12,
                              color: "#9ca3af",
                            }}
                          >
                            <span>
                              {dn}/{tot} done
                            </span>
                            {st > 0 && <span>· {fmtHrs(st)} studied</span>}
                          </div>
                          {tot > 0 && (
                            <div
                              style={{
                                height: 4,
                                background: "#f3f4f6",
                                borderRadius: 99,
                                marginTop: 8,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${p}%`,
                                  background: `linear-gradient(90deg,${l.color},${l.color}88)`,
                                  borderRadius: 99,
                                  transition: "width 0.4s",
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: p === 100 ? "#22c55e" : l.color,
                            flexShrink: 0,
                          }}
                        >
                          {p}%
                        </div>
                        <div
                          style={{ display: "flex", gap: 6, flexShrink: 0 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              setEditingListId(l.id);
                              setEditingListName(l.name);
                            }}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              color: "#9ca3af",
                              cursor: "pointer",
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = l.color + "18";
                              (
                                e.currentTarget as HTMLElement
                              ).style.borderColor = l.color + "55";
                              (e.currentTarget as HTMLElement).style.color =
                                l.color;
                            }}
                            onMouseLeave={(e) => {
                              (
                                e.currentTarget as HTMLElement
                              ).style.background = "#f9fafb";
                              (
                                e.currentTarget as HTMLElement
                              ).style.borderColor = "#e5e7eb";
                              (e.currentTarget as HTMLElement).style.color =
                                "#9ca3af";
                            }}
                          >
                            ✏
                          </button>
                          <button
                            onClick={() => requestDeleteList(i)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              color: "#ef4444",
                              cursor: "pointer",
                              fontSize: 13,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                        <div
                          style={{
                            color: "#d1d5db",
                            fontSize: 20,
                            flexShrink: 0,
                          }}
                        >
                          ›
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!lists.length && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
                <div
                  style={{ fontWeight: 700, color: "#6b7280", fontSize: 15 }}
                >
                  No lists yet
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeIdx !== null && list && (
        <div>
          <button
          className="sv-hide-xs"
            onClick={() => navToList(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px 6px 8px",
              borderRadius: 11,
              background: "none",
              border: "1.5px solid #e5e7eb",
              color: "#6b7280",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 18,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = lc + "0e";
              (e.currentTarget as HTMLElement).style.borderColor = lc + "55";
              (e.currentTarget as HTMLElement).style.color = lc;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
              (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb";
              (e.currentTarget as HTMLElement).style.color = "#6b7280";
            }}
          >
            ‹ All Lists
          </button>
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: "18px 22px",
              marginBottom: 18,
              border: "1.5px solid #f3f4f6",
              boxShadow: "0 2px 12px #00000008",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  background: lc + "18",
                  border: `2px solid ${lc}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: lc,
                    boxShadow: `0 0 8px ${lc}66`,
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 21,
                    fontWeight: 800,
                    color: "#111827",
                    letterSpacing: "-0.3px",
                  }}
                >
                  {list.name}
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  {doneCount}/{totalCount} done · {fmtHrs(studied)} studied
                </div>
              </div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: pct === 100 ? "#22c55e" : lc,
                }}
              >
                {pct}%
              </div>
            </div>
            {totalCount > 0 && (
              <div
                style={{
                  height: 5,
                  background: "#f3f4f6",
                  borderRadius: 99,
                  marginTop: 14,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: `linear-gradient(90deg,${lc},${lc}99)`,
                    borderRadius: 99,
                    transition: "width 0.5s ease",
                    boxShadow: `0 0 8px ${lc}44`,
                  }}
                />
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a task… (Enter)"
              style={{
                flex: 1,
                minWidth: 0,
                background: "white",
                border: "1.5px solid #e5e7eb",
                borderRadius: 13,
                padding: "11px 14px",
                color: "#111827",
                fontSize: 13,
                outline: "none",
                transition: "border-color 0.2s",
                boxShadow: "0 1px 4px #00000008",
              }}
              onFocus={(e) => (e.target.style.borderColor = lc)}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
            <input
              value={newMins}
              onChange={(e) => setNewMins(e.target.value)}
              placeholder="min"
              type="number"
              min={1}
              style={{
                width: 58,
                background: "white",
                border: "1.5px solid #e5e7eb",
                borderRadius: 13,
                padding: "11px 8px",
                color: "#111827",
                fontSize: 13,
                outline: "none",
                textAlign: "center",
              }}
            />
            <button
              onClick={addTask}
              style={{
                width: 44,
                background: lc,
                border: "none",
                borderRadius: 13,
                color: "white",
                fontWeight: 800,
                fontSize: 20,
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: `0 4px 14px ${lc}44`,
              }}
            >
              +
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {(["all", "active", "done"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: filter === f ? lc : "#f3f4f6",
                  border: "none",
                  color: filter === f ? "white" : "#6b7280",
                  transition: "all 0.15s",
                }}
              >
                {f === "all"
                  ? `All (${totalCount})`
                  : f === "active"
                    ? `Active (${activeTasks.length})`
                    : `Done (${doneTasks.length})`}
              </button>
            ))}
          </div>
          {totalCount === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>✦</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                No tasks — add one above
              </div>
            </div>
          )}
          {(filter === "all" || filter === "active") &&
            activeGroups.map((group) => (
              <div key={group.dateKey} style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: group.isToday ? lc : "#9ca3af",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {group.label.toUpperCase()}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      background: group.isToday ? lc + "33" : "#f3f4f6",
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {group.items.length} task
                    {group.items.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 7 }}
                >
                  {group.items.map((task) => {
                    const realIdx = (list?.items ?? []).indexOf(task);
                    const hasTimer = timerState?.taskId === task.id;
                    const isPaused = hasTimer && !!timerState?.pausedAt;
                    const isRunning = hasTimer && !isPaused;
                    const liveElapsed = hasTimer ? getLiveElapsed() : 0;
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        lc={lc}
                        isRunning={isRunning}
                        isPaused={isPaused}
                        liveElapsed={liveElapsed}
                        isOverdue={group.isToday && !task.done}
                        isDragging={drag.dragging === realIdx}
                        isOver={
                          drag.over === realIdx && drag.dragging !== realIdx
                        }
                        onToggle={() => toggleDone(safeIdx, task.id)}
                        onStartTimer={() =>
                          startTimerAndFullscreen(task.id, safeIdx)
                        }
                        onDelete={() => confirmDelete(safeIdx, task.id)}
                        onDragStart={() => drag.onDragStart(realIdx)}
                        onDragEnter={() => drag.onDragEnter(realIdx)}
                        onDragEnd={drag.onDragEnd}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          {filter === "active" &&
            activeTasks.length === 0 &&
            totalCount > 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 0",
                  color: "#9ca3af",
                  fontSize: 13,
                }}
              >
                All tasks are done 🎉
              </div>
            )}
          {(filter === "all" || filter === "done") && doneTasks.length > 0 && (
            <div style={{ marginTop: filter === "all" ? 8 : 0 }}>
              {filter === "all" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#22c55e",
                      letterSpacing: "0.08em",
                    }}
                  >
                    COMPLETED
                  </div>
                  <div style={{ flex: 1, height: 1, background: "#dcfce7" }} />
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {doneTasks.length}
                  </div>
                </div>
              )}
              {doneGroups.map((group) => (
                <div key={group.dateKey} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#9ca3af",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {group.label.toUpperCase()}
                    </div>
                    <div
                      style={{ flex: 1, height: 1, background: "#f3f4f6" }}
                    />
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {group.items.map((task) => {
                      const realIdx = (list?.items ?? []).indexOf(task);
                      return (
                        <TaskRow
                          key={task.id}
                          task={task}
                          lc={lc}
                          isRunning={false}
                          isPaused={false}
                          liveElapsed={0}
                          isOverdue={false}
                          isDragging={drag.dragging === realIdx}
                          isOver={
                            drag.over === realIdx && drag.dragging !== realIdx
                          }
                          onToggle={() => toggleDone(safeIdx, task.id)}
                          onStartTimer={() => {}}
                          onDelete={() => confirmDelete(safeIdx, task.id)}
                          onDragStart={() => drag.onDragStart(realIdx)}
                          onDragEnter={() => drag.onDragEnter(realIdx)}
                          onDragEnd={drag.onDragEnd}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {filter === "done" && doneTasks.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              Nothing completed yet
            </div>
          )}
        </div>
      )}
      <style>{`.sv-pulse{animation:svListPulse 2s ease infinite}@keyframes svListPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
