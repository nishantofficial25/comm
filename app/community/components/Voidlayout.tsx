"use client";
/**
 * VoidLayout — Telegram-style full-screen shell
 *
 * Right panel states:
 *   "feed"         → FeedPanel  (VcFeed)
 *   community slug → CommunityPanel (posts + GD Room)
 *   post open      → ThreadPanel (VcThread) — back returns to prev panel
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  API,
  useIdentity,
  useToast,
  Av,
  Toast,
  SkelCard,
  Empty,
  Modal,
  usePolling,
  ago,
  saveJoinedCommunity,
  useAuth,
} from "../vc/vcAtoms";
import { PostCard } from "../vc/VcFeed";
import VcFeed from "../vc/VcFeed";
import VcThread from "../vc/VcThread";
import { ComposeForm } from "../vc/addpost/page";
import LoginGate from "../components/loginGate";
// ─── Types ────────────────────────────────────────────────────────────────────
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

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
  @keyframes vl-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes vl-skel { 0%,100%{background:#f0f0f8} 50%{background:#e4e2f4} }
  @keyframes vl-menu { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
  @keyframes vl-spin  { to{transform:rotate(360deg)} }
  .vl-fade  { animation: vl-fade 0.28s ease both; }
  .vl-menu  { animation: vl-menu 0.15s ease both; transform-origin: top right; }
  .vl-tab-active::after {
    content:''; position:absolute; bottom:0; left:20%; right:20%;
    height:2.5px; border-radius:99px; background:currentColor;
  }
  .vl-post:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.09)!important; transform:translateY(-1px); }
  .vl-post { transition: transform 0.15s, box-shadow 0.15s; }
  .vl-sb-item:hover { background: #f4f3fc !important; }
  .vl-scroll::-webkit-scrollbar { width:3px; }
  .vl-scroll::-webkit-scrollbar-thumb { background:#d0d0e8; border-radius:99px; }
  @media(max-width:768px){ .vl-sidebar{ display:none!important; } }
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
interface VoidLayoutProps {
  initialSlug: string;
  onOpenPost?: (slug: string) => void;
  onBack: () => void;
  initTab?: string;
}

export default function VoidLayout({
  initialSlug,
  onBack,
  initTab,
}: VoidLayoutProps) {
  const [activeSlug, setActiveSlug] = useState<string>(initialSlug || "feed");
  const [activePost, setActivePost] = useState<string | null>(null);
  const [prevSlug, setPrevSlug] = useState<string>("feed");

  function switchTo(slug: string) {
    setActiveSlug(slug);
    setActivePost(null);
  }

  function openPost(postSlug: string) {
    setPrevSlug(activeSlug);
    setActivePost(postSlug);
  }

  function closePost() {
    setActivePost(null);
    setActiveSlug(prevSlug);
  }

  // Sidebar highlights the community we came from, not "thread"
  const sidebarSlug = activePost ? prevSlug : activeSlug;

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        background: "#f0f2f8",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{GLOBAL_CSS}</style>

      <VoidSidebar
        activeSlug={sidebarSlug}
        onSwitch={switchTo}
        onBack={onBack}
      />

      {activePost ? (
        <ThreadPanel
          key={activePost}
          postSlug={activePost}
          onBack={closePost}
          onOpenCommunity={switchTo}
        />
      ) : activeSlug === "feed" ? (
        <FeedPanel onOpenPost={openPost} onSwitchCommunity={switchTo} />
      ) : (
        <CommunityPanel
          key={activeSlug}
          slug={activeSlug}
          onOpenPost={openPost}
          onBack={onBack}
          initTab={initTab}
          onSwitchCommunity={switchTo}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THREAD PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ThreadPanel({
  postSlug,
  onBack,
  onOpenCommunity,
}: {
  postSlug: string;
  onBack: () => void;
  onOpenCommunity: (s: string) => void;
}) {
  return (
    <div
      className="vl-fade"
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        background: "#f4f5fb",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "white",
          padding: "0 18px",
          height: 58,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          boxShadow: "0 1px 0 #eee",
          zIndex: 40,
        }}
      >
        <button
          onClick={onBack}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "#f4f4f8",
            border: "1px solid #e8e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#6b6b8a",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#ebe8fc";
            (e.currentTarget as HTMLElement).style.color = "#673de6";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#f4f4f8";
            (e.currentTarget as HTMLElement).style.color = "#6b6b8a";
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12l7-7M5 12l7 7"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "#673de618",
            border: "1.5px solid #673de630",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 17,
            flexShrink: 0,
          }}
        >
          💬
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: "#1a1a2e",
              lineHeight: 1.2,
            }}
          >
            Thread
          </div>
          <div style={{ fontSize: 11, color: "#a0a0bc", marginTop: 1 }}>
            Post &amp; comments
          </div>
        </div>
      </div>

      {/* Content — VcThread scrolls inside here */}
      <div
        className="vl-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "4px 8px 10px" }}
      >
        <VcThread
          slug={postSlug}
          onBack={onBack}
          onOpenCommunity={onOpenCommunity}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEED PANEL
