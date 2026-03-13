"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import Leaderboard from "../components/Leaderboard";
import LoginGate from "../components/loginGate";

// ── Sidebar (desktop only) ────────────────────────────────────────────────────
/* function CommunitySidebar({
  activeCommunitySlug,
  onOpen,
  onBrowse,
}: {
  activeCommunitySlug: string | null;
  onOpen: (slug: string) => void;
  onBrowse: () => void;
}) {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.hindanbazar.cloud/api/void/communities?limit=50")
      .then((r) => r.json())
      .then((d) =>
        setCommunities((d.communities || []).filter((c: any) => c.isMember)),
      )
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside className="vc-sidebar">
      <div
        style={{
          padding: "16px 14px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: "#a0a0bc",
          }}
        >
          My Communities
        </span>
        <button
          onClick={onBrowse}
          title="Browse all"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#673de6",
            padding: 2,
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div style={{ overflowY: "auto" as const, flex: 1 }}>
        {loading ? (
          [0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "#e2e2ef",
                  flexShrink: 0,
                }}
                className="vc-skel"
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 10,
                    width: "70%",
                    borderRadius: 99,
                    background: "#e2e2ef",
                    marginBottom: 5,
                  }}
                  className="vc-skel"
                />
                <div
                  style={{
                    height: 8,
                    width: "45%",
                    borderRadius: 99,
                    background: "#e2e2ef",
                  }}
                  className="vc-skel"
                />
              </div>
            </div>
          ))
        ) : communities.length === 0 ? (
          <div style={{ padding: "12px 14px 8px" }}>
            <div
              style={{
                fontSize: 12,
                color: "#a0a0bc",
                lineHeight: 1.5,
                marginBottom: 10,
              }}
            >
              You haven't joined any communities yet.
            </div>
            <button
              onClick={onBrowse}
              style={{
                width: "100%",
                padding: "8px 0",
                borderRadius: 10,
                background: "linear-gradient(135deg,#673de6,#4f46e5)",
                color: "white",
                border: "none",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Browse Communities
            </button>
          </div>
        ) : (
          <>
            {communities.map((c) => {
              const isActive = c.slug === activeCommunitySlug;
              return (
                <button
                  key={c._id}
                  onClick={() => onOpen(c.slug)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 14px",
                    background: isActive ? c.color + "12" : "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left" as const,
                    borderLeft: isActive
                      ? `3px solid ${c.color}`
                      : "3px solid transparent",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "#f4f4f8";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "none";
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: c.color + "18",
                      border: `1.5px solid ${c.color}25`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {c.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? c.color : "#1a1a2e",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap" as const,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "#a0a0bc", marginTop: 1 }}
                    >
                      {c.memberCount?.toLocaleString() ?? 0} members
                    </div>
                  </div>
                  {isActive && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: c.color,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </button>
              );
            })}
            <button
              onClick={onBrowse}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                borderLeft: "3px solid transparent",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#f4f4f8")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "none")
              }
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "#f4f4f8",
                  border: "1.5px dashed #d4d4e8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                  color: "#a0a0bc",
                }}
              >
                +
              </div>
              <span style={{ fontSize: 12, color: "#a0a0bc", fontWeight: 600 }}>
                Browse all
              </span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
} */

export default function VoidCommunity() {
  return (
    <Suspense
      fallback={<div style={{ minHeight: "100vh", background: "#f4f4f8" }} />}
    >
      <Inner />
    </Suspense>
  );
}



