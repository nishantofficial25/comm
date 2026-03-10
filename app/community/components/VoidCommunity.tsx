"use client";
// VoidCommunity — mobile-first redesign + auth-gated community posts

import { useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import Leaderboard from "./Leaderboard";
import LoginGate from "./loginGate";

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f4f8",
        fontFamily: "'Inter',system-ui,sans-serif",
        color: "#1a1a2e",
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

      {/* Navbar */}
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
              className="vc-hide-xs"
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
              ["communities", "Peer Group", goCommunities, "🌐"],
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
                  (e.currentTarget as HTMLElement).style.background = "white";
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
              (e.currentTarget as HTMLElement).style.background = "white";
              (e.currentTarget as HTMLElement).style.color = "#1a1a2e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
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
              <span className="vc-hide-xs">Sign in</span>
              <span className="vc-show-xs">👤</span>
            </button>
          )}
          <button
            onClick={() => setShowLoginGate(true)}
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
            <span>Study</span>
            {/* <span className="vc-show-xs">👤</span> */}
          </button>
        </div>
      </nav>

      {/* Content */}
      <div
        style={{ maxWidth: 760, margin: "0 auto", padding: "16px 12px 96px" }}
      >
        {postSlug ? (
          <VcThread
            slug={postSlug}
            onBack={goHome}
            onOpenCommunity={openCommunity}
          />
        ) : viewParam === "myposts" ? (
          <VcMyPosts onOpen={openPost} onOpenCommunity={openCommunity} />
        ) : viewParam === "communities" && communitySlug ? (
          <VcCommunityDetail
            slug={communitySlug}
            onBack={goCommunities}
            onOpenPost={openPost}
            initTab={chatTab || "posts"}
          />
        ) : viewParam === "communities" ? (
          <VcCommunitiesPage onOpen={openCommunity} />
        ) : (
          <VcFeed onOpen={openPost} onOpenCommunity={openCommunity} />
        )}
      </div>

      {/* Mobile bottom nav */}
      <div className="vc-bottom-nav">
        {(
          [
            ["feed", "🏠", "Feed", goHome],
            ["myposts", "📝", "My Posts", goMyPosts],
            ["communities", "🌐", "Peer Group", goCommunities],
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
  
  /* Bottom nav: hidden on desktop */
  .vc-bottom-nav { display:none; }

  @media (max-width:640px) {
    .vc-hide-xs { display:none !important; }
    .vc-show-xs { display:inline !important; }
    
    /* Show mobile bottom nav */
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
    
    /* Hide desktop nav links on mobile (shown in bottom nav instead) */
    nav button.vc-desktop-nav { display:none !important; }
  }
`;
