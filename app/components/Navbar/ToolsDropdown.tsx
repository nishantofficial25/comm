// app/components/Navbar/ToolsDropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ImageIcon,
  FileText,
  Images,
  Scan,
  ChevronDown,
  Wrench,
} from "lucide-react";

const ROUTE_THEMES: Record<
  string,
  { accent: string; light: string; border: string; text: string; glow: string }
> = {
  "/": {
    accent: "#16a34a",
    light: "#f0fdf4",
    border: "#86efac",
    text: "#15803d",
    glow: "rgba(22,163,74,0.15)",
  },
  "/imageresizer": {
    accent: "#f97316",
    light: "#fff7ed",
    border: "#fdba74",
    text: "#c2410c",
    glow: "rgba(249,115,22,0.15)",
  },
  "/pdfcompressor": {
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#93c5fd",
    text: "#1d4ed8",
    glow: "rgba(37,99,235,0.15)",
  },
  "/imagetopdfconvertor": {
    accent: "#7c3aed",
    light: "#f5f3ff",
    border: "#c4b5fd",
    text: "#6d28d9",
    glow: "rgba(124,58,237,0.15)",
  },
  "/image-resizer": {
    accent: "#f97316",
    light: "#fff7ed",
    border: "#fdba74",
    text: "#c2410c",
    glow: "rgba(249,115,22,0.15)",
  },
  "/pdf-compressor": {
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#93c5fd",
    text: "#1d4ed8",
    glow: "rgba(37,99,235,0.15)",
  },
  "/image-to-pdf": {
    accent: "#7c3aed",
    light: "#f5f3ff",
    border: "#c4b5fd",
    text: "#6d28d9",
    glow: "rgba(124,58,237,0.15)",
  },
  "/tools/imageresizer": {
    accent: "#f97316",
    light: "#fff7ed",
    border: "#fdba74",
    text: "#c2410c",
    glow: "rgba(249,115,22,0.15)",
  },
  "/tools/pdfcompressor": {
    accent: "#2563eb",
    light: "#eff6ff",
    border: "#93c5fd",
    text: "#1d4ed8",
    glow: "rgba(37,99,235,0.15)",
  },
  "/tools/imagetopdf": {
    accent: "#7c3aed",
    light: "#f5f3ff",
    border: "#c4b5fd",
    text: "#6d28d9",
    glow: "rgba(124,58,237,0.15)",
  },
};

const tools = [
  {
    icon: <Scan size={15} strokeWidth={2.2} />,
    iconColor: "#16a34a",
    iconBg: "#f0fdf4",
    label: "Exam Photo Resizer",
    desc: "SSC, UPSC, Bank & more",
    href: "/",
    badge: "Popular",
  },
  {
    icon: <ImageIcon size={15} strokeWidth={2.2} />,
    iconColor: "#f97316",
    iconBg: "#fff7ed",
    label: "Image Resizer",
    desc: "Exact KB & dimensions",
    href: "/tools/imageresizer",
    badge: null,
  },
  {
    icon: <FileText size={15} strokeWidth={2.2} />,
    iconColor: "#2563eb",
    iconBg: "#eff6ff",
    label: "PDF Compressor",
    desc: "Compress PDF to exact KB",
    href: "/tools/pdfcompressor",
    badge: null,
  },
  {
    icon: <Images size={15} strokeWidth={2.2} />,
    iconColor: "#7c3aed",
    iconBg: "#f5f3ff",
    label: "Image to PDF",
    desc: "Combine photos into PDF",
    href: "/tools/imagetopdf",
    badge: null,
  },
];

