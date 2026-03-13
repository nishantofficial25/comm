"use client";
import { useState, useEffect, useCallback } from "react";
import {
  API,
  useIdentity,
  useToast,
  Av,
  Badge,
  Toast,
  SkelCard,
  Empty,
  Modal,
  FL,
  TrashIco,
  saveJoinedCommunity,
} from "./vcAtoms";
import LoginGate from "../components/loginGate";
import { useAuth } from "../hooks/useAuth";
// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Community {
  _id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  color: string;
  memberCount: number;
  postCount: number;
  createdBy: string; // stores Google UID (uid from JWT)
  adminId: string; // same as createdBy — explicit admin field
  isPrivate: boolean;
  isMember: boolean;
  createdAt: string;
}

interface Props {
  onOpen: (slug: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — resolve the best available user identifier
// Priority: Google UID (from JWT) → persistent browserId fallback
// ─────────────────────────────────────────────────────────────────────────────

function getActorId(uid?: string | null, bid?: string): string {
  // If the user is signed in via Google, use their stable UID
  if (uid && uid.trim().length > 0) return uid.trim();

  // Fallback: generate / retrieve a stable browser-scoped ID
  // Format: void_<timestamp36>_<random8>  →  easy to grep in MongoDB
  const KEY = "void_browser_id";
  if (typeof window === "undefined") return bid || "anon";
  let stored = localStorage.getItem(KEY);
  if (!stored) {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    stored = `void_${ts}_${rand}`; // e.g. "void_lxyz12_a8f3kd92"
    localStorage.setItem(KEY, stored);
  }
  return stored;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function VcCommunitiesPage({ onOpen }: Props) {
  // useIdentity exposes: bid (browserId), uid (Google UID if signed in), isLoggedIn
  const { bid, uid, isLoggedIn } = useIdentity() as {
    bid: string;
    uid?: string;
    isLoggedIn: boolean;
  };

  // actorId is the ID we send to every API call — Google UID when available
  const actorId = getActorId(uid, bid);

  const [list, setList] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loginGate, setLoginGate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "joined" | "mine">("all");
  const toast = useToast();

  // ── fetch list ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `${API}/api/void/communities?browserId=${encodeURIComponent(actorId)}`,
      );
      const d = await r.json();
      setList(d.communities || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── join / leave ────────────────────────────────────────────────────────────
  async function toggleJoin(slug: string, isMember: boolean) {
    if (!isLoggedIn) {
      setLoginGate(slug);
      return;
    }
    try {
      const r = await fetch(`${API}/api/void/communities/${slug}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserId: actorId,
          action: isMember ? "leave" : "join",
        }),
      });
      const d = await r.json();
      if (d.success) {
        setList((cs) =>
          cs.map((c) =>
            c.slug === slug
              ? {
                  ...c,
                  isMember: !isMember,
                  memberCount: c.memberCount + (isMember ? -1 : 1),
                }
              : c,
          ),
        );
        saveJoinedCommunity(actorId, slug, !isMember);
        toast.show(isMember ? "Left" : "Joined! ✓");
      }
    } catch {
      toast.show("Failed", true);
    }
  }

  // ── delete ──────────────────────────────────────────────────────────────────
  async function deleteCommunity(slug: string) {
    if (!confirm("Delete this community and all its posts?")) return;
    try {
      const r = await fetch(`${API}/api/void/communities/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: actorId }),
      });
      if (r.ok) {
        setList((cs) => cs.filter((c) => c.slug !== slug));
        toast.show("Community deleted");
      } else toast.show("Could not delete", true);
    } catch {
      toast.show("Error", true);
    }
  }

