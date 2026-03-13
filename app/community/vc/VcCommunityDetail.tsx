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
  Modal,
  VoteRow,
  ActBtn,
  CmtIco,
  ShareIco,
  TrashIco,
  usePolling,
  ago,
  saveJoinedCommunity,
} from "./vcAtoms";
import { PostCard } from "./VcFeed";
import { ComposeForm } from "../vc/addpost/page";
import LoginGate from "../components/loginGate";
import Leaderboard from "../components/Leaderboard";
import JoinedSidebar from "../components/sidebar";
import Header from "../components/header/header";

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
interface LeaderEntry {
  anonName: string;
  browserId: string;
  score: number;
  rank: number;
}
interface Props {
  slug: string;
  onBack: () => void;
  onOpenPost: (s: string) => void;
  initTab?: string;
  onOpenCommunity?: (slug: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOINED COMMUNITIES SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VcCommunityDetail({
  slug,
  onBack,
  onOpenPost,
  initTab,
  onOpenCommunity,
}: Props) {
  const { bid, isLoggedIn } = useIdentity();
  // activeSlug drives which community is shown — switching via sidebar updates this
  // local state instead of pushing a new URL, so only the right panel re-renders.
  const [activeSlug, setActiveSlug] = useState(slug);
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "chat">(
    initTab === "chat" ? "chat" : "posts",
  );
  const [compose, setCompose] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(
        `${API}/api/void/communities/${activeSlug}?browserId=${encodeURIComponent(bid)}`,
      ).then((r) => r.json()),
      fetch(
        `${API}/api/void/posts?sort=hot&limit=50&browserId=${encodeURIComponent(bid)}&community=${activeSlug}`,
      ).then((r) => r.json()),
    ])
      .then(([cd, pd]) => {
        setCommunity(cd.community || null);
        setPosts(pd.posts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeSlug, bid]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function toggleJoin() {
    if (!community) return;
    if (!isLoggedIn) {
      setShowLoginGate(true);
      return;
    }
    const action = community.isMember ? "leave" : "join";
    const r = await fetch(`${API}/api/void/communities/${activeSlug}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browserId: bid, action }),
    });
    const d = await r.json();
    if (d.success) {
      setCommunity((c) =>
        c
          ? {
              ...c,
              isMember: !c.isMember,
              memberCount: c.memberCount + (c.isMember ? -1 : 1),
            }
          : c,
      );
      saveJoinedCommunity(bid, activeSlug, !community.isMember);
      toast.show(community.isMember ? "Left community" : "Joined! ✓");
    }
  }

  async function delPost(postSlug: string) {
    const r = await fetch(`${API}/api/void/posts/${postSlug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browserId: bid }),
    });
    if (r.ok) {
      setPosts((p) => p.filter((x) => x.slug !== postSlug));
      toast.show("Deleted ✓");
    } else toast.show("Could not delete", true);
    setDeleteTarget(null);
  }

