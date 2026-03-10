"use client";
// Shared atoms used across all VoidCommunity sub-components
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

export const API = "https://api.hindanbazar.cloud";

const EMOJIS = [
  "🦊",
  "🐺",
  "🦁",
  "🐯",
  "🦋",
  "🐉",
  "🦅",
  "🦉",
  "🐙",
  "🦈",
  "🦚",
  "🦜",
  "🌙",
  "⚡",
  "🔮",
  "🌊",
  "🔥",
  "❄️",
  "🌿",
  "🪐",
  "⭐",
  "🎭",
  "🧿",
  "🎯",
  "🧬",
  "🌋",
  "🎪",
  "🦾",
  "🗿",
  "🧊",
];
const PALETTE = [
  "#7c3aed",
  "#2563eb",
  "#db2777",
  "#ea580c",
  "#059669",
  "#0891b2",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#4f46e5",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// With Google auth, use uid for avatar; fall back to browserId
export function getAvatarEmoji(id: string) {
  return id ? EMOJIS[hash(id) % EMOJIS.length] : "👤";
}
export function getAvatarColor(id: string) {
  return id ? PALETTE[hash(id) % PALETTE.length] : "#673de6";
}

export function ago(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// useAuth re-export for vc components
export { useAuth };

// Identity — use Google user if available, fallback to browserId
export function useIdentity() {
  const { user } = useAuth();
  const getBid = () => {
    if (typeof window === "undefined") return "";
    const k = "void_bid3";
    let id = localStorage.getItem(k);
    if (!id) {
      id = "b" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(k, id);
    }
    return id;
  };
  const getMyName = () => {
    if (user) return user.displayName;
    if (typeof window === "undefined") return "anonymous";
    const k = "void_my_name";
    let n = localStorage.getItem(k);
    if (!n) {
      const P = [
        "shadow_aspirant",
        "void_walker",
        "silent_prep",
        "masked_student",
        "echo_7291",
        "anon_dreamer",
        "null_pointer",
        "ghost_coder",
        "nameless_one",
        "iron_mind",
        "zen_prep",
        "cipher_9",
      ];
      n = P[Math.floor(Math.random() * P.length)];
      localStorage.setItem(k, n);
    }
    return n;
  };
  // Joined communities: stored in localStorage after joining, keyed by bid
  const getJoinedCommunities = (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const bid = user ? user.uid : getBid();
      const raw = localStorage.getItem(`void_joined_${bid}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  return {
    bid: user ? user.uid : getBid(),
    myName: getMyName(),
    picture: user?.picture || null,
    isLoggedIn: !!user,
    joinedCommunities: getJoinedCommunities(),
  };
}

// Helper to persist joined community list
export function saveJoinedCommunity(
  bid: string,
  slug: string,
  joined: boolean,
) {
  if (typeof window === "undefined") return;
  const k = `void_joined_${bid}`;
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(k) || "[]");
    const updated = joined
      ? [...new Set([...cur, slug])]
      : cur.filter((s) => s !== slug);
    localStorage.setItem(k, JSON.stringify(updated));
  } catch {}
}

export function useToast() {
  const [t, setT] = useState({ msg: "", on: false, err: false });
  const tmr = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((msg: string, err = false) => {
    setT({ msg, on: true, err });
    clearTimeout(tmr.current);
    tmr.current = setTimeout(() => setT((x) => ({ ...x, on: false })), 2800);
  }, []);
  return { ...t, show };
}

export function usePolling<T extends { _id: string }>(
  fetcher: () => Promise<T[]>,
  interval: number,
  enabled: boolean,
): [T[], boolean] {
  const [items, setItems] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const run = useCallback(async () => {
    try {
      const fresh = await fetcher();
      setItems((prev) => {
        if (
          prev.length === fresh.length &&
          prev.every((p, i) => p._id === fresh[i]._id)
        )
          return prev;
        return fresh;
      });
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [fetcher]);
  useEffect(() => {
    if (!enabled) return;
    run();
    timerRef.current = setInterval(run, interval);
    return () => clearInterval(timerRef.current);
  }, [enabled, interval, run]);
  return [items, connected];
}

// ── Atom UI Components ────────────────────────────────────────────────────────
export function Av({
  size,
  id,
  picture,
}: {
  size: number;
  id: string;
  picture?: string | null;
}) {
  if (picture) {
    return (
      <img
        src={picture}
        alt=""
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `1.5px solid ${getAvatarColor(id)}30`,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        background: getAvatarColor(id) + "18",
        border: `1.5px solid ${getAvatarColor(id)}30`,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {getAvatarEmoji(id)}
    </div>
  );
}

export function Badge({
  color,
  children,
}: {
  color: "purple" | "amber" | "green";
  children: React.ReactNode;
}) {
  const s = {
    purple: {
      color: "#673de6",
      background: "#ebe8fc",
      border: "1px solid #673de620",
    },
    amber: {
      color: "#d97706",
      background: "#fef3c7",
      border: "1px solid #d9770625",
    },
    green: {
      color: "#059669",
      background: "#d1fae5",
      border: "1px solid #05966920",
    },
  }[color];
  return (
    <span
      style={{
        ...s,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
        padding: "1px 7px",
        borderRadius: 99,
      }}
    >
      {children}
    </span>
  );
}

export function CatPill({ cat }: { cat: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.04em",
        padding: "2px 8px",
        borderRadius: 99,
        background: "#ebe8fc",
        color: "#673de6",
        border: "1px solid #673de620",
        textTransform: "uppercase",
        display: "none",
      }}
      className="vc-catpill"
    >
      {cat}
    </span>
  );
}

export function TagChip({ tag }: { tag: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "1px 8px",
        borderRadius: 99,
        background: "#f4f4f8",
        color: "#a0a0bc",
        border: "1px solid #e2e2ef",
      }}
    >
      #{tag}
    </span>
  );
}

export function Toast({ msg, err }: { msg: string; err: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "9px 20px",
        borderRadius: 99,
        fontSize: 13,
        fontWeight: 700,
        zIndex: 9999,
        background: err ? "#dc2626" : "#1a1a2e",
        color: "white",
        whiteSpace: "nowrap",
        boxShadow: "0 8px 32px #00000044",
      }}
      className="vc-toastin"
    >
      {msg}
    </div>
  );
}

export function SkelCard({ tall }: { tall?: boolean }) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e2ef",
        borderRadius: 18,
        padding: 16,
        marginBottom: 8,
        boxShadow: "0 1px 4px #00000006",
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div
          style={{ width: 32, height: 32, borderRadius: "50%" }}
          className="vc-skel"
        />
        <div style={{ flex: 1 }}>
          <div
            style={{ height: 12, width: 96, borderRadius: 99, marginBottom: 8 }}
            className="vc-skel"
          />
          <div
            style={{ height: 10, width: 56, borderRadius: 99 }}
            className="vc-skel"
          />
        </div>
      </div>
      <div
        style={{ height: 16, width: "60%", borderRadius: 99, marginBottom: 8 }}
        className="vc-skel"
      />
      {tall && (
        <>
          <div
            style={{
              height: 12,
              width: "100%",
              borderRadius: 99,
              marginBottom: 6,
            }}
            className="vc-skel"
          />
          <div
            style={{ height: 12, width: "80%", borderRadius: 99 }}
            className="vc-skel"
          />
        </>
      )}
    </div>
  );
}

export function Empty({
  icon,
  title,
  sub,
}: {
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "64px 0",
        background: "white",
        border: "1px dashed #e2e2ef",
        borderRadius: 18,
        boxShadow: "0 1px 4px #00000006",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 900,
          marginBottom: 8,
          color: "#6b6b8a",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: "#a0a0bc" }}>{sub}</div>
    </div>
  );
}

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function VoteRow({
  voted,
  count,
  onVote,
  small,
}: {
  voted: boolean;
  count: number;
  onVote: () => void;
  small?: boolean;
}) {
  const sz = small ? "w-7 h-7" : "w-8 h-8";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: "#ebe8fc",
        borderRadius: 99,
        padding: "0 4px",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onVote();
        }}
        style={{
          width: small ? 28 : 32,
          height: small ? 28 : 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          cursor: "pointer",
          background: "none",
          border: "none",
          color: voted ? "#673de6" : "#6b6b8a",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#673de620")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1.5L9.5 8.5H0.5L5 1.5Z"
            fill={voted ? "#673de6" : "none"}
            stroke={voted ? "#673de6" : "currentColor"}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span
        style={{
          fontSize: small ? 11 : 13,
          fontWeight: 800,
          color: voted ? "#673de6" : "#6b6b8a",
          minWidth: 16,
          textAlign: "center",
        }}
      >
        {count}
      </span>
      <button
        onClick={(e) => e.stopPropagation()}
        style={{
          width: small ? 28 : 32,
          height: small ? 28 : 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          cursor: "pointer",
          background: "none",
          border: "none",
          color: "#6b6b8a",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e2ef")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 8.5L0.5 1.5H9.5L5 8.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function ActBtn({
  onClick,
  icon,
  label,
  small,
  danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  small?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 99,
        fontWeight: 600,
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: small ? "5px 8px" : "7px 12px",
        fontSize: small ? 11 : 13,
        color: danger ? "#dc2626" : "#6b6b8a",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = danger ? "#fef2f2" : "#e2e2ef")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {icon}
      <span style={{ display: "none" }} className="vc-hide-xs-inline">
        {label}
      </span>
    </button>
  );
}

export function FL({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#a0a0bc",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

// Icons
export const CmtIco = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M1 2.5C1 1.95 1.45 1.5 2 1.5h8c.55 0 1 .45 1 1v4.5c0 .55-.45 1-1 1H7L6 10l-1-1.5H2c-.55 0-1-.45-1-1V2.5z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);
export const ShareIco = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M4 3.5H2.5C1.95 3.5 1.5 3.95 1.5 4.5v5c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V8M7 1h4M11 1v4M11 1L5.5 6.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const EditIco = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);
export const TrashIco = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M1.5 3h9M4 3V2h4v1M5 5.5v3M7 5.5v3M2.5 3l.5 7h6l.5-7"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