  // ── filtered view ───────────────────────────────────────────────────────────
  const visible = list.filter((c) => {
    const matchesSearch =
      !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      filterTab === "all"
        ? true
        : filterTab === "joined"
          ? c.isMember
          : /* mine */ c.adminId === actorId || c.createdBy === actorId;

    // Hide private communities the user hasn't joined (and isn't admin of)
    const visible =
      !c.isPrivate ||
      c.isMember ||
      c.adminId === actorId ||
      c.createdBy === actorId;

    return matchesSearch && matchesTab && visible;
  });

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* ── Login gate ── */}
      {loginGate && (
        <LoginGate
          reason="Sign in to join this community"
          onClose={() => setLoginGate(null)}
          onSuccess={() => {
            if (loginGate) toggleJoin(loginGate, false);
            setLoginGate(null);
          }}
        />
      )}

      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#1a1a2e",
              margin: 0,
            }}
          >
            Peer Groups
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#a0a0bc",
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            Join focused groups or build your own
          </p>
        </div>

        {isLoggedIn && (
          <button
            onClick={() => setCreating(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              background: "linear-gradient(135deg,#673de6,#4f46e5)",
              border: "none",
              borderRadius: 14,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              boxShadow: "0 4px 16px #673de633",
            }}
          >
            + Create
          </button>
        )}
      </div>

      {/* ── Search + filter tabs ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search communities…"
          style={{
            flex: 1,
            minWidth: 160,
            background: "#f4f4f8",
            border: "1.5px solid #e2e2ef",
            borderRadius: 12,
            padding: "9px 14px",
            fontSize: 13,
            outline: "none",
            color: "#1a1a2e",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#f4f4f8",
            borderRadius: 12,
            padding: 4,
          }}
        >
          {(["all", "joined", "mine"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTab(t)}
              style={{
                padding: "6px 12px",
                borderRadius: 9,
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                background: filterTab === t ? "#673de6" : "transparent",
                color: filterTab === t ? "white" : "#9090b8",
              }}
            >
              {t === "all" ? "All" : t === "joined" ? "Joined" : "My Groups"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Create modal ── */}
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <CreateCommunityForm
            actorId={actorId}
            onCancel={() => setCreating(false)}
            onSuccess={(c) => {
              setList((p) => [c, ...p]);
              setCreating(false);
              toast.show("Community created ✓");
            }}
            toast={toast.show}
          />
        </Modal>
      )}

      {/* ── List ── */}
      {loading ? (
        [0, 1, 2].map((i) => <SkelCard key={i} />)
      ) : visible.length === 0 ? (
        <Empty
          icon={search ? "🔍" : filterTab === "mine" ? "🛠️" : "🌐"}
          title={
            search
              ? `No results for "${search}"`
              : filterTab === "mine"
                ? "You haven't created any groups yet"
                : filterTab === "joined"
                  ? "You haven't joined any groups"
                  : "No communities yet"
          }
          sub={
            filterTab === "all" && !search
              ? "Create the first one!"
              : "Try a different filter or search term."
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((c, i) => (
            <CommunityCard
              key={c._id}
              community={c}
              actorId={actorId}
              isLoggedIn={isLoggedIn}
              onClick={() => onOpen(c.slug)}
              onJoin={() => toggleJoin(c.slug, c.isMember)}
              onDelete={() => deleteCommunity(c.slug)}
              style={{ animation: `vcFadeUp 0.3s ease ${i * 0.04}s both` }}
            />
          ))}
        </div>
      )}

      {/* ── Count footer ── */}
      {!loading && visible.length > 0 && (
        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 11,
            color: "#c0c0d8",
          }}
        >
          {visible.length} {visible.length === 1 ? "community" : "communities"}
          {filterTab !== "all" && ` · ${filterTab}`}
        </div>
      )}

      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY CARD
// ─────────────────────────────────────────────────────────────────────────────

