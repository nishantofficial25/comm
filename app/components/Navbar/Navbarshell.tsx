// components/Navbar/NavbarShell.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, BookOpen } from "lucide-react";
import ToolsDropdownClient from "./ToolsDropdown";
import {
  getBrowserId,
  getLocalUnreadCount,
  setLocalUnreadCount,
} from "@/lib/browser";

const ROUTE_THEMES: Record<
  string,
  { accent: string; light: string; border: string; text: string; glow: string }
> = {
  "/": {
    accent: "#16a34a",
    light: "#f0fdf4",
    border: "#86efac",
    text: "#15803d",
    glow: "rgba(22,163,74,0.18)",
  },
  "/imageresizer": {
    accent: "#f97316",
    light: "#fff7ed",
    border: "#fdba74",
    text: "#c2410c",
    glow: "rgba(249,115,22,0.18)",
  },
  "/pdfcompressor": {
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#93c5fd",
    text: "#1d4ed8",
    glow: "rgba(37,99,235,0.18)",
  },
  "/imagetopdfconvertor": {
    accent: "#7c3aed",
    light: "#f5f3ff",
    border: "#c4b5fd",
    text: "#6d28d9",
    glow: "rgba(124,58,237,0.18)",
  },
  "/image-resizer": {
    accent: "#f97316",
    light: "#fff7ed",
    border: "#fdba74",
    text: "#c2410c",
    glow: "rgba(249,115,22,0.18)",
  },
  "/pdf-compressor": {
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#93c5fd",
    text: "#1d4ed8",
    glow: "rgba(37,99,235,0.18)",
  },
  "/image-to-pdf": {
    accent: "#7c3aed",
    light: "#f5f3ff",
    border: "#c4b5fd",
    text: "#6d28d9",
    glow: "rgba(124,58,237,0.18)",
  },
  "/tools/imageresizer": {
    accent: "#f97316",
    light: "#fff7ed",
    border: "#fdba74",
    text: "#c2410c",
    glow: "rgba(249,115,22,0.18)",
  },
  "/tools/pdfcompressor": {
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#93c5fd",
    text: "#1d4ed8",
    glow: "rgba(37,99,235,0.18)",
  },
  "/tools/imagetopdf": {
    accent: "#7c3aed",
    light: "#f5f3ff",
    border: "#c4b5fd",
    text: "#6d28d9",
    glow: "rgba(124,58,237,0.18)",
  },
  "/blog": {
    accent: "#6366f1",
    light: "#eef2ff",
    border: "#c7d2fe",
    text: "#4338ca",
    glow: "rgba(99,102,241,0.18)",
  },
  "/notifications": {
    accent: "#0f172a",
    light: "#f8fafc",
    border: "#e2e8f0",
    text: "#0f172a",
    glow: "rgba(15,23,42,0.10)",
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function NavbarShell() {
  const pathname = usePathname();
  const cleanPath = pathname?.replace(/\/$/, "") || "/";

  const themeKey =
    cleanPath === "/blog" || cleanPath.startsWith("/blog/")
      ? "/blog"
      : cleanPath;

  const theme = ROUTE_THEMES[themeKey] ?? ROUTE_THEMES["/"];
  const isNotifPage = cleanPath === "/notifications";
  const isBlogPage = cleanPath === "/blog" || cleanPath.startsWith("/blog/");

  const [unread, setUnread] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prevTheme, setPrevTheme] = useState(theme);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (prevTheme.accent !== theme.accent) {
      setTransitioning(true);
      const t = setTimeout(() => {
        setPrevTheme(theme);
        setTransitioning(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [theme.accent]);

  useEffect(() => {
    setMounted(true);
    const local = getLocalUnreadCount();
    setUnread(local);
    const bid = getBrowserId();
    if (!bid) return;
    fetch(`${API_BASE}/api/inbox/${encodeURIComponent(bid)}/unread-count`)
      .then((r) => r.json())
      .then((d) => {
        const n = d.unreadCount ?? 0;
        setUnread(n);
        setLocalUnreadCount(n);
        if (n > 0 && local === 0) {
          setShaking(true);
          setTimeout(() => setShaking(false), 1000);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => {
      setUnread((prev) => {
        const next = prev + 1;
        setLocalUnreadCount(next);
        setShaking(true);
        setTimeout(() => setShaking(false), 1000);
        return next;
      });
    };
    window.addEventListener("sahiphoto:new-inbox-item", handler);
    return () =>
      window.removeEventListener("sahiphoto:new-inbox-item", handler);
  }, []);

  useEffect(() => {
    if (isNotifPage && mounted) {
      setUnread(0);
      setLocalUnreadCount(0);
    }
  }, [isNotifPage, mounted]);

  return (
    <>
      <div className="sp-navbar flex items-center justify-between py-2.5 px-1">
        {/* ── Logo ── */}
        <Link href="/" className="no-underline group sp-logo-link">
          <div className="flex items-baseline gap-0">
            <span className="sp-logo-text">SahiPhoto</span>
            <span
              className="sp-logo-dot transition-all duration-500 ease-out"
              style={{
                color: theme.accent,
                textShadow: `0 0 12px ${theme.glow}`,
              }}
            >
              .in
            </span>
          </div>
          <p className="sp-tagline">Resize Documents in one Click!</p>
        </Link>

        {/* ── Right actions ── */}
        <div className="sp-actions">
          {/* Blog link */}
          <Link
            href="/blog"
            className={`sp-icon-btn sp-blog-btn ${isBlogPage ? "sp-icon-btn--active" : ""}`}
            style={
              isBlogPage
                ? {
                    color: theme.text,
                    background: theme.light,
                    borderColor: theme.border,
                  }
                : {}
            }
            aria-label="Blog guides"
            aria-current={isBlogPage ? "page" : undefined}
          >
            <BookOpen
              size={16}
              strokeWidth={2.2}
              style={{ color: isBlogPage ? theme.accent : undefined }}
            />
            <span className="sp-btn-label">Blog</span>
          </Link>

          {/* Bell icon */}
          <Link
            href="/notifications"
            className={`sp-icon-btn sp-bell-btn ${isNotifPage ? "sp-icon-btn--active" : ""}`}
            style={
              isNotifPage
                ? {
                    color: theme.text,
                    background: theme.light,
                    borderColor: theme.border,
                  }
                : {}
            }
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          >
            <Bell
              size={16}
              strokeWidth={2.2}
              className={shaking ? "sp-shake" : ""}
              style={
                unread > 0 && !isNotifPage
                  ? {
                      color: theme.accent,
                      filter: `drop-shadow(0 0 4px ${theme.glow})`,
                    }
                  : {}
              }
            />
            <span className="sp-btn-label">Inbox</span>

            {mounted && unread > 0 && !isNotifPage && (
              <span
                className="sp-badge"
                style={{
                  background: `linear-gradient(135deg, #ef4444, #dc2626)`,
                  boxShadow: "0 2px 6px rgba(239,68,68,0.5)",
                }}
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>

          <ToolsDropdownClient />
        </div>
      </div>

      <style>{`
        /* ── Logo ─────────────────────────── */
        .sp-logo-link { display: flex; flex-direction: column; gap: 0; }
        .sp-logo-text {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.2;
        }
        .sp-logo-dot {
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .sp-tagline {
          margin: 0;
          font-size: 11px;
          color: #94a3b8;
          font-weight: 400;
          line-height: 1.2;
        }

        /* ── Actions row ─────────────────── */
        .sp-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* ── Icon buttons ────────────────── */
        .sp-icon-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          text-decoration: none;
          transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s;
          white-space: nowrap;
        }
        .sp-icon-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }
        .sp-icon-btn--active {
          border-color: transparent;
          font-weight: 700;
        }

        /* Show text label only on sm+ */
        .sp-btn-label {
          display: none;
        }
        @media (min-width: 480px) {
          .sp-btn-label { display: inline; }
        }

        /* Active dot */
        .sp-active-dot {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }

        /* Badge */
        .sp-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 99px;
          color: white;
          font-size: 9.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          ring: 2px solid white;
          animation: sp-pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          border: 2px solid white;
        }

        /* Bell padding on mobile (no label) */
        .sp-bell-btn { padding: 6px 8px; }
        @media (min-width: 480px) { .sp-bell-btn { padding: 6px 10px; } }

        /* ── Animations ──────────────────── */
        @keyframes sp-shake {
          0%,100% { transform: rotate(0deg); }
          15%      { transform: rotate(-14deg); }
          30%      { transform: rotate(11deg); }
          45%      { transform: rotate(-9deg); }
          60%      { transform: rotate(7deg); }
          75%      { transform: rotate(-4deg); }
          90%      { transform: rotate(3deg); }
        }
        .sp-shake { animation: sp-shake 0.55s ease-in-out; }

        @keyframes sp-pop-in {
          0%   { transform: scale(0); opacity: 0; }
          80%  { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}