  if (!community && loading)
    return (
      <div
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          height: "100dvh",
          display: "flex",
          flexDirection: "row",
          overflow: "hidden",
          background: "#f4f5fb",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
          @keyframes vccdfade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes jsbSkel { 0%,100%{background:#f0f0f8} 50%{background:#e6e4f8} }
        `}</style>
        {/* Sidebar stays visible while right panel loads */}
        <div className="vc-jsb" style={{ height: "100dvh", flexShrink: 0 }}>
          <JoinedSidebar
            activeSlug={activeSlug}
            onOpen={(s) => {
              if (s === activeSlug) return;
              setActiveSlug(s);
              setTab("posts");
              setCommunity(null);
              setPosts([]);
            }}
          />
        </div>
        {/* Right panel skeleton */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 58,
              background: "white",
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 14px",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#f0f0f8",
                animation: "jsbSkel 1.4s ease infinite",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: 12,
                  width: 140,
                  borderRadius: 99,
                  background: "#f0f0f8",
                  marginBottom: 6,
                  animation: "jsbSkel 1.4s ease infinite",
                }}
              />
              <div
                style={{
                  height: 9,
                  width: 90,
                  borderRadius: 99,
                  background: "#f0f0f8",
                  animation: "jsbSkel 1.4s ease infinite",
                }}
              />
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <SkelCard tall />
            <SkelCard />
            <SkelCard />
          </div>
        </div>
      </div>
    );

  if (!community && !loading)
    return (
      <div
        style={{ textAlign: "center", padding: "80px 20px", color: "#a0a0bc" }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>
          Community not found
        </div>
        <button
          onClick={onBack}
          style={{
            padding: "8px 20px",
            borderRadius: 12,
            background: "#673de6",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ← Go back
        </button>
      </div>
    );

  const accentColor = community.color || "#673de6";
  const isChat = tab === "chat";

  return (
    <div
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        background: isChat ? "#eef1f8" : "#f4f5fb",
        height: "100dvh",
        display: "flex",
        flexDirection: "row",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        .vc-cd-fadein { animation: vccdfade 0.3s ease both; }
        @keyframes vccdfade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .vc-cd-menu { animation: vccdmenu 0.15s ease both; transform-origin: top right; }
        @keyframes vccdmenu { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        .vc-cd-post:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.09) !important; transform: translateY(-1px); }
        .vc-cd-post { transition: transform 0.15s, box-shadow 0.15s; }
        .vc-cd-tab-active { position: relative; }
        .vc-cd-tab-active::after { content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 2.5px; border-radius: 99px; background: currentColor; }
        .vc-cd-msg-enter { animation: vcmsgenter 0.2s ease both; }
        @keyframes vcmsgenter { from { opacity:0; transform: scale(0.95) translateY(6px); } to { opacity:1; transform: scale(1) translateY(0); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #d0d0e8; border-radius: 99px; }
        /* Hide sidebar on mobile */
        .vc-jsb { display: flex; }
        @media (max-width: 768px) { .vc-jsb { display: none !important; } }
      `}</style>

      {/* ══ LEFT SIDEBAR ══ */}
      {/* <div className="vc-jsb" style={{ height: "100dvh", flexShrink: 0 }}>
        <JoinedSidebar
          activeSlug={activeSlug}
          onOpen={(s) => {
            if (s === activeSlug) return;
            setActiveSlug(s);
            setTab("posts");
            setCommunity(null);
            setPosts([]);
          }}
        />
      </div> */}

      {/* ══ MAIN CONTENT ══ */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <Header
          activeSlug={activeSlug}
          accentColor={accentColor}
          community={community}
          toggleJoin={toggleJoin}
          setMenuOpen={setMenuOpen}
          menuRef={menuRef}
          setShowGroupDetails={setShowGroupDetails}
          setShowLeaderboard={setShowLeaderboard}
          toast={toast}
          setShowLeaveConfirm={setShowLeaveConfirm}
          isChat={isChat}
          onBack={onBack}
          menuOpen={menuOpen}
        />
        {/* ── Tab Bar ── */}
        <div
          style={{
            background: "white",
            display: "flex",
            flexShrink: 0,
            borderBottom: "1px solid #eee",
          }}
        >
          {(["posts", "chat"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "vc-cd-tab-active" : ""}
              style={{
                flex: 1,
                padding: "13px 0 11px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tab === t ? 700 : 500,
                color: tab === t ? accentColor : "#a0a0bc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                transition: "color 0.2s",
                position: "relative",
              }}
            >
              {t === "posts" ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Posts
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  GD Room
                  {!community.isMember && (
                    <span style={{ fontSize: 10 }}>🔒</span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
        {/* ── Content ── */}
        <div
          key={activeSlug}
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            animation: "vccdfade 0.25s ease both",

            maxWidth: 700,
            width: "100%",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {tab === "posts" && (
            <div
              style={{ flex: 1, overflowY: "auto", padding: "12px 12px 100px" }}
            >
              {!community.isMember && (
                <div
                  className="vc-cd-fadein"
                  style={{
                    background: "white",
                    borderRadius: 18,
                    padding: "16px 18px",
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                    border: `1px solid ${accentColor}20`,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: accentColor + "15",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {community.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#1a1a2e",
                        marginBottom: 2,
                      }}
                    >
                      Join to participate
                    </div>
                    <div style={{ fontSize: 12, color: "#6b6b8a" }}>
                      {community.description}
                    </div>
                  </div>
                  <button
                    onClick={toggleJoin}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 12,
                      background: accentColor,
                      color: "white",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      flexShrink: 0,
                      boxShadow: `0 4px 14px ${accentColor}44`,
                    }}
                  >
                    Join
                  </button>
                </div>
              )}

              {community.isMember && !compose && (
                <button
                  onClick={() => setCompose(true)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "white",
                    border: `1.5px dashed ${accentColor}50`,
                    borderRadius: 16,
                    marginBottom: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#a0a0bc",
                    fontSize: 13,
                    textAlign: "left",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor =
                      accentColor)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor =
                      `${accentColor}50`)
                  }
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: accentColor + "15",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accentColor,
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    +
                  </div>
                  <span>Share something with the community…</span>
                </button>
              )}

              {compose && (
                <Modal onClose={() => setCompose(false)}>
                  <ComposeForm
                    community={activeSlug}
                    onCancel={() => setCompose(false)}
                    onSuccess={(p: any) => {
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
                  sub={
                    community.isMember
                      ? "Be the first to post here!"
                      : "Join to see and create posts"
                  }
                />
              ) : (
                posts.map((p, i) => (
                  <div
                    key={p._id}
                    className="vc-cd-post vc-cd-fadein"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <PostCard
                      post={p}
                      delay={0}
                      isOwner={p.browserId === bid}
                      onOpen={() => onOpenPost(p.slug)}
                      onVote={() => {}}
                      onDelete={() => setDeleteTarget(p.slug)}
                      onShare={() =>
                        navigator.clipboard
                          .writeText(
                            `${window.location.origin}/community?post=${p.slug}`,
                          )
                          .then(() => toast.show("Copied ✓"))
                      }
                      onOpenCommunity={() => {}}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "chat" && (
            <GDRoom
              communitySlug={activeSlug}
              communityName={community.name}
              accentColor={accentColor}
              isMember={community.isMember}
              onJoin={toggleJoin}
            />
          )}
        </div>
      </div>

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10,8,30,0.5)",
              backdropFilter: "blur(6px)",
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 22,
              width: "min(380px,90vw)",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                height: 4,
                background: "linear-gradient(90deg,#dc2626,#ef4444)",
              }}
            />
            <div style={{ padding: "24px 24px 20px" }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                    stroke="#dc2626"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11v6M14 11v6"
                    stroke="#dc2626"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#1a1a2e",
                  marginBottom: 6,
                }}
              >
                Delete this post?
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6b6b8a",
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                This is permanent and cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 13,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#f4f4f8",
                    border: "1.5px solid #e2e2ef",
                    color: "#6b6b8a",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => delPost(deleteTarget)}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 13,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "linear-gradient(135deg,#dc2626,#ef4444)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupDetails && (
        <GroupDetailsModal
          community={community}
          accentColor={accentColor}
          onClose={() => setShowGroupDetails(false)}
        />
      )}
      {showLeaveConfirm && (
        <LeaveConfirmModal
          community={community}
          accentColor={accentColor}
          onClose={() => setShowLeaveConfirm(false)}
          onConfirm={() => {
            setShowLeaveConfirm(false);
            toggleJoin();
          }}
        />
      )}
      {showLeaderboard && (
        <LeaderboardSheet
          slug={activeSlug}
          communityName={community.name}
          accentColor={accentColor}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
      {showLoginGate && (
        <LoginGate
          reason="Sign in to join this community"
          onClose={() => setShowLoginGate(false)}
          onSuccess={() => {
            setShowLoginGate(false);
            toggleJoin();
          }}
        />
      )}
      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GD ROOM
// ─────────────────────────────────────────────────────────────────────────────
function GDRoom({
  communitySlug,
  communityName,
  accentColor,
  isMember,
  onJoin,
}: {
  communitySlug: string;
  communityName: string;
  accentColor: string;
  isMember: boolean;
  onJoin: () => void;
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

  const [msgs, connected] = usePolling(fetcher, 2500, isMember);

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
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          textAlign: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            background: accentColor + "15",
            border: `2px solid ${accentColor}25`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
          }}
        >
          🔒
        </div>
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 17,
              color: "#1a1a2e",
              marginBottom: 6,
            }}
          >
            Members Only
          </div>
          <div style={{ fontSize: 13, color: "#6b6b8a", lineHeight: 1.6 }}>
            Join this community to access the GD Room and participate in live
            group discussions.
          </div>
        </div>
        <button
          onClick={onJoin}
          style={{
            padding: "12px 32px",
            borderRadius: 14,
            background: accentColor,
            color: "white",
            border: "none",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: `0 6px 20px ${accentColor}44`,
          }}
        >
          Join to unlock →
        </button>
      </div>
    );

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 8px" }} >
        {msgs.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 8,
              padding: "40px 0",
              color: "#a0a0bc",
            }}
          >
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#6b6b8a" }}>
              No messages yet
            </div>
            <div style={{ fontSize: 12 }}>Be the first to say hello! 👋</div>
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
              120_000;
          return (
            <div
              key={m._id}
              className="vc-cd-msg-enter"
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
                  maxWidth: "72%",
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
                      gap: 6,
                      flexDirection: isMe ? "row-reverse" : "row",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isMe ? accentColor : "#5b6ee1",
                      }}
                    >
                      {m.anonName}
                    </span>
                    <span style={{ fontSize: 10, color: "#c4c4d8" }}>
                      {ago(m.createdAt)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    padding: "9px 13px",
                    fontSize: 13,
                    lineHeight: 1.55,
                    wordBreak: "break-word",
                    borderRadius: isMe
                      ? "18px 4px 18px 18px"
                      : "4px 18px 18px 18px",
                    background: isMe
                      ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                      : "white",
                    color: isMe ? "white" : "#1a1a2e",
                    boxShadow: isMe
                      ? `0 2px 12px ${accentColor}44`
                      : "0 1px 6px rgba(0,0,0,0.07)",
                    border: isMe ? "none" : "1px solid #e8e8f0",
                  }}
                >
                  {m.body}
                  {grouped && (
                    <div
                      style={{
                        fontSize: 10,
                        color: isMe ? "rgba(255,255,255,0.55)" : "#c4c4d8",
                        marginTop: 3,
                        textAlign: "right",
                      }}
                    >
                      {ago(m.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: "8px 12px 12px",
          background: "white",
          borderTop: "1px solid #eee",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 7,
            paddingLeft: 2,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: connected ? "#22c55e" : "#e2e2ef",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 10, color: "#a0a0bc" }}>
            {connected ? "Live · messages update every 2.5s" : "Connecting…"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "#f4f5fb",
            borderRadius: 24,
            padding: "7px 7px 7px 16px",
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
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 13,
              color: "#1a1a2e",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={send}
            disabled={sending || !txt.trim()}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "none",
              background:
                txt.trim() && !sending
                  ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                  : "#e2e2ef",
              color: txt.trim() && !sending ? "white" : "#b0b0c8",
              cursor: txt.trim() && !sending ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
              boxShadow:
                txt.trim() && !sending ? `0 4px 14px ${accentColor}44` : "none",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODALS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function GroupDetailsModal({
  community,
  accentColor,
  onClose,
}: {
  community: Community;
  accentColor: string;
  onClose: () => void;
}) {
  const createdDate = new Date(community.createdAt).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const stats = [
    {
      icon: "👥",
      label: "Members",
      value: community.memberCount.toLocaleString(),
    },
    { icon: "💬", label: "Posts", value: community.postCount.toLocaleString() },
    { icon: "📅", label: "Created", value: createdDate },
  ];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,8,30,0.5)",
          backdropFilter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "white",
          borderRadius: "24px 24px 0 0",
          overflow: "hidden",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.18)",
          animation: "vccdfade 0.25s ease both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)`,
          }}
        />
        <div
          style={{
            width: 36,
            height: 4,
            background: "#e2e2ef",
            borderRadius: 99,
            margin: "12px auto 0",
          }}
        />
        <div
          style={{
            padding: "20px 24px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background: accentColor + "18",
              border: `2px solid ${accentColor}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              marginBottom: 12,
              boxShadow: `0 8px 24px ${accentColor}25`,
            }}
          >
            {community.emoji}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#1a1a2e",
              marginBottom: 4,
            }}
          >
            {community.name}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6b6b8a",
              lineHeight: 1.6,
              maxWidth: 320,
            }}
          >
            {community.description}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            padding: "20px 20px 4px",
          }}
        >
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: "#f8f8fc",
                borderRadius: 14,
                padding: "12px 8px",
                textAlign: "center",
                border: "1px solid #f0f0f8",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#1a1a2e",
                  marginBottom: 2,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#a0a0bc",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            margin: "12px 20px",
            padding: "12px 14px",
            background: accentColor + "08",
            borderRadius: 14,
            border: `1px solid ${accentColor}18`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: accentColor + "20",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            👑
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: accentColor,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 1,
              }}
            >
              Admin
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
              Community Owner
            </div>
            <div style={{ fontSize: 11, color: "#a0a0bc" }}>
              Created {createdDate}
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              padding: "3px 10px",
              borderRadius: 99,
              background: accentColor + "15",
              color: accentColor,
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Owner
          </div>
        </div>
        <div style={{ padding: "8px 20px 28px" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 14,
              background: "#f4f4f8",
              border: "none",
              color: "#1a1a2e",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveConfirmModal({
  community,
  accentColor,
  onConfirm,
  onClose,
}: {
  community: Community;
  accentColor: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,8,30,0.55)",
          backdropFilter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: "min(400px,92vw)",
          background: "white",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
          animation: "vccdfade 0.2s ease both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg, #f97316, #ef4444)",
          }}
        />
        <div style={{ padding: "28px 28px 24px" }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 18,
              background: "#fff7ed",
              border: "2px solid #fed7aa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
              position: "relative",
            }}
          >
            <div style={{ fontSize: 26 }}>{community.emoji}</div>
            <div
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#f97316",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid white",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#1a1a2e",
              marginBottom: 8,
            }}
          >
            Leave {community.name}?
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6b6b8a",
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            You'll lose access to the{" "}
            <strong style={{ color: "#1a1a2e" }}>GD Room</strong> and community
            posts. You can always rejoin later.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: "#f8f8fc",
              borderRadius: 12,
              marginBottom: 24,
              border: "1px solid #f0f0f8",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: accentColor + "18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              {community.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>
                {community.name}
              </div>
              <div style={{ fontSize: 11, color: "#a0a0bc" }}>
                {community.memberCount.toLocaleString()} members
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                background: "#f4f4f8",
                border: "1.5px solid #e2e2ef",
                color: "#6b6b8a",
                cursor: "pointer",
              }}
            >
              Stay
            </button>
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                padding: "12px 0",
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 700,
                background: "linear-gradient(135deg, #f97316, #ef4444)",
                border: "none",
                color: "white",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
              }}
            >
              Yes, leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardSheet({
  slug,
  communityName,
  accentColor,
  onClose,
}: {
  slug: string;
  communityName: string;
  accentColor: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { bid } = useIdentity();
  useEffect(() => {
    fetch(
      `${API}/api/void/communities/${slug}/leaderboard?browserId=${encodeURIComponent(bid)}`,
    )
      .then((r) => r.json())
      .then((d) => setEntries(d.leaderboard || d.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [slug, bid]);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,8,30,0.5)",
          backdropFilter: "blur(5px)",
        }}
      />
      <div
        className="vc-cd-fadein"
        style={{
          position: "relative",
          width: "100%",
          background: "white",
          borderRadius: "24px 24px 0 0",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: 36,
            height: 4,
            background: "#e2e2ef",
            borderRadius: 99,
            margin: "12px auto 0",
          }}
        />
        <div
          style={{
            padding: "14px 20px 12px",
            borderBottom: "1px solid #f4f4f8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a2e" }}>
              🏆 Leaderboard
            </div>
            <div style={{ fontSize: 11, color: "#a0a0bc", marginTop: 1 }}>
              {communityName} · top contributors
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#f4f4f8",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b6b8a",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
          {loading ? (
            <div style={{ padding: 20 }}>
              <SkelCard />
              <SkelCard />
              <SkelCard />
            </div>
          ) : entries.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#a0a0bc",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontWeight: 600 }}>No data yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Start posting to appear here!
              </div>
            </div>
          ) : (
            entries.map((e, i) => (
              <div
                key={e.browserId || i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "13px 20px",
                  borderBottom: "1px solid #fafafa",
                  background: i === 0 ? "#fffbf0" : "white",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    width: 28,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {medals[i] || `#${e.rank || i + 1}`}
                </span>
                <Av size={38} id={e.browserId} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#1a1a2e",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {e.anonName}
                  </div>
                  <div style={{ fontSize: 11, color: "#a0a0bc" }}>
                    Rank #{e.rank || i + 1}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: accentColor,
                    }}
                  >
                    {(e.score || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: "#a0a0bc" }}>pts</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