function CommunityCard({
  community: c,
  actorId,
  isLoggedIn,
  onClick,
  onJoin,
  onDelete,
  style,
}: {
  community: Community;
  actorId: string;
  isLoggedIn: boolean;
  onClick: () => void;
  onJoin: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}) {
  const isAdmin = c.adminId === actorId || c.createdBy === actorId;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px",
        background: "white",
        border: c.isPrivate ? "1px solid #e2e2ef" : "1px solid #e2e2ef",
        borderRadius: 18,
        cursor: "pointer",
        boxShadow: "0 1px 4px #00000006",
        transition: "all 0.15s",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#673de6";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 0 0 2px #673de620";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#e2e2ef";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      {/* Private stripe accent */}
      {c.isPrivate && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
          }}
        />
      )}

      {/* Emoji icon */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          background: c.color + "18",
          border: `1.5px solid ${c.color}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {c.emoji}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 2,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 14 }}>
            {c.name}
          </span>

          {/* Private badge */}
          {c.isPrivate && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 7px",
                borderRadius: 99,
                background: "#fef3c7",
                color: "#d97706",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "1px solid #fde68a",
              }}
            >
              🔒 Private
            </span>
          )}

          {c.isMember && <Badge color="purple">JOINED</Badge>}
          {isAdmin && <Badge color="amber">ADMIN</Badge>}
        </div>

        <p
          style={{
            fontSize: 12,
            color: "#a0a0bc",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical" as any,
          }}
        >
          {c.description || "No description"}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 5,
            fontSize: 11,
            color: "#b0b0c8",
          }}
        >
          <span>
            👥 {c.memberCount} {c.memberCount === 1 ? "member" : "members"}
          </span>
          <span>💬 {c.postCount} posts</span>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Private + not member + not admin → show lock */}
        {c.isPrivate && !c.isMember && !isAdmin ? (
          <span
            style={{
              fontSize: 11,
              color: "#d97706",
              padding: "6px 12px",
              borderRadius: 10,
              background: "#fef3c720",
              border: "1px solid #fde68a",
              fontWeight: 600,
            }}
          >
            Invite only
          </span>
        ) : (
          <button
            onClick={onJoin}
            style={{
              padding: "7px 14px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
              border: c.isMember ? "1px solid #e2e2ef" : "1px solid #673de6",
              background: c.isMember ? "none" : "#673de610",
              color: c.isMember ? "#6b6b8a" : "#673de6",
              whiteSpace: "nowrap",
            }}
          >
            {c.isMember ? "Leave" : "Join"}
          </button>
        )}

        {isAdmin && (
          <button
            onClick={onDelete}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "none",
              border: "none",
              color: "#dc2626",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            title="Delete community"
          >
            <TrashIco />
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE COMMUNITY FORM
// ─────────────────────────────────────────────────────────────────────────────

function CreateCommunityForm({
  actorId,
  onCancel,
  onSuccess,
  toast,
}: {
  actorId: string; // Google UID (or browser fallback)
  onCancel: () => void;
  onSuccess: (c: Community) => void;
  toast: (m: string, e?: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("🌐");
  const [color, setColor] = useState("#673de6");
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user, logout } = useAuth();

  const EMOJ = [
    "🌐",
    "📚",
    "⚡",
    "🎯",
    "🔮",
    "🌊",
    "🏆",
    "🧬",
    "🚀",
    "🎭",
    "🌿",
    "🔥",
    "❄️",
    "🎪",
    "🦁",
    "🧠",
    "💡",
    "🎓",
    "🌟",
    "🏛️",
  ];
  const COLS = [
    "#673de6",
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

  const inp: React.CSSProperties = {
    background: "#f4f4f8",
    border: "1.5px solid #e2e2ef",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
    color: "#1a1a2e",
    width: "100%",
    transition: "border-color 0.2s",
    fontFamily: "inherit",
  };

  async function submit() {
    if (!name.trim()) {
      toast("Name required", true);
      return;
    }

    setBusy(true);
    try {
      const r = await fetch(`${API}/api/void/communities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim(),
          emoji,
          color,
          isPrivate,
          // ── KEY FIX: always send actorId (Google UID or browser ID) ──────
          browserId: actorId, // used by backend as createdBy + adminId
          adminId: user?.email || "null", // explicit admin field stored in DB
        }),
      });
      const d = await r.json();
      if (d.success && d.community) {
        onSuccess({
          ...d.community,
          adminId: user?.email || "null",
          createdBy: user?.email || actorId,
          isPrivate: d.community.isPrivate ?? isPrivate,
        });
      } else {
        toast(d.error || "Failed to create", true);
      }
    } catch {
      toast("Network error", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        background: "white",
        borderRadius: 22,
        maxWidth: 460,
        width: "min(460px, 95vw)",
        border: "1px solid #e2e2ef",
        overflow: "hidden",
        boxShadow: "0 24px 80px #00000022",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e2e2ef",
          background: "#f8f8fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, color: "#1a1a2e", fontSize: 15 }}>
            Create Community
          </div>
          <div style={{ fontSize: 11, color: "#a0a0bc", marginTop: 2 }}>
            You'll be set as admin · ID:{" "}
            <code
              style={{
                fontSize: 10,
                background: "#eee",
                padding: "1px 5px",
                borderRadius: 4,
              }}
            >
              {actorId.slice(0, 18)}…
            </code>
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "none",
            border: "none",
            color: "#a0a0bc",
            fontSize: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {/* Emoji picker */}
        <div>
          <FL>Icon</FL>
          <div
            style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}
          >
            {EMOJ.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  fontSize: 16,
                  cursor: "pointer",
                  background: emoji === e ? "#ebe8fc" : "#f4f4f8",
                  border:
                    emoji === e ? "2px solid #673de6" : "2px solid transparent",
                  transform: emoji === e ? "scale(1.12)" : "scale(1)",
                  transition: "all 0.15s",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <FL>Color</FL>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
          >
            {COLS.map((co) => (
              <button
                key={co}
                onClick={() => setColor(co)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: co,
                  cursor: "pointer",
                  border: "none",
                  outline: color === co ? `3px solid ${co}` : "none",
                  outlineOffset: color === co ? 2 : 0,
                  transform: color === co ? "scale(1.15)" : "scale(1)",
                  transition: "all 0.15s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <FL>Name *</FL>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
            placeholder="e.g. UPSC Mains Prep"
            style={inp}
            onFocus={(e) => (e.target.style.borderColor = "#673de6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
          />
          <div
            style={{
              fontSize: 11,
              color: "#c0c0d8",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {name.length}/50
          </div>
        </div>

        {/* Description */}
        <div>
          <FL>Description</FL>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="What is this community about?"
            style={{ ...inp, resize: "none", display: "block" }}
            onFocus={(e) => (e.target.style.borderColor = "#673de6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
          />
          <div
            style={{
              fontSize: 11,
              color: "#c0c0d8",
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {desc.length}/200
          </div>
        </div>

        {/* Privacy toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            background: isPrivate ? "#fefce8" : "#f8f8fc",
            borderRadius: 14,
            border: `1.5px solid ${isPrivate ? "#fde68a" : "#e2e2ef"}`,
            transition: "all 0.25s",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "#1a1a2e",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isPrivate ? "🔒 Private" : "🌐 Public"}
            </div>
            <div style={{ fontSize: 11, color: "#9090a8", marginTop: 2 }}>
              {isPrivate
                ? "Only invited members can see & join"
                : "Anyone can discover and join this community"}
            </div>
          </div>

          {/* Toggle switch */}
          <div
            onClick={() => setIsPrivate((v) => !v)}
            style={{
              width: 48,
              height: 26,
              borderRadius: 26,
              background: isPrivate ? "#d97706" : "#d1d5db",
              position: "relative",
              cursor: "pointer",
              transition: "background 0.25s ease",
              display: "flex",
              alignItems: "center",
              padding: 3,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#fff",
                transform: isPrivate ? "translateX(22px)" : "translateX(0px)",
                transition: "transform 0.25s ease",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
            />
          </div>
        </div>

        {/* Admin info box */}
        <div
          style={{
            padding: "10px 14px",
            background: "#673de608",
            border: "1px solid #673de618",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>👑</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#673de6" }}>
              You will be the Admin
            </div>
            <div style={{ fontSize: 11, color: "#9090a8" }}>
              Your ID{" "}
              <code
                style={{
                  fontSize: 10,
                  background: "#ebe8fc",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                {actorId.slice(0, 20)}…
              </code>{" "}
              will be stored as admin
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "1.5px solid #e2e2ef",
              borderRadius: 13,
              color: "#6b6b8a",
              background: "none",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            style={{
              flex: 2,
              padding: "11px 0",
              background:
                busy || !name.trim()
                  ? "#c4c4d8"
                  : "linear-gradient(135deg,#673de6,#4f46e5)",
              border: "none",
              borderRadius: 13,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: busy || !name.trim() ? "not-allowed" : "pointer",
              boxShadow: busy || !name.trim() ? "none" : "0 4px 14px #673de633",
              transition: "all 0.2s",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {busy ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "vcSpin 0.7s linear infinite",
                  }}
                />
                Creating…
              </>
            ) : (
              `Create ${isPrivate ? "Private" : "Public"} Group`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
