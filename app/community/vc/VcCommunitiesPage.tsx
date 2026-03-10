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
  EditIco,
  TrashIco,
  saveJoinedCommunity,
} from "./vcAtoms";
import LoginGate from "../components/loginGate";

interface Community {
  _id: string;
  name: string;
  slug: string;
  description: string;
  emoji: string;
  color: string;
  memberCount: number;
  postCount: number;
  createdBy: string;
  isMember: boolean;
  createdAt: string;
}

interface Props {
  onOpen: (slug: string) => void;
}

export default function VcCommunitiesPage({ onOpen }: Props) {
  const { bid, isLoggedIn } = useIdentity();
  const [list, setList] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [loginGate, setLoginGate] = useState<string | null>(null); // slug to join after login
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `${API}/api/void/communities?browserId=${encodeURIComponent(bid)}`,
      );
      const d = await r.json();
      setList(d.communities || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    load();
  }, [load]);

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
          browserId: bid,
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
        saveJoinedCommunity(bid, slug, !isMember);
        toast.show(isMember ? "Left" : "Joined! ✓");
      }
    } catch {
      toast.show("Failed", true);
    }
  }
  async function deleteCommunity(slug: string) {
    if (!confirm("Delete this community?")) return;
    try {
      const r = await fetch(`${API}/api/void/communities/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: bid }),
      });
      if (r.ok) {
        setList((cs) => cs.filter((c) => c.slug !== slug));
        toast.show("Community deleted");
      } else toast.show("Could not delete", true);
    } catch {
      toast.show("Error", true);
    }
  }

  return (
    <div>
      {loginGate && (
        <LoginGate
          reason="Sign in to join this community"
          onClose={() => setLoginGate(null)}
          onSuccess={() => {
            // After login, auto-join
            if (loginGate) toggleJoin(loginGate, false);
            setLoginGate(null);
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 20,
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
      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <CreateCommunityForm
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
      {loading ? (
        [0, 1, 2].map((i) => <SkelCard key={i} />)
      ) : list.length === 0 ? (
        <Empty
          icon="🌐"
          title="No communities yet"
          sub="Create the first one!"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((c, i) => (
            <CommunityCard
              key={c._id}
              community={c}
              bid={bid}
              onClick={() => onOpen(c.slug)}
              onJoin={() => toggleJoin(c.slug, c.isMember)}
              onDelete={() => deleteCommunity(c.slug)}
              style={{ animation: `vcFadeUp 0.3s ease ${i * 0.04}s both` }}
            />
          ))}
        </div>
      )}
      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}

function CommunityCard({
  community: c,
  bid,
  onClick,
  onJoin,
  onDelete,
  style,
}: {
  community: Community;
  bid: string;
  onClick: () => void;
  onJoin: () => void;
  onDelete: () => void;
  style?: React.CSSProperties;
}) {
  const isOwner = c.createdBy === bid;
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "16px",
        background: "white",
        border: "1px solid #e2e2ef",
        borderRadius: 18,
        cursor: "pointer",
        boxShadow: "0 1px 4px #00000006",
        transition: "all 0.15s",
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
          <span style={{ fontWeight: 700, color: "#1a1a2e" }}>{c.name}</span>
          {c.isMember && <Badge color="purple">JOINED</Badge>}
          {isOwner && <Badge color="amber">OWNER</Badge>}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "#a0a0bc",
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as any,
          }}
        >
          {c.description}
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 4,
            fontSize: 11,
            color: "#a0a0bc",
          }}
        >
          <span>👥 {c.memberCount}</span>
          <span>💬 {c.postCount}</span>
        </div>
      </div>
      <div
        style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
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
        {isOwner && (
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
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <TrashIco />
          </button>
        )}
      </div>
    </div>
  );
}

function CreateCommunityForm({
  onCancel,
  onSuccess,
  toast,
}: {
  onCancel: () => void;
  onSuccess: (c: Community) => void;
  toast: (m: string, e?: boolean) => void;
}) {
  const { bid } = useIdentity();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("🌐");
  const [color, setColor] = useState("#673de6");
  const [busy, setBusy] = useState(false);
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
  const inp = {
    background: "#f4f4f8",
    border: "1.5px solid #e2e2ef",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
    color: "#1a1a2e",
    width: "100%",
    transition: "border-color 0.2s",
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
          browserId: bid,
        }),
      });
      const d = await r.json();
      if (d.success && d.community) onSuccess(d.community);
      else toast(d.error || "Failed", true);
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
        borderRadius: 20,
        maxWidth: 440,
        width: "min(440px,95vw)",
        border: "1px solid #e2e2ef",
        overflow: "hidden",
        boxShadow: "0 20px 60px #00000020",
      }}
      className="vc-slidein"
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e2e2ef",
          background: "#f4f4f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, color: "#1a1a2e" }}>
            Create Community
          </div>
          <div style={{ fontSize: 11, color: "#a0a0bc" }}>
            Build a focused space
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
      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <FL>Icon</FL>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  transform: emoji === e ? "scale(1.1)" : "",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FL>Color</FL>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                  outline: color === co ? "3px solid " + co : "none",
                  outlineOffset: color === co ? "2px" : "0",
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <FL>Name</FL>
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
        </div>
        <div>
          <FL>Description</FL>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="What is this community about?"
            style={{ ...inp, resize: "none" as any, display: "block" }}
            onFocus={(e) => (e.target.style.borderColor = "#673de6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "1px solid #e2e2ef",
              borderRadius: 12,
              color: "#6b6b8a",
              background: "none",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{
              flex: 2,
              padding: "10px 0",
              background: busy ? "#c4c4d8" : "#673de6",
              border: "none",
              borderRadius: 12,
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
