// components/NavbarDropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ImageIcon,
  FileText,
  Images,
  Scan,
  Wrench,
} from "lucide-react";
import { THEMES, ALL_TOOLS, type ThemeKey } from "@/app/tools/shared";

const ICONS = { scan: Scan, image: ImageIcon, file: FileText, images: Images };

interface Props {
  themeKey: ThemeKey;
  activeTool: string;
}

export default function NavbarDropdown({ themeKey, activeTool }: Props) {
  const theme = THEMES[themeKey];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-bold text-gray-700 border transition-all duration-150"
        style={{
          background: open ? theme.light : "#f8fafc",
          borderColor: open ? theme.border : "#e2e8f0",
          fontFamily: "inherit",
        }}
      >
        <Wrench size={14} color={theme.color} />
        <span>Tools</span>
        <ChevronDown
          size={13}
          color="#9ca3af"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] w-68 bg-white rounded-2xl border border-gray-200 overflow-hidden z-[9999]"
          style={{
            width: 272,
            boxShadow: "0 10px 40px rgba(0,0,0,0.13)",
            animation: "dropIn 0.14s ease",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3"
            style={{
              background: theme.light,
              borderBottom: `1px solid ${theme.border}`,
            }}
          >
            <p
              className="m-0 text-[10px] font-extrabold uppercase tracking-widest"
              style={{ color: theme.text }}
            >
              sahiphoto.in Tools
            </p>
            <p className="m-0 mt-0.5 text-[11px] text-gray-400">
              Free tools for exam aspirants
            </p>
          </div>

          {/* Links */}
          <div className="p-2">
            {ALL_TOOLS.map((t) => {
              const T = THEMES[t.themeKey];
              const Icon = ICONS[t.icon as keyof typeof ICONS];
              const isActive = t.label === activeTool;
              return (
                <a
                  key={t.label}
                  href={t.href}
                  className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl no-underline transition-colors duration-100 cursor-pointer"
                  style={{ background: isActive ? T.light : "transparent" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = T.light)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = isActive
                      ? T.light
                      : "transparent")
                  }
                  onTouchEnd={() => {
                    window.location.href = t.href;
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: T.light }}
                  >
                    <Icon size={15} color={T.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">
                        {t.label}
                      </span>
                      {t.badge && (
                        <span
                          className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full"
                          style={{ background: T.light, color: T.text }}
                        >
                          ★ {t.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400">{t.desc}</span>
                  </div>
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: T.color }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="m-0 text-[10px] text-gray-400 text-center">
              All tools are free · No sign-up needed
            </p>
          </div>
          <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-5px) } to { opacity:1; transform:translateY(0) } }`}</style>
        </div>
      )}
    </div>
  );
}
