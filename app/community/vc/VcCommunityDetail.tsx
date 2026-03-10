"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  API,
  useIdentity,
  useToast,
  Av,
  Badge,
  Toast,
  SkelCard,
  Empty,
  usePolling,
} from "./vcAtoms";
import { PostCard, ComposeForm } from "./VcFeed";
import { Modal } from "./vcAtoms";
import Leaderboard from "../components/Leaderboard";
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
interface ChatMsg {
  _id: string;
  body: string;
  anonName: string;
  browserId: string;
  createdAt: string;
}

function ago(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(s).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

interface Props {
  slug: string;
  onBack: () => void;
  onOpenPost: (s: string) => void;
  initTab: string;
}

export default function VcCommunityDetail({
  slug,
  onBack,
  onOpenPost,
  initTab,
}: Props) {
  const { bid } = useIdentity();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "chat">(
    initTab === "chat" ? "chat" : "posts",
  );
  const [compose, setCompose] = useState(false);
  const toast = useToast();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(
        `${API}/api/void/communities/${slug}?browserId=${encodeURIComponent(bid)}`,
      ).then((r) => r.json()),
      fetch(
        `${API}/api/void/posts?sort=hot&limit=50&browserId=${encodeURIComponent(bid)}&community=${slug}`,
      ).then((r) => r.json()),
    ])
      .then(([cd, pd]) => {
        setCommunity(cd.community || null);
        setPosts(pd.posts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, bid]);

  async function toggleJoin() {
    if (!community) return;
    const r = await fetch(`${API}/api/void/communities/${slug}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browserId: bid,
        action: community.isMember ? "leave" : "join",
      }),
    });
    const d = await r.json();
    if (d.success)
      setCommunity((c) =>
        c
          ? {
              ...c,
              isMember: !c.isMember,
              memberCount: c.memberCount + (c.isMember ? -1 : 1),
            }
          : c,
      );
  }

  if (loading)
    return (
      <div>
        <SkelCard tall />
        <SkelCard />
      </div>
    );
  if (!community)
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#a0a0bc" }}>
        Community not found
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "white",
          border: "1px solid #e2e2ef",
          borderRadius: 18,
          padding: "20px 24px",
          marginBottom: 16,
          boxShadow: "0 1px 4px #00000006",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              background: community.color + "18",
              border: `2px solid ${community.color}25`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            {community.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#1a1a2e",
                  margin: 0,
                }}
              >
                {community.name}
              </h1>
              {community.isMember && <Badge color="purple">JOINED</Badge>}
            </div>
            <p style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 10 }}>
              {community.description}
            </p>
            <div
              style={{
                display: "flex",
                gap: 16,
                fontSize: 11,
                color: "#a0a0bc",
              }}
            >
              <span>👥 {community.memberCount} members</span>
              <span>💬 {community.postCount} posts</span>
              {community.isMember && <span>🟢 Chat available</span>}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <button
              onClick={toggleJoin}
              style={{
                padding: "9px 20px",
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: community.isMember ? "1px solid #e2e2ef" : "none",
                background: community.isMember
                  ? "none"
                  : "linear-gradient(135deg,#673de6,#4f46e5)",
                color: community.isMember ? "#6b6b8a" : "white",
              }}
            >
              {community.isMember ? "Leave" : "Join"}
            </button>
            {community.isMember && (
              <button
                onClick={() => setShowLeaderboard(true)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "#f4f4f8",
                  border: "1px solid #e2e2ef",
                  color: "#6b6b8a",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                🏆 <span>Leaderboard</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showLeaderboard && (
        <Leaderboard
          onClose={() => setShowLeaderboard(false)}
          communitySlug={slug}
          communityName={community.name}
        />
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 16,
          background: "white",
          border: "1px solid #e2e2ef",
          borderRadius: 14,
          padding: 4,
        }}
      >
        {(["posts", "chat"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "9px 0",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              background: tab === t ? "#673de6" : "transparent",
              color: tab === t ? "white" : "#6b6b8a",
            }}
          >
            {t === "posts" ? "📄 Posts" : "💬 GD Room"}
            {t === "chat" && !community.isMember && " 🔒"}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            {community.isMember ? (
              <button
                onClick={() => setCompose(true)}
                style={{
                  padding: "8px 18px",
                  background: "#673de6",
                  border: "none",
                  borderRadius: 12,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                + New Post
              </button>
            ) : (
              <button
                onClick={() => setShowLoginGate(true)}
                style={{
                  padding: "8px 18px",
                  background: "#f4f4f8",
                  border: "1px solid #e2e2ef",
                  borderRadius: 12,
                  color: "#6b6b8a",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                🔒 Join to post
              </button>
            )}
          </div>
          {compose && (
            <Modal onClose={() => setCompose(false)}>
              <ComposeForm
                community={slug}
                onCancel={() => setCompose(false)}
                onSuccess={(p) => {
                  setPosts((prev) => [p, ...prev]);
                  setCompose(false);
                  toast.show("Posted ✓");
                }}
                toast={toast.show}
              />
            </Modal>
          )}
          {posts.length === 0 ? (
            <Empty
              icon="💬"
              title="No posts yet"
              sub="Be the first to post here!"
            />
          ) : (
            posts.map((p, i) => (
              <PostCard
                key={p._id}
                post={p}
                delay={i * 0.03}
                isOwner={p.browserId === bid}
                onOpen={() => onOpenPost(p.slug)}
                onVote={() => {}}
                onDelete={async () => {
                  if (!confirm("Delete?")) return;
                  const r = await fetch(`${API}/api/void/posts/${p.slug}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ browserId: bid }),
                  });
                  if (r.ok) setPosts((x) => x.filter((y) => y.slug !== p.slug));
                }}
                onShare={() =>
                  navigator.clipboard
                    .writeText(
                      `${window.location.origin}/community?post=${p.slug}`,
                    )
                    .then(() => toast.show("Copied ✓"))
                }
                onOpenCommunity={() => {}}
              />
            ))
          )}
        </>
      )}

      {tab === "chat" && (
        <CommunityChat
          communitySlug={slug}
          communityName={community.name}
          isMember={community.isMember}
        />
      )}
      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
      {showLoginGate && (
        <LoginGate
          reason={
            community.isMember
              ? "Sign in to post"
              : "Join this community to post"
          }
          onClose={() => setShowLoginGate(false)}
          onSuccess={() => {
            setShowLoginGate(false);
            if (community.isMember) setCompose(true);
            else toggleJoin();
          }}
        />
      )}
    </div>
  );
}