function Inner() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { user, logout } = useAuth();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);

  const postSlug = sp.get("post");
  const viewParam = sp.get("view");
  const communitySlug = sp.get("c");
  const chatTab = sp.get("tab");

  const params = useSearchParams();
  const postId = params.get("post");

  const handleback = () => {
    router.back();
  };

  const push = (p: Record<string, string>) =>
    router.push(`${pathname}?${new URLSearchParams(p)}`);
  const goHome = () => router.push(pathname);
  const openPost = (slug: string) => push({ post: slug });
  const goMyPosts = () => {
    if (!user) {
      setShowLoginGate(true);
      return;
    }
    push({ view: "myposts" });
  };
  const goCommunities = () => push({ view: "communities" });
  const openCommunity = (slug: string) =>
    push({ view: "communities", c: slug });

  const activeView = postSlug
    ? "thread"
    : viewParam === "myposts"
      ? "myposts"
      : viewParam === "communities"
        ? "communities"
        : "feed";

  // When a specific community is open, hide site chrome — VcCommunityDetail
  // renders its own header and owns the full viewport.
  const communityOpen = viewParam === "communities" && !!communitySlug;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: communityOpen ? "transparent" : "#f4f4f8",
        fontFamily: "'Inter',system-ui,sans-serif",
        color: "#1a1a2e",
        // When community is open: let it fill the full viewport as a stacked layer
        ...(communityOpen
          ? { position: "fixed", inset: 0, zIndex: 10, overflow: "hidden" }
          : {}),
      }}
    >
      <style>{VcCSS}</style>

      {showLeaderboard && (
        <Leaderboard onClose={() => setShowLeaderboard(false)} />
      )}
      {showLoginGate && (
        <LoginGate
          reason="Sign in to continue"
          onClose={() => setShowLoginGate(false)}
        />
      )}

      {/* ══ TOP NAVBAR — hidden when a community is open ══ */}
      {!communityOpen && (
        <nav
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: "white",
            borderBottom: "1px solid #e2e2ef",
            boxShadow: "0 1px 4px #00000008",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 12px",
              height: 52,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {/* Logo */}
            <button
              onClick={goHome}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                marginRight: 4,
                flexShrink: 0,
              }}
            >
              {postId && (
                <button
                  onClick={handleback}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 4px 6px 0",
                    display: "flex",
                    color: "black",
                    flexShrink: 0,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M19 12H5M5 12l7-7M5 12l7 7"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#673de6,#4f46e5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 900,
                  fontSize: 14,
                }}
              >
                V
              </div>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: 15,
                  color: "#1a1a2e",
                  letterSpacing: "-0.3px",
                }}
              >
                Void
              </span>
            </button>
            <div style={{ flex: 1 }} />

            {/* Nav links */}
            {(
              [
                ["feed", "Feed", goHome, "🏠"],
                ["myposts", "My Posts", goMyPosts, "📝"],
                ["communities", "Community", goCommunities, "🌐"],
              ] as [string, string, () => void, string][]
            ).map(([k, label, fn, icon]) => (
              <button
                key={k}
                onClick={fn}
                className="vc-hide-xs"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "6px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: "none",
                  background: activeView === k ? "#673de6" : "transparent",
                  color: activeView === k ? "white" : "#6b6b8a",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  if (activeView !== k) {
                    (e.currentTarget as HTMLElement).style.background =
                      "#f4f4f8";
                    (e.currentTarget as HTMLElement).style.color = "#1a1a2e";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeView !== k) {
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#6b6b8a";
                  }
                }}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}

            {/* Leaderboard */}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="vc-hide-xs"
              style={{
                fontSize: 13,
                fontWeight: 700,
                padding: "6px 10px",
                borderRadius: 10,
                cursor: "pointer",
                background: "transparent",
                border: "none",
                color: "#6b6b8a",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "#f4f4f8";
                (e.currentTarget as HTMLElement).style.color = "#1a1a2e";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color = "#6b6b8a";
              }}
            >
              🏆 <span>Board</span>
            </button>

            {/* Account */}
            {user ? (
              user.picture ? (
                <button
                  onClick={logout}
                  title="Sign out"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                  className="vc-hide-xs"
                >
                  <img
                    src={user.picture}
                    alt={user.displayName}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "2px solid #e2e2ef",
                      objectFit: "cover",
                    }}
                  />
                </button>
              ) : (
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#673de620",
                    border: "2px solid #673de640",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    color: "#673de6",
                    flexShrink: 0,
                  }}
                >
                  {user.displayName[0]?.toUpperCase()}
                </div>
              )
            ) : (
              <button
                onClick={() => setShowLoginGate(true)}
                className="vc-hide-xs"
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  background: "#673de6",
                  border: "none",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                Sign in
              </button>
            )}

            <a
              href="/myworkplace"
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                background: "#673de6",
                border: "none",
                color: "white",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                flexShrink: 0,
                textDecoration: "none",
              }}
            >
              Study
            </a>
          </div>
        </nav>
      )}

      {/* ══ PAGE CONTENT ══ */}
      {communityOpen ? (
        // Community open: full-screen takeover, no sidebar, no nav
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <VcCommunityDetail
            slug={communitySlug!}
            onBack={goCommunities}
            onOpenPost={openPost}
            initTab={chatTab || "posts"}
          />
        </div>
      ) : (
        // Normal layout: sidebar (desktop) + main content
        <div className="vc-layout">
          {/* Sidebar — desktop only, shows joined communities */}
          {/* <CommunitySidebar
            activeCommunitySlug={communitySlug}
            onOpen={openCommunity}
            onBrowse={goCommunities}
          /> */}

          {/* Main feed area */}
          <main className="vc-main">
            {postSlug ? (
              <VcThread
                slug={postSlug}
                onBack={goHome}
                onOpenCommunity={openCommunity}
              />
            ) : viewParam === "myposts" ? (
              <VcMyPosts onOpen={openPost} onOpenCommunity={openCommunity} />
            ) : viewParam === "communities" ? (
              <VcCommunitiesPage onOpen={openCommunity} />
            ) : (
              <VcFeed onOpen={openPost} onOpenCommunity={openCommunity} />
            )}
          </main>
        </div>
      )}

      {/* ══ MOBILE BOTTOM NAV — hidden when community is open ══ */}
      {!communityOpen && (
        <div className="vc-bottom-nav">
          {(
            [
              ["feed", "🏠", "Feed", goHome],
              ["myposts", "📝", "My Posts", goMyPosts],
              ["communities", "🌐", "Community", goCommunities],
              ["board", "🏆", "Board", () => setShowLeaderboard(true)],
            ] as [string, string, string, () => void][]
          ).map(([k, icon, label, fn]) => (
            <button
              key={k}
              onClick={fn}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: activeView === k ? "#673de6" : "#a0a0bc",
                transition: "color 0.15s",
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
            </button>
          ))}

          {user ? (
            <button
              onClick={logout}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#a0a0bc",
              }}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span style={{ fontSize: 20 }}>👤</span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700 }}>Me</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLoginGate(true)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "8px 4px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#673de6",
              }}
            >
              <span style={{ fontSize: 20 }}>👤</span>
              <span style={{ fontSize: 10, fontWeight: 700 }}>Sign in</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import VcFeed from "../vc/VcFeed";