// ─────────────────────────────────────────────────────────────────────────────
function FeedPanel({
  onOpenPost,
  onSwitchCommunity,
}: {
  onOpenPost: (s: string) => void;
  onSwitchCommunity: (s: string) => void;
}) {
  return (
    <div
      className="vl-fade"
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        background: "#f4f5fb",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "0 20px",
          height: 58,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          boxShadow: "0 1px 0 #eee",
          zIndex: 40,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#673de618",
            border: "1.5px solid #673de630",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          🏠
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: "#1a1a2e",
              lineHeight: 1.2,
            }}
          >
            Community Feed
          </div>
          <div style={{ fontSize: 11, color: "#a0a0bc", marginTop: 1 }}>
            All posts from your communities
          </div>
        </div>
      </div>
      <div
        className="vl-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "4px 8px 10px" }}
      >
        <VcFeed onOpen={onOpenPost} onOpenCommunity={onSwitchCommunity} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
function VoidSidebar({
  activeSlug,
  onSwitch,
  onBack,
}: {
  activeSlug: string;
  onSwitch: (slug: string) => void;
  onBack: () => void;
}) {
  const { bid } = useIdentity();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!bid) return;
    fetch(
      `${API}/api/void/communities?limit=100&browserId=${encodeURIComponent(bid)}`,
    )
      .then((r) => r.json())
      .then((d) =>
        setCommunities(
          (d.communities || []).filter((c: Community) => c.isMember),
        ),
      )
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, [bid]);

  const filtered = search.trim()
    ? communities.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      )
    : communities;

  return (
    <div
      className="vl-sidebar"
      style={{
        width: 280,
        flexShrink: 0,
        background: "#fff",
        borderRight: "1px solid #e8e8f4",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid #f0f0fa",
          flexShrink: 0,
          background: "linear-gradient(160deg,#fafafe 0%,#f3f1ff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <a
            href="/community"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "linear-gradient(135deg,#673de6,#4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 900,
              fontSize: 16,
              flexShrink: 0,
              textDecoration: "none",
              boxShadow: "0 4px 12px #673de640",
            }}
          >
            V
          </a>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "#1a1a2e",
                letterSpacing: "-0.3px",
                lineHeight: 1.2,
              }}
            >
              Void
            </div>
            <div style={{ fontSize: 10, color: "#a0a0bc", fontWeight: 600 }}>
              Communities
            </div>
          </div>
          <button
            onClick={onBack}
            title="Exit"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "#f4f4f8",
              border: "1px solid #e8e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6b6b8a",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#ebe8fc";
              (e.currentTarget as HTMLElement).style.color = "#673de6";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#f4f4f8";
              (e.currentTarget as HTMLElement).style.color = "#6b6b8a";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "white",
            borderRadius: 12,
            padding: "7px 12px",
            border: "1.5px solid #e8e8f4",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            transition: "border-color 0.2s,box-shadow 0.2s",
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#673de6";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 3px #673de618";
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#e8e8f4";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 1px 4px rgba(0,0,0,0.04)";
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: "#b0b0c8", flexShrink: 0 }}
          >
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search communities…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 12.5,
              color: "#1a1a2e",
              fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#b0b0c8",
                padding: 0,
                display: "flex",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Feed button */}
      <div style={{ padding: "8px 8px 0 8px", flexShrink: 0 }}>
        {(() => {
          const isActive = activeSlug === "feed";
          return (
            <button
              onClick={() => onSwitch("feed")}
              className="vl-sb-item"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 8px 10px 10px",
                background: isActive ? "#673de60e" : "transparent",
                border: "none",
                borderLeft: `3px solid ${isActive ? "#673de6" : "transparent"}`,
                borderRadius: "0 10px 10px 0",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.12s,border-color 0.12s",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  flexShrink: 0,
                  background: isActive ? "#673de622" : "#673de614",
                  border: `1.5px solid ${isActive ? "#673de655" : "#673de622"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  transition: "all 0.15s",
                  boxShadow: isActive ? "0 4px 14px #673de630" : "none",
                }}
              >
                🏠
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? "#673de6" : "#1a1a2e",
                    lineHeight: 1.3,
                  }}
                >
                  Feed
                </div>
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 2.5,
                    color: isActive ? "#673de699" : "#a0a0bc",
                  }}
                >
                  All community posts
                </div>
              </div>
              {isActive && (
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#673de6",
                    flexShrink: 0,
                    boxShadow: "0 0 7px #673de699",
                  }}
                />
              )}
            </button>
          );
        })()}
      </div>

      {/* Label */}
      <div style={{ padding: "10px 16px 4px", flexShrink: 0 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#b0b0c8",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Joined · {communities.length}
        </span>
      </div>

      {/* Community list */}
      <div
        className="vl-scroll"
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "#f0f0f8",
                  flexShrink: 0,
                  animation: "vl-skel 1.4s ease infinite",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 11,
                    width: "62%",
                    borderRadius: 99,
                    background: "#f0f0f8",
                    marginBottom: 7,
                    animation: "vl-skel 1.4s ease infinite",
                  }}
                />
                <div
                  style={{
                    height: 9,
                    width: "38%",
                    borderRadius: 99,
                    background: "#f0f0f8",
                    animation: "vl-skel 1.4s ease infinite",
                  }}
                />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 16px",
              color: "#b0b0c8",
            }}
          >
            <div style={{ fontSize: 34, marginBottom: 8 }}>
              {search ? "🔍" : "🌐"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {search ? "No results" : "No communities joined"}
            </div>
          </div>
        ) : (
          filtered.map((c) => {
            const isActive = c.slug === activeSlug;
            const accent = c.color || "#673de6";
            return (
              <button
                key={c._id}
                onClick={() => onSwitch(c.slug)}
                className="vl-sb-item"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px 10px 13px",
                  background: isActive ? accent + "0e" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? accent : "transparent"}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s,border-color 0.12s",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    flexShrink: 0,
                    background: isActive ? accent + "22" : accent + "14",
                    border: `1.5px solid ${isActive ? accent + "55" : accent + "22"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    transition: "all 0.15s",
                    boxShadow: isActive ? `0 4px 14px ${accent}30` : "none",
                  }}
                >
                  {c.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? accent : "#1a1a2e",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: 1.3,
                      transition: "color 0.12s",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 2.5,
                      color: isActive ? accent + "99" : "#a0a0bc",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="9"
                        cy="7"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {c.memberCount?.toLocaleString() ?? 0} members
                  </div>
                </div>
                {isActive && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: accent,
                      flexShrink: 0,
                      boxShadow: `0 0 7px ${accent}99`,
                    }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid #f0f0fa",
          flexShrink: 0,
          background: "#fafafd",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e88",
          }}
        />
        <span style={{ fontSize: 11, color: "#a0a0bc", fontWeight: 600 }}>
          {communities.length}{" "}
          {communities.length === 1 ? "community" : "communities"} joined
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY PANEL
// ─────────────────────────────────────────────────────────────────────────────
function CommunityPanel({
  slug,
  onOpenPost,
  onBack,
  initTab,
  onSwitchCommunity,
}: {
  slug: string;
  onOpenPost: (s: string) => void;
  onBack: () => void;
  initTab?: string;
  onSwitchCommunity: (s: string) => void;
}) {
  const { bid, isLoggedIn } = useIdentity();
  const {user} = useAuth()
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
    setCommunity(null);
    setPosts([]);
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
    const r = await fetch(`${API}/api/void/communities/${slug}/join`, {
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
      saveJoinedCommunity(bid, slug, !community.isMember);
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

  const accentColor = community?.color || "#673de6";
  const isChat = tab === "chat";

  if (loading)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#f4f5fb",
        }}
      >
        <div
          style={{
            height: 58,
            background: "white",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 16px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#f0f0f8",
              animation: "vl-skel 1.4s ease infinite",
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 12,
                width: 160,
                borderRadius: 99,
                background: "#f0f0f8",
                marginBottom: 7,
                animation: "vl-skel 1.4s ease infinite",
              }}
            />
            <div
              style={{
                height: 9,
                width: 90,
                borderRadius: 99,
                background: "#f0f0f8",
                animation: "vl-skel 1.4s ease infinite",
              }}
            />
          </div>
        </div>
        <div style={{ padding: "14px 14px 0" }}>
          <SkelCard tall />
          <SkelCard />
          <SkelCard />
        </div>
      </div>
    );

  if (!community)
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "40px 24px",
          textAlign: "center",
          background: "#f4f5fb",
        }}
      >
        <div style={{ fontSize: 52 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>
          Community not found
        </div>
        <button
          onClick={onBack}
          style={{
            padding: "9px 22px",
            borderRadius: 12,
            background: "#673de6",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          ← Go back
        </button>
      </div>
    );

  return (
    <div
      className="vl-fade"
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        background: isChat ? "#eef1f8" : "#f4f5fb",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: isChat
            ? `linear-gradient(135deg,${accentColor}e8,${accentColor}bb)`
            : "white",
          padding: "0 16px",
          height: 58,
          display: "flex",
          alignItems: "center",
          gap: 11,
          flexShrink: 0,
          zIndex: 40,
          boxShadow: isChat ? `0 2px 20px ${accentColor}44` : "0 1px 0 #eee",
          transition: "background 0.3s",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            flexShrink: 0,
            background: isChat ? "rgba(255,255,255,0.22)" : accentColor + "18",
            border: isChat
              ? "1.5px solid rgba(255,255,255,0.35)"
              : `1.5px solid ${accentColor}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 19,
          }}
        >
          {community.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: isChat ? "white" : "#1a1a2e",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {community.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: isChat ? "rgba(255,255,255,0.72)" : "#a0a0bc",
              marginTop: 1,
            }}
          >
            {isChat
              ? `${community.memberCount.toLocaleString()} members`
              : `${community.memberCount.toLocaleString()} members · ${community.postCount} posts`}
          </div>
        </div>
        {!community.isMember && (
          <button
            onClick={toggleJoin}
            style={{
              padding: "6px 16px",
              borderRadius: 99,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
              background: isChat ? "rgba(255,255,255,0.22)" : accentColor,
              color: "white",
              border: isChat ? "1.5px solid rgba(255,255,255,0.45)" : "none",
              boxShadow: isChat ? "none" : `0 4px 14px ${accentColor}44`,
            }}
          >
            Join
          </button>
        )}
        <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 7,
              display: "flex",
              borderRadius: 9,
              color: isChat ? "rgba(255,255,255,0.88)" : "#6b6b8a",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="vl-menu"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                background: "white",
                borderRadius: 18,
                minWidth: 214,
                boxShadow:
                  "0 8px 40px rgba(0,0,0,0.13),0 2px 8px rgba(0,0,0,0.06)",
                zIndex: 200,
                overflow: "hidden",
                border: "1px solid #f0f0f6",
              }}
            >
              <div
                style={{
                  padding: "12px 16px 10px",
                  borderBottom: "1px solid #f4f4f8",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    background: accentColor + "18",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 15,
                  }}
                >
                  {community.emoji}
                </div>
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}
                >
                  {community.name}
                </div>
              </div>
              {[
                {
                  icon: "ℹ️",
                  label: "Group details",
                  action: () => {
                    setShowGroupDetails(true);
                    setMenuOpen(false);
                  },
                },
                {
                  icon: "🔔",
                  label: "Mute notifications",
                  action: () => {
                    toast.show("Muted");
                    setMenuOpen(false);
                  },
                },
                ...(community.isMember
                  ? [
                      {
                        icon: "🏆",
                        label: "Leaderboard",
                        action: () => {
                          setShowLeaderboard(true);
                          setMenuOpen(false);
                        },
                      },
                    ]
                  : []),
                {
                  icon: "🔗",
                  label: "Copy link",
                  action: () => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/community?c=${slug}`,
                    );
                    toast.show("Copied ✓");
                    setMenuOpen(false);
                  },
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    width: "100%",
                    padding: "11px 16px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: "#1a1a2e",
                    fontWeight: 500,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "#f8f7ff")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "none")
                  }
                >
                  <span
                    style={{ fontSize: 16, width: 22, textAlign: "center" }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
              {community.isMember && (
                <>
                  <div
                    style={{
                      height: 1,
                      background: "#f4f4f8",
                      margin: "2px 12px",
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowLeaveConfirm(true);
                      setMenuOpen(false);
                    }}
                    style={{
                      width: "100%",
                      padding: "11px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 13,
                      color: "#e53e3e",
                      fontWeight: 600,
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "#fff5f5")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "none")
                    }
                  >
                    <span
                      style={{ fontSize: 16, width: 22, textAlign: "center" }}
                    >
                      🚪
                    </span>
                    Leave group
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
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
            className={tab === t ? "vl-tab-active" : ""}
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
              gap: 6,
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
                  <span style={{ fontSize: 10, marginLeft: 2 }}>🔒</span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {tab === "posts" && (
          <div
            className="vl-scroll"
            style={{ flex: 1, overflowY: "auto", padding: "12px 14px 100px" }}
          >
            {!community.isMember && (
              <div
                className="vl-fade"
                style={{
                  background: "white",
                  borderRadius: 18,
                  padding: "16px 18px",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                  border: `1px solid ${accentColor}22`,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: accentColor + "16",
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
                      marginBottom: 3,
                    }}
                  >
                    Join to participate
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b6b8a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
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
                  border: `1.5px dashed ${accentColor}55`,
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
                    `${accentColor}55`)
                }
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: accentColor + "16",
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
                  community={slug}
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
                  className="vl-post vl-fade"
                  style={{ animationDelay: `${i * 0.025}s` }}
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
                    onOpenCommunity={onSwitchCommunity}
                  />
                </div>
              ))
            )}
          </div>
        )}
        {tab === "chat" && (
          <GDRoom
            communitySlug={slug}
            communityName={community.name}
            accentColor={accentColor}
            isMember={community.isMember}
            onJoin={toggleJoin}
          />
        )}
      </div>

      {/* Delete modal */}
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
              animation: "vl-fade 0.2s ease both",
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
          slug={slug}
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
            Join this community to access the GD Room.
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
      <div
        className="vl-scroll"
        style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}
      >
        {msgs.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 8,
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
                      ? `linear-gradient(135deg,${accentColor},${accentColor}cc)`
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
          padding: "8px 14px 12px",
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
            {connected ? "Live · updates every 2.5s" : "Connecting…"}
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
              flexShrink: 0,
              background:
                txt.trim() && !sending
                  ? `linear-gradient(135deg,${accentColor},${accentColor}bb)`
                  : "#e2e2ef",
              color: txt.trim() && !sending ? "white" : "#b0b0c8",
              cursor: txt.trim() && !sending ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
// MODALS
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
          animation: "vl-fade 0.25s ease both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg,${accentColor},${accentColor}88)`,
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
          animation: "vl-fade 0.2s ease both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg,#f97316,#ef4444)",
          }}
        />
        <div style={{ padding: "28px 28px 24px" }}>
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
                background: "linear-gradient(135deg,#f97316,#ef4444)",
                border: "none",
                color: "white",
                cursor: "pointer",
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
        className="vl-fade"
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
            }}
          >
            ✕
          </button>
        </div>
        <div
          className="vl-scroll"
          style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}
        >
          {loading ? (
            <div style={{ padding: 20 }}>
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