function CommunityChat({
  communitySlug,
  communityName,
  isMember,
}: {
  communitySlug: string;
  communityName: string;
  isMember: boolean;
}) {
  const { bid, myName, picture } = useIdentity();
  const [txt, setTxt] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const fetcher = useCallback(async () => {
    const r = await fetch(
      `${API}/api/void/chat?community=${communitySlug}&limit=80`,
    );
    const d = await r.json();
    return (d.messages || []) as ChatMsg[];
  }, [communitySlug]);
  const [msgs, connected] = usePolling(fetcher, 2500, true);

  const prevLastId = useRef<string | null>(null);
  useEffect(() => {
    const last = msgs[msgs.length - 1]?._id || null;
    if (last && last !== prevLastId.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      prevLastId.current = last;
    }
  }, [msgs]);

  async function send() {
    const body = txt.trim();
    if (!body) return;
    setSending(true);
    setTxt("");
    try {
      await fetch(`${API}/api/void/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          browserId: bid,
          anonName: myName,
          community: communitySlug,
        }),
      });
    } catch {
      toast.show("Failed to send", true);
      setTxt(body);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  if (!isMember)
    return (
      <div
        style={{
          background: "white",
          border: "1px solid #e2e2ef",
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 0",
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 700, color: "#1a1a2e" }}>Members Only</div>
          <div style={{ fontSize: 13, color: "#6b6b8a", marginTop: 4 }}>
            Join this community to access the GD Room.
          </div>
        </div>
      </div>
    );

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e2ef",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 200px)",
        minHeight: 420,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: "1px solid #e2e2ef",
          background: "#f4f4f8",
        }}
      >
        <span
          className={connected ? "vc-pulse" : ""}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected ? "#22c55e" : "#a0a0bc",
            display: "inline-block",
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>
          {communityName} · GD Room
        </span>
        <span style={{ fontSize: 11, color: "#a0a0bc", marginLeft: "auto" }}>
          {msgs.length} messages · as{" "}
          <strong style={{ color: "#1a1a2e" }}>{myName}</strong>
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {msgs.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              fontSize: 13,
              color: "#a0a0bc",
            }}
          >
            No messages yet — say hello! 👋
          </div>
        )}
        {msgs.map((m, i) => {
          const isMe = m.browserId === bid;
          const prev = msgs[i - 1];
          const grouped =
            prev &&
            prev.browserId === m.browserId &&
            new Date(m.createdAt).getTime() -
              new Date(prev.createdAt).getTime() <
              120000;
          return (
            <div
              key={m._id}
              style={{
                display: "flex",
                gap: 8,
                flexDirection: isMe ? "row-reverse" : "row",
                marginTop: grouped ? 2 : 12,
              }}
            >
              {!grouped ? (
                <Av
                  size={28}
                  id={m.browserId}
                  picture={isMe && picture ? picture : undefined}
                />
              ) : (
                <div style={{ width: 28, flexShrink: 0 }} />
              )}
              <div
                style={{
                  maxWidth: "75%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                }}
              >
                {!grouped && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      flexDirection: isMe ? "row-reverse" : "row",
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#1a1a2e",
                      }}
                    >
                      {m.anonName}
                    </span>
                    <span style={{ fontSize: 10, color: "#a0a0bc" }}>
                      {ago(m.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                    borderRadius: isMe
                      ? "18px 18px 4px 18px"
                      : "18px 18px 18px 4px",
                    background: isMe ? "#673de6" : "#f4f4f8",
                    color: isMe ? "white" : "#1a1a2e",
                    border: isMe ? "none" : "1px solid #e2e2ef",
                  }}
                >
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid #e2e2ef",
          background: "#f4f4f8",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${communityName}…`}
          style={{
            flex: 1,
            borderRadius: 14,
            padding: "9px 16px",
            fontSize: 13,
            outline: "none",
            background: "white",
            border: "1.5px solid #e2e2ef",
            color: "#1a1a2e",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#673de6")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
        />
        <button
          onClick={send}
          disabled={sending || !txt.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: txt.trim() && !sending ? "#673de6" : "#e2e2ef",
            color: txt.trim() && !sending ? "white" : "#a0a0bc",
            flexShrink: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M13.5 7.5L1.5 1.5l2.5 6-2.5 6 12-6z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}