export default function ToolsDropdownClient() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const cleanPath = pathname?.replace(/\/$/, "") || "/";
  const theme = ROUTE_THEMES[cleanPath] ?? ROUTE_THEMES["/"];

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={ref} className="td-wrap">
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="td-trigger"
        style={{
          background: open ? theme.light : "#f8fafc",
          borderColor: open ? theme.border : "#e2e8f0",
          boxShadow: open ? `0 0 0 3px ${theme.glow}` : "none",
        }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Wrench
          size={14}
          strokeWidth={2.3}
          style={{
            color: theme.accent,
            filter: open ? `drop-shadow(0 0 4px ${theme.glow})` : "none",
            transition: "filter 0.2s",
          }}
        />
        <span className="td-trigger-label">Tools</span>
        <ChevronDown
          size={12}
          strokeWidth={2.5}
          className="td-chevron"
          style={{
            color: open ? theme.text : "#94a3b8",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="td-panel" role="menu">
          {/* Header */}
          <div
            className="td-header"
            style={{
              background: `linear-gradient(135deg, ${theme.light} 0%, #f8fafc 100%)`,
            }}
          >
            <div className="td-header-inner">
              <span className="td-header-label" style={{ color: theme.text }}>
                sahiphoto.in
              </span>
              <span className="td-header-sub">
                Free tools for exam aspirants
              </span>
            </div>
            <div
              className="td-header-dot"
              style={{
                background: theme.accent,
                boxShadow: `0 0 8px ${theme.glow}`,
              }}
            />
          </div>

          {/* Tool list */}
          <div className="td-list">
            {tools.map((t) => {
              const isActive =
                pathname === t.href || (t.href === "/" && pathname === "");
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  role="menuitem"
                  className={`td-item ${isActive ? "td-item--active" : ""}`}
                  style={
                    isActive
                      ? { background: theme.light, borderColor: theme.border }
                      : {}
                  }
                >
                  <div
                    className="td-item-icon"
                    style={{
                      background: t.iconBg,
                      color: t.iconColor,
                      boxShadow: isActive
                        ? `0 0 0 2px ${t.iconColor}22`
                        : "none",
                    }}
                  >
                    {t.icon}
                  </div>

                  <div className="td-item-text">
                    <div className="td-item-title-row">
                      <span className="td-item-title">{t.label}</span>
                      {t.badge && (
                        <span
                          className="td-badge"
                          style={{
                            background: theme.light,
                            color: theme.text,
                            borderColor: theme.border,
                          }}
                        >
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <span className="td-item-desc">{t.desc}</span>
                  </div>

                  <span
                    className="td-item-arrow"
                    style={{ color: isActive ? theme.accent : "#cbd5e1" }}
                  >
                    ›
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="td-footer">
            <span
              className="td-footer-dot"
              style={{ background: theme.accent }}
            />
            <span>All tools are free · No sign-up needed</span>
          </div>
        </div>
      )}

      <style>{`
        /* ── Wrap ─────────────────────── */
        .td-wrap { position: relative; z-index: 50; }

        /* ── Trigger ──────────────────── */
        .td-trigger {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 11px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          font-size: 12.5px;
          font-weight: 700;
          color: #1e293b;
          background: #f8fafc;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s, box-shadow 0.18s;
          white-space: nowrap;
          font-family: inherit;
        }
        .td-trigger:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .td-trigger-label { color: #1e293b; }
        .td-chevron { transition: transform 0.2s ease, color 0.2s; }

        /* ── Panel ────────────────────── */
        .td-panel {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          width: 260px;
          background: white;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          overflow: hidden;
          z-index: 9999;
          box-shadow: 0 24px 64px rgba(0,0,0,0.11), 0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
          animation: td-drop 0.18s cubic-bezier(0.16,1,0.3,1);
          transform-origin: top right;
        }
        @media (max-width: 360px) { .td-panel { width: 240px; } }

        /* ── Header ───────────────────── */
        .td-header {
          padding: 11px 14px 10px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .td-header-inner { display: flex; flex-direction: column; gap: 1px; }
        .td-header-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .td-header-sub { font-size: 10.5px; color: #94a3b8; font-weight: 500; }
        .td-header-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          transition: background 0.3s, box-shadow 0.3s;
        }

        /* ── List ─────────────────────── */
        .td-list { padding: 6px; display: flex; flex-direction: column; gap: 1px; }

        /* ── Item ─────────────────────── */
        .td-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px;
          border-radius: 10px;
          border: 1px solid transparent;
          text-decoration: none;
          color: inherit;
          transition: background 0.12s, border-color 0.12s;
        }
        .td-item:hover:not(.td-item--active) { background: #f8fafc; }
        .td-item--active { border-color: transparent; }

        .td-item-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: box-shadow 0.2s;
        }
        .td-item-text { flex: 1; min-width: 0; }
        .td-item-title-row { display: flex; align-items: center; gap: 5px; }
        .td-item-title {
          font-size: 12.5px; font-weight: 650; color: #1e293b; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .td-item-desc {
          display: block;
          font-size: 10.5px; color: #94a3b8; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .td-item-arrow {
          font-size: 16px; line-height: 1; flex-shrink: 0;
          transition: color 0.15s;
        }

        /* ── Badge ────────────────────── */
        .td-badge {
          font-size: 9px; font-weight: 800;
          padding: 1.5px 5px;
          border-radius: 99px;
          border: 1px solid;
          letter-spacing: 0.03em;
          line-height: 1.4;
          flex-shrink: 0;
        }

        /* ── Footer ───────────────────── */
        .td-footer {
          padding: 8px 14px;
          background: #f8fafc;
          border-top: 1px solid #f1f5f9;
          font-size: 10px;
          color: #94a3b8;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-weight: 500;
        }
        .td-footer-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
          transition: background 0.3s;
        }

        /* ── Animation ────────────────── */
        @keyframes td-drop {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
