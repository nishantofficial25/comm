"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { API, authFetch, fmtSecs, fmtHrs, lsGet, lsSet, COLORS } from "../lib/utils";
import { TodoList, TodoItem } from "../lib/utils";
import { FullscreenTimerState } from "./FullscreenStopwatch";

const TIMER_KEY = "sv_running_timer";

interface PersistedTimer {
  taskId: string;
  listIdx: number;
  savedSecs: number;
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

let syncDebounce: ReturnType<typeof setTimeout> | null = null;
function scheduleSync(lists: TodoList[]) {
  if (syncDebounce) clearTimeout(syncDebounce);
  syncDebounce = setTimeout(() => {
    authFetch(`${API}/api/void/study/sync`, { method: "POST", body: JSON.stringify({ todoLists: lists }) }).catch(() => {});
  }, 1500);
}

const FRESH_LIST: TodoList = { id: "default", name: "General", color: "#8b5cf6", items: [] };

// Today's date key  yyyy-mm-dd
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0,0,0,0);
  const t     = new Date(d); t.setHours(0,0,0,0);
  const diff  = Math.round((today.getTime() - t.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)  return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: diff > 365 ? "numeric" : undefined });
}
function itemDateKey(iso: string) { return iso.slice(0, 10); }

/* ── Delete confirmation ────────────────────────────────────────────────── */
function DeleteConfirm({ taskText, onConfirm, onCancel }: { taskText: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 22, padding: "30px 28px 24px", maxWidth: 360, width: "100%", boxShadow: "0 24px 60px #00000028", animation: "dcPop 0.18s cubic-bezier(.16,1,.3,1)", border: "1px solid #ede9fe" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "#fef2f2", border: "1.5px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 18px" }}>🗑</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", textAlign: "center", marginBottom: 10 }}>Delete this task?</div>
        <div style={{ fontSize: 13, color: "#6b7280", textAlign: "center", lineHeight: 1.6, marginBottom: 26 }}>
          "<span style={{ fontWeight: 700, color: "#374151" }}>{taskText}</span>"<br />will be removed and its study time deducted.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", borderRadius: 13, border: "1.5px solid #e5e7eb", background: "white", fontSize: 14, fontWeight: 700, color: "#6b7280", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", borderRadius: 13, border: "none", background: "linear-gradient(135deg,#dc2626,#ef4444)", color: "white", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Delete</button>
        </div>
      </div>
      <style>{`@keyframes dcPop { from{opacity:0;transform:scale(.93)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

/* ── Drag-to-reorder hook ───────────────────────────────────────────────── */
function useDrag(items: TodoItem[], onReorder: (items: TodoItem[]) => void) {
  const dragIdx  = useRef<number | null>(null);
  const overIdx  = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over,     setOver]     = useState<number | null>(null);

  const onDragStart = (i: number) => { dragIdx.current = i; setDragging(i); };
  const onDragEnter = (i: number) => { overIdx.current  = i; setOver(i); };
  const onDragEnd   = () => {
    if (dragIdx.current !== null && overIdx.current !== null && dragIdx.current !== overIdx.current) {
      const next = [...items];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(overIdx.current, 0, moved);
      onReorder(next);
    }
    dragIdx.current = null; overIdx.current = null;
    setDragging(null); setOver(null);
  };

  return { dragging, over, onDragStart, onDragEnter, onDragEnd };
}

/* ── Task row ───────────────────────────────────────────────────────────── */
interface TaskRowProps {
  task: TodoItem;
  lc: string;
  isRunning: boolean;
  liveElapsed: number;
  isOverdue: boolean; // created today, not done
  isDragging: boolean;
  isOver: boolean;
  onToggle: () => void;
  onStartTimer: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

function TaskRow({ task, lc, isRunning, liveElapsed, isOverdue, isDragging, isOver, onToggle, onStartTimer, onDelete, onDragStart, onDragEnter, onDragEnd }: TaskRowProps) {
  const displaySecs  = isRunning ? liveElapsed : (task.studiedSecs || 0);
  const assignedSecs = (task.assignedMins || 0) * 60;
  const studPct      = assignedSecs > 0 ? Math.min((displaySecs / assignedSecs) * 100, 100) : 0;
  const hasStudied   = (task.studiedSecs || 0) > 0;

  return (
    <div
      draggable
      onDragStart={onDragStart} onDragEnter={onDragEnter} onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        background: isRunning ? lc + "0a" : "white",
        border: `1.5px solid ${
          isOverdue ? "#fca5a5" :
          isRunning ? lc + "55" :
          task.done  ? "#f3f4f6" : "#e5e7eb"
        }`,
        borderRadius: 15,
        opacity: isDragging ? 0.4 : task.done ? 0.58 : 1,
        position: "relative", overflow: "hidden",
        boxShadow: isOver ? `0 0 0 2px ${lc}` : isRunning ? `0 0 18px ${lc}18` : "0 1px 4px #00000008",
        transition: "all 0.15s", cursor: "grab",
        transform: isOver && !isDragging ? "scale(1.01)" : "scale(1)",
      }}>
      {/* Study progress underline */}
      {displaySecs > 0 && assignedSecs > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, width: `${studPct}%`, background: lc + "88", borderRadius: 99, transition: "width 0.6s ease" }} />
      )}

      {/* Drag handle */}
      <div style={{ color: "#d1d5db", fontSize: 14, cursor: "grab", flexShrink: 0, padding: "0 2px" }}>⠿</div>

      {/* Checkbox */}
      <button onClick={onToggle}
        style={{ width: 21, height: 21, borderRadius: 7, flexShrink: 0, cursor: "pointer", background: task.done ? lc : "white", border: `2px solid ${task.done ? lc : "#d1d5db"}`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, transition: "all 0.2s" }}>
        {task.done ? "✓" : ""}
      </button>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: task.done ? "#9ca3af" : "#111827", textDecoration: task.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {task.text}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
          {task.assignedMins && <span style={{ fontSize: 10, color: lc, fontWeight: 700 }}>{task.assignedMins}m target</span>}
          {displaySecs > 0 && <span style={{ fontSize: 10, color: "#9ca3af" }}>· {fmtSecs(displaySecs)}</span>}
          {isRunning && <span style={{ fontSize: 10, color: lc, fontWeight: 800, animation: "svListPulse 2s ease infinite" }}>● LIVE</span>}
          {isOverdue && !task.done && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>overdue</span>}
        </div>
      </div>

      {/* Timer button */}
      {!task.done && (
        <button onClick={onStartTimer}
          style={{ padding: "5px 12px", borderRadius: 9, fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, background: isRunning ? lc : lc + "16", border: `1.5px solid ${lc}44`, color: isRunning ? "white" : lc, transition: "all 0.2s" }}>
          {isRunning ? "⛶ Open" : hasStudied ? "↩ Resume" : "▶ Start"}
        </button>
      )}

      {/* Delete */}
      <button onClick={onDelete}
        style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", fontSize: 15, padding: "0 3px", flexShrink: 0, transition: "color 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
        onMouseLeave={e => (e.currentTarget.style.color = "#d1d5db")}>✕</button>
    </div>
  );
}

/* ════════════════════════════════════════ MAIN ════════════════════════════ */
export default function TodoTab({ onStartFullscreen, onStudyTime, onRemoveStudyTime, initialLists, externalListIdx, onListNavChange }: Props) {
  const [lists, setLists]               = useState<TodoList[]>(() => initialLists ?? lsGet("sv_todo_lists", [{ ...FRESH_LIST }]));
  const [activeIdx, setActiveIdx]       = useState<number | null>(null);
  const [newTask, setNewTask]           = useState("");
  const [newMins, setNewMins]           = useState("");
  const [addingList, setAddingList]     = useState(false);
  const [newListName, setNewListName]   = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; text: string; listIdx: number } | null>(null);
  const [filter, setFilter]               = useState<"all" | "active" | "done">("all");
  const [, setTick]                     = useState(0);
  const ivRef                           = useRef<ReturnType<typeof setInterval>>();
  const [timerState, setTimerState]     = useState<PersistedTimer | null>(null);

  // ── Sync external list idx (from URL hash / back button) ──
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

  const navToList = (idx: number | null) => { setActiveIdx(idx); onListNavChange?.(idx); };

  // ── Init ──
  useEffect(() => {
    if (initialLists?.length) { setLists(initialLists); lsSet("sv_todo_lists", initialLists); }
  }, []); // eslint-disable-line

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (!raw) return;
      const t: PersistedTimer = JSON.parse(raw);
      const curLists = lsGet<TodoList[]>("sv_todo_lists", []);
      if (!curLists[t.listIdx]?.items.some(i => i.id === t.taskId)) { localStorage.removeItem(TIMER_KEY); return; }
      setTimerState(t);
      setActiveIdx(t.listIdx);
    } catch { localStorage.removeItem(TIMER_KEY); }
  }, []);

  useEffect(() => {
    if (timerState) ivRef.current = setInterval(() => setTick(x => x + 1), 1000);
    else clearInterval(ivRef.current);
    return () => clearInterval(ivRef.current);
  }, [timerState?.taskId]); // eslint-disable-line

  useEffect(() => {
    const h = () => setLists(lsGet<TodoList[]>("sv_todo_lists", []));
    window.addEventListener("sv_update", h);
    return () => window.removeEventListener("sv_update", h);
  }, []);

  useEffect(() => {
    const h = () => {
      if (!localStorage.getItem(TIMER_KEY)) { setTimerState(null); setLists(lsGet<TodoList[]>("sv_todo_lists", [])); }
    };
    window.addEventListener("sv_timer_stopped", h);
    return () => window.removeEventListener("sv_timer_stopped", h);
  }, []);

  // ── Save ──
  const save = useCallback((data: TodoList[]) => {
    const safe = data.length ? data : [{ ...FRESH_LIST, id: Date.now() + "" }];
    setLists(safe); lsSet("sv_todo_lists", safe); scheduleSync(safe);
  }, []);

  // ── Live elapsed ──
  function getLiveElapsed(): number {
    if (!timerState) return 0;
    const { savedSecs, sessionStart, totalPausedMs = 0, pausedAt } = timerState;
    const pauseOffset = pausedAt ? (Date.now() - pausedAt) : 0;
    return savedSecs + Math.max(0, Math.floor((Date.now() - sessionStart - totalPausedMs - pauseOffset) / 1000));
  }

  // ── Start timer ──
  function startTimerAndFullscreen(taskId: string, listIdx: number) {
    const curLists = lsGet<TodoList[]>("sv_todo_lists", []);
    const task = curLists[listIdx]?.items.find(t => t.id === taskId);
    if (!task) return;

    let persisted: PersistedTimer;
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) {
        const prev: PersistedTimer = JSON.parse(raw);
        persisted = prev.taskId === taskId ? prev : { taskId, listIdx, savedSecs: task.studiedSecs || 0, sessionStart: Date.now(), totalPausedMs: 0 };
      } else {
        persisted = { taskId, listIdx, savedSecs: task.studiedSecs || 0, sessionStart: Date.now(), totalPausedMs: 0 };
      }
    } catch {
      persisted = { taskId, listIdx, savedSecs: task.studiedSecs || 0, sessionStart: Date.now(), totalPausedMs: 0 };
    }

    localStorage.setItem(TIMER_KEY, JSON.stringify(persisted));
    setTimerState(persisted);

    onStartFullscreen({
      taskId, listIdx, taskName: task.text,
      listColor: lists[listIdx]?.color ?? "#8b5cf6",
      startTime: persisted.sessionStart,
      initialSecs: (task.assignedMins || 0) * 60,
      resumeSecs: persisted.savedSecs,
      sessionStart: persisted.sessionStart,
      pausedAt: persisted.pausedAt,
      totalPausedMs: persisted.totalPausedMs ?? 0,
    });
  }

  // ── Task CRUD ──
  const safeIdx = activeIdx !== null && lists[activeIdx] ? activeIdx : 0;

  const addTask = () => {
    if (!newTask.trim() || activeIdx === null) return;
    const item: TodoItem = {
      id: Date.now() + "", text: newTask.trim(), done: false, priority: "normal",
      assignedMins: newMins ? +newMins : undefined, studiedSecs: 0,
      createdAt: new Date().toISOString(),
    };
    save(lists.map((l, i) => i === safeIdx ? { ...l, items: [...l.items, item] } : l));
    setNewTask(""); setNewMins("");
  };

  const toggleDone = (lid: number, tid: string) =>
    save(lists.map((l, i) => i === lid ? { ...l, items: l.items.map(t => t.id === tid ? { ...t, done: !t.done, doneAt: !t.done ? new Date().toISOString() : undefined } : t) } : l));

  const confirmDelete = (lid: number, tid: string) => {
    const task = lists[lid]?.items.find(t => t.id === tid);
    if (task) setDeleteConfirm({ id: tid, text: task.text, listIdx: lid });
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    const { id, listIdx } = deleteConfirm;
    const task = lists[listIdx]?.items.find(t => t.id === id);
    const taskSecs = task?.studiedSecs || 0;
    if (timerState?.taskId === id) { localStorage.removeItem(TIMER_KEY); setTimerState(null); }
    save(lists.map((l, li) => li === listIdx ? { ...l, items: l.items.filter(t => t.id !== id) } : l));
    if (taskSecs > 0) onRemoveStudyTime(taskSecs);
    setDeleteConfirm(null);
  };

  // ── Drag reorder ──
  const reorderItems = (newItems: TodoItem[]) => {
    save(lists.map((l, i) => i === safeIdx ? { ...l, items: newItems } : l));
  };

  const drag = useDrag(lists[safeIdx]?.items ?? [], reorderItems);

  // ── List CRUD ──
  const addList = () => {
    if (!newListName.trim()) return;
    const nl: TodoList = { id: Date.now() + "", name: newListName.trim(), color: COLORS[lists.length % COLORS.length], items: [] };
    save([...lists, nl]);
    setNewListName(""); setAddingList(false);
  };

  const deleteList = (idx: number) => {
    if (!confirm(`Delete "${lists[idx].name}" and all its tasks?`)) return;
    if (timerState?.listIdx === idx) { localStorage.removeItem(TIMER_KEY); setTimerState(null); }
    const next = lists.filter((_, i) => i !== idx);
    save(next.length ? next : [{ id: Date.now() + "", name: "General", color: "#8b5cf6", items: [] }]);
    if (activeIdx === idx) navToList(null);
    else if (activeIdx !== null && activeIdx > idx) setActiveIdx(activeIdx - 1);
  };

  const saveListName = (idx: number) => {
    if (!editingListName.trim()) { setEditingListId(null); return; }
    save(lists.map((l, i) => i === idx ? { ...l, name: editingListName.trim() } : l));
    setEditingListId(null);
  };

  // ── Derived ──
  const list       = activeIdx !== null ? lists[activeIdx] : null;
  const lc         = list?.color ?? "#8b5cf6";
  const doneCount  = list?.items.filter(t => t.done).length ?? 0;
  const totalCount = list?.items.length ?? 0;
  const studied    = list?.items.reduce((a, t) => a + (t.studiedSecs || 0), 0) ?? 0;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const todayStr   = todayKey();

  // ── Group tasks by date ──
  function groupItems(items: TodoItem[]): { label: string; dateKey: string; items: TodoItem[]; isToday: boolean }[] {
    const map: Record<string, TodoItem[]> = {};
    for (const t of items) {
      const dk = itemDateKey(t.createdAt);
      if (!map[dk]) map[dk] = [];
      map[dk].push(t);
    }
    // Sort dates desc (today first)
    return Object.entries(map)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dk, its]) => ({ label: dateLabel(its[0].createdAt), dateKey: dk, items: its, isToday: dk === todayStr }));
  }

  const activeTasks = list?.items.filter(t => !t.done) ?? [];
  const doneTasks   = list?.items.filter(t => t.done) ?? [];

  const activeGroups = groupItems(activeTasks);
  const doneGroups   = groupItems(doneTasks);

  /* ── RENDER ── */
  return (
    <div className="sv-fadein">
      {deleteConfirm && <DeleteConfirm taskText={deleteConfirm.text} onConfirm={executeDelete} onCancel={() => setDeleteConfirm(null)} />}

      {/* ════ LIST OVERVIEW ════ */}
      {activeIdx === null && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>My Lists</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{lists.length} list{lists.length !== 1 ? "s" : ""} · tap to open</div>
            </div>
            <button onClick={() => setAddingList(true)} style={{ padding: "9px 18px", borderRadius: 13, background: "linear-gradient(135deg,#7c3aed,#8b5cf6)", border: "none", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px #8b5cf633" }}>+ New List</button>
          </div>

          {addingList && (
            <div style={{ background: "white", border: "1.5px solid #ede9fe", borderRadius: 18, padding: "18px 20px", marginBottom: 14, boxShadow: "0 4px 20px #8b5cf610" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#8b5cf6", letterSpacing: "0.12em", marginBottom: 8 }}>NEW LIST NAME</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input autoFocus value={newListName} onChange={e => setNewListName(e.target.value)} onKeyDown={e => e.key === "Enter" && addList()} placeholder="e.g. Physics, Mock Tests…"
                  style={{ flex: 1, background: "#faf9ff", border: "1.5px solid #ede9fe", borderRadius: 11, padding: "10px 14px", fontSize: 14, color: "#111827", outline: "none" }}
                  onFocus={e => (e.target.style.borderColor = "#8b5cf6")} onBlur={e => (e.target.style.borderColor = "#ede9fe")} />
                <button onClick={addList} style={{ padding: "10px 18px", background: "#8b5cf6", border: "none", borderRadius: 11, fontWeight: 700, fontSize: 14, color: "white", cursor: "pointer" }}>Add</button>
                <button onClick={() => { setAddingList(false); setNewListName(""); }} style={{ padding: "10px 14px", background: "none", border: "1px solid #e5e7eb", borderRadius: 11, fontSize: 14, color: "#9ca3af", cursor: "pointer" }}>✕</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lists.map((l, i) => {
              const dn = l.items.filter(t => t.done).length;
              const tot = l.items.length;
              const p = tot > 0 ? Math.round((dn / tot) * 100) : 0;
              const st = l.items.reduce((a, t) => a + (t.studiedSecs || 0), 0);
              const isEditing = editingListId === l.id;
              const hasRunning = timerState?.listIdx === i;

              return (
                <div key={l.id}
                  style={{ background: "white", border: `1.5px solid ${isEditing ? l.color + "55" : "#f3f4f6"}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px #00000008", cursor: isEditing ? "default" : "pointer", transition: "border-color 0.2s, box-shadow 0.2s" }}
                  onClick={() => !isEditing && navToList(i)}
                  onMouseEnter={e => { if (!isEditing) { (e.currentTarget as HTMLElement).style.borderColor = l.color + "66"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${l.color}12`; }}}
                  onMouseLeave={e => { if (!isEditing) { (e.currentTarget as HTMLElement).style.borderColor = "#f3f4f6"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px #00000008"; }}}>
                  <div style={{ height: 4, background: `linear-gradient(90deg,${l.color},${l.color}66)` }} />
                  <div style={{ padding: "15px 18px 18px" }}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                        <input autoFocus value={editingListName} onChange={e => setEditingListName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveListName(i); if (e.key === "Escape") setEditingListId(null); }}
                          style={{ flex: 1, background: "#faf9ff", border: `1.5px solid ${l.color}66`, borderRadius: 10, padding: "8px 12px", fontSize: 15, fontWeight: 700, color: "#111827", outline: "none" }} />
                        <button onClick={() => saveListName(i)} style={{ padding: "8px 14px", background: l.color, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer" }}>✓</button>
                        <button onClick={() => setEditingListId(null)} style={{ padding: "8px 12px", background: "none", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13, color: "#9ca3af", cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 13, background: l.color + "18", border: `1.5px solid ${l.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", background: l.color, boxShadow: `0 0 8px ${l.color}66` }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{l.name}</span>
                            {hasRunning && <span className="sv-pulse" style={{ fontSize: 10, fontWeight: 800, color: l.color, background: l.color + "18", border: `1px solid ${l.color}33`, padding: "2px 8px", borderRadius: 99 }}>● RUNNING</span>}
                          </div>
                          <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#9ca3af" }}>
                            <span>{dn}/{tot} done</span>{st > 0 && <span>· {fmtHrs(st)} studied</span>}
                          </div>
                          {tot > 0 && <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99, marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${p}%`, background: `linear-gradient(90deg,${l.color},${l.color}88)`, borderRadius: 99, transition: "width 0.4s" }} /></div>}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: p === 100 ? "#22c55e" : l.color, flexShrink: 0 }}>{p}%</div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditingListId(l.id); setEditingListName(l.name); }}
                            style={{ width: 32, height: 32, borderRadius: 9, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#9ca3af", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = l.color + "18"; (e.currentTarget as HTMLElement).style.borderColor = l.color + "55"; (e.currentTarget as HTMLElement).style.color = l.color; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}>✏</button>
                          <button onClick={() => deleteList(i)} style={{ width: 32, height: 32, borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca", color: "#ef4444", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        </div>
                        <div style={{ color: "#d1d5db", fontSize: 20, flexShrink: 0 }}>›</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {!lists.length && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 700, color: "#6b7280", fontSize: 15 }}>No lists yet</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ TASK VIEW ════ */}
      {activeIdx !== null && list && (
        <div>
          {/* Back */}
          <button onClick={() => navToList(null)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px 6px 8px", borderRadius: 11, background: "none", border: "1.5px solid #e5e7eb", color: "#6b7280", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 18, transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = lc + "0e"; (e.currentTarget as HTMLElement).style.borderColor = lc + "55"; (e.currentTarget as HTMLElement).style.color = lc; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.color = "#6b7280"; }}>
            ‹ All Lists
          </button>

          {/* Header */}
          <div style={{ background: "white", borderRadius: 20, padding: "18px 22px", marginBottom: 18, border: "1.5px solid #f3f4f6", boxShadow: "0 2px 12px #00000008" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: lc + "18", border: `2px solid ${lc}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: lc, boxShadow: `0 0 8px ${lc}66` }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>{list.name}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{doneCount}/{totalCount} done · {fmtHrs(studied)} studied</div>
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: pct === 100 ? "#22c55e" : lc }}>{pct}%</div>
            </div>
            {totalCount > 0 && (
              <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, marginTop: 14, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${lc},${lc}99)`, borderRadius: 99, transition: "width 0.5s ease", boxShadow: `0 0 8px ${lc}44` }} />
              </div>
            )}
          </div>

          {/* Add task */}
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Add a task… (Enter)"
              style={{ flex: 1, minWidth: 0, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 13, padding: "11px 14px", color: "#111827", fontSize: 13, outline: "none", transition: "border-color 0.2s", boxShadow: "0 1px 4px #00000008" }}
              onFocus={e => (e.target.style.borderColor = lc)} onBlur={e => (e.target.style.borderColor = "#e5e7eb")} />
            <input value={newMins} onChange={e => setNewMins(e.target.value)} placeholder="min" type="number" min={1}
              style={{ width: 58, background: "white", border: "1.5px solid #e5e7eb", borderRadius: 13, padding: "11px 8px", color: "#111827", fontSize: 13, outline: "none", textAlign: "center" }} />
            <button onClick={addTask} style={{ width: 44, background: lc, border: "none", borderRadius: 13, color: "white", fontWeight: 800, fontSize: 20, cursor: "pointer", flexShrink: 0, boxShadow: `0 4px 14px ${lc}44` }}>+</button>
          </div>

          {/* ── Filter tabs ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
            {(["all","active","done"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: filter === f ? lc : "#f3f4f6", border: "none",
                color: filter === f ? "white" : "#6b7280", transition: "all 0.15s",
              }}>
                {f === "all" ? `All (${totalCount})` : f === "active" ? `Active (${activeTasks.length})` : `Done (${doneTasks.length})`}
              </button>
            ))}
          </div>

          {/* ── Empty state ── */}
          {totalCount === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0" }}>
              <div style={{ fontSize: 34, marginBottom: 10 }}>✦</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>No tasks — add one above</div>
            </div>
          )}

          {/* ── Active tasks grouped by date (shown in All + Active) ── */}
          {(filter === "all" || filter === "active") && activeGroups.map(group => (
            <div key={group.dateKey} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: group.isToday ? lc : "#9ca3af", letterSpacing: "0.08em" }}>
                  {group.label.toUpperCase()}
                </div>
                <div style={{ flex: 1, height: 1, background: group.isToday ? lc + "33" : "#f3f4f6" }} />
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{group.items.length} task{group.items.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {group.items.map(task => {
                  const realIdx = (list?.items ?? []).indexOf(task);
                  const isRunning   = timerState?.taskId === task.id;
                  const liveElapsed = isRunning ? getLiveElapsed() : 0;
                  const isOverdue   = group.isToday && !task.done;
                  return (
                    <TaskRow key={task.id} task={task} lc={lc}
                      isRunning={isRunning} liveElapsed={liveElapsed} isOverdue={isOverdue}
                      isDragging={drag.dragging === realIdx}
                      isOver={drag.over === realIdx && drag.dragging !== realIdx}
                      onToggle={() => toggleDone(safeIdx, task.id)}
                      onStartTimer={() => startTimerAndFullscreen(task.id, safeIdx)}
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

          {filter === "active" && activeTasks.length === 0 && totalCount > 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>All tasks are done 🎉</div>
          )}

          {/* ── Done tasks grouped by date (shown in All + Done) ── */}
          {(filter === "all" || filter === "done") && doneTasks.length > 0 && (
            <div style={{ marginTop: filter === "all" ? 8 : 0 }}>
              {filter === "all" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#22c55e", letterSpacing: "0.08em" }}>COMPLETED</div>
                  <div style={{ flex: 1, height: 1, background: "#dcfce7" }} />
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{doneTasks.length}</div>
                </div>
              )}
              {doneGroups.map(group => (
                <div key={group.dateKey} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.06em" }}>{group.label.toUpperCase()}</div>
                    <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.items.map(task => {
                      const realIdx = (list?.items ?? []).indexOf(task);
                      return (
                        <TaskRow key={task.id} task={task} lc={lc}
                          isRunning={false} liveElapsed={0} isOverdue={false}
                          isDragging={drag.dragging === realIdx}
                          isOver={drag.over === realIdx && drag.dragging !== realIdx}
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
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>Nothing completed yet</div>
          )}
        </div>
      )}

      <style>{`
        .sv-pulse { animation: svListPulse 2s ease infinite; }
        @keyframes svListPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}