import VcThread from "../vc/VcThread";
import VcMyPosts from "../vc/VcMyPosts";
import VcCommunitiesPage from "../vc/VcCommunitiesPage";
import VcCommunityDetail from "../vc/VcCommunityDetail";

const VcCSS = `
  @keyframes vcFadeUp  {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes vcSlideUp {from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes vcToastIn {from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
  @keyframes vcPulse   {0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes vcSkel    {0%,100%{background:#e2e2ef}50%{background:#ebe8fc}}
  .vc-fadein    {animation:vcFadeUp  0.25s ease;}
  .vc-slidein   {animation:vcSlideUp 0.2s  ease;}
  .vc-toastin   {animation:vcToastIn 0.2s  ease;}
  .vc-pulse     {animation:vcPulse   2s    ease infinite;}
  .vc-skel      {animation:vcSkel    1.4s  ease infinite;}
  .vc-hide-xs   { display:inline; }
  .vc-show-xs   { display:none; }
  .line-clamp-2 {display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
  * {box-sizing:border-box;}
  ::placeholder {color:#a0a0bc;}
  select option  {background:white;color:#1a1a2e;}

  .vc-bottom-nav { display:none; }

  /* Layout: sidebar + main */
  .vc-layout {
    display: flex;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 8px;
    gap: 0;
    align-items: flex-start;
  }

  /* Sidebar */
  .vc-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: white;
    border: 1px solid #e2e2ef;
    border-radius: 16px;
    box-shadow: 0 1px 4px #00000006;
    position: sticky;
    top: 60px;
    max-height: calc(100vh - 72px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin-top: 8px;
  }

  /* Main content */
  .vc-main {
    flex: 1;
    min-width: 0;
    padding: 8px 0 96px 12px;
  }

  @media (max-width: 900px) {
    /* Hide sidebar on tablet/mobile */
    .vc-sidebar { display: none !important; }
    .vc-layout { padding: 0 4px; }
    .vc-main { padding-left: 0; }
  }

  @media (max-width:640px) {
    .vc-hide-xs { display:none !important; }
    .vc-show-xs { display:inline !important; }

    .vc-bottom-nav {
      display:flex;
      position:fixed;
      bottom:0; left:0; right:0;
      background:white;
      border-top:1px solid #e2e2ef;
      box-shadow:0 -4px 20px #00000010;
      z-index:100;
      padding:0;
      padding-bottom:env(safe-area-inset-bottom,0px);
    }
  }
`;
