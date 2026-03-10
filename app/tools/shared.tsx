// components/shared.tsx
// PageNavbar + SharedFooter + HiddenSEO
// Server Components — no interactivity needed except navbar dropdown (split below)

import { ImageIcon, FileText, Images, Scan } from "lucide-react";
import NavbarDropdown from "@/components/tools/NavbarDropDown";

/* ── Theme map — single source of truth ─────────────────────────────────── */
export const THEMES = {
  green: {
    color: "#16a34a",
    light: "#f0fdf4",
    border: "#bbf7d0",
    text: "#15803d",
  },
  image: {
    color: "#f97316",
    light: "#fff7ed",
    border: "#fed7aa",
    text: "#ea580c",
  },
  pdf: {
    color: "#2563eb",
    light: "#eff6ff",
    border: "#bfdbfe",
    text: "#1d4ed8",
  },
  imgpdf: {
    color: "#7c3aed",
    light: "#f5f3ff",
    border: "#ddd6fe",
    text: "#6d28d9",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;

export const ALL_TOOLS = [
  {
    icon: "scan",
    label: "Exam Photo Resizer",
    desc: "Resize for SSC, UPSC & more",
    href: "/",
    badge: "Popular",
    themeKey: "green" as ThemeKey,
  },
  {
    icon: "image",
    label: "Image Resizer",
    desc: "Resize photo to exact KB",
    href: "/image-resizer",
    themeKey: "image" as ThemeKey,
  },
  {
    icon: "file",
    label: "PDF Compressor",
    desc: "Compress PDF to exact KB",
    href: "/pdf-compressor",
    themeKey: "pdf" as ThemeKey,
  },
  {
    icon: "images",
    label: "Image to PDF",
    desc: "Combine photos into one PDF",
    href: "/image-to-pdf",
    themeKey: "imgpdf" as ThemeKey,
  },
];


/* ── Shared Footer ──────────────────────────────────────────────────────── */
export function SharedFooter({
  themeKey = "green" as ThemeKey,
  toolName = "",
}) {
  const theme = THEMES[themeKey];
  const tools = [
    { name: "Image Resizer", href: "/tools/imageresizer" },
    { name: "PDF Compressor", href: "/tools/pdfcompressor" },
    { name: "Image to PDF", href: "/tools/imagetopdf" },
  ];
  const kw = [
    "Photo Resize for Exam",
    "Compress Photo to 50KB",
    "Resize Photo Online",
    "JPG Converter",
    "Signature Resize",
    "SSC Photo Size",
    "UPSC Photo Requirements",
    "IBPS Photo Resize",
    "Railway Exam Photo",
    "Passport Size Photo",
  ];

  return (
    <footer
      className="bg-white border-t border-gray-200"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Trust strip */}
      <div
        style={{
          background: theme.light,
          borderBottom: `1px solid ${theme.border}`,
          padding: "18px 24px",
        }}
      >
        <div className="max-w-2xl mx-auto flex flex-wrap gap-6 justify-center">
          {[
            {
              e: "🔒",
              t: "Secure Server Processing",
              d: "Encrypted, protected servers",
            },
            {
              e: "🗑",
              t: "Auto-Deleted After Download",
              d: "Files removed immediately",
            },
            {
              e: "⚡",
              t: "Trusted by Lakhs of Students",
              d: "Powering sahiphoto.in since 2024",
            },
          ].map(({ e, t, d }) => (
            <div key={t} className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-base shrink-0"
                style={{ border: `1px solid ${theme.border}` }}
              >
                {e}
              </div>
              <div>
                <p
                  className="m-0 text-xs font-extrabold"
                  style={{ color: theme.text }}
                >
                  {t}
                </p>
                <p
                  className="m-0 text-[10px]"
                  style={{ color: theme.color, opacity: 0.7 }}
                >
                  {d}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div
        className="max-w-2xl mx-auto px-6 pt-9 pb-5 grid gap-8"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}
      >
        <div>
          <a href={`${process.env.BASE_URL}`} className="no-underline">
            <p
              className="m-0 mb-0.5 font-black text-xl text-gray-900"
              style={{ letterSpacing: "-0.03em" }}
            >
              SahiPhoto<span style={{ color: theme.color }}>.in</span>
            </p>
          </a>
          <p
            className="text-[11px] font-bold m-0 mb-3"
            style={{ color: theme.color }}
          >
            Exam Photo & Document Tools
          </p>
          <p className="text-xs text-gray-500 leading-relaxed m-0 mb-3.5">
            India's trusted platform for accurate government exam photo &
            signature specifications. Free tools for 100+ exams.
          </p>
          <p className="text-[11px] text-gray-400 m-0">
            Built with ❤️ by{" "}
            <strong style={{ color: theme.color }}>Nihal Singh</strong>
            <br />
            <a
              href="mailto:sahiphoto.in@gmail.com"
              className="no-underline"
              style={{ color: theme.color }}
            >
              sahiphoto.in@gmail.com
            </a>
          </p>
        </div>
        <div>
          <p className="m-0 mb-3.5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
            Free Tools
          </p>
          {tools.map((t) => (
            <a
              key={t.name}
              href={t.href}
              className="flex items-center gap-1.5 mb-2.5 no-underline text-[13px]"
              style={{
                fontWeight: t.name === toolName ? 800 : 500,
                color: t.name === toolName ? theme.color : "#64748b",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                style={{
                  background: t.name === toolName ? theme.color : "#e2e8f0",
                }}
              />
              {t.name}
            </a>
          ))}
          <a
            href={`${process.env.BASE_URL}`}
            className="text-xs font-bold no-underline"
            style={{ color: theme.color }}
          >
            ← All Exams on sahiphoto.in
          </a>
        </div>
        <div>
          <p className="m-0 mb-3.5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
            Popular Searches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {kw.map((k) => (
              <span
                key={k}
                className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* SEO paragraph */}
      <div className="max-w-2xl mx-auto px-6 pb-7">
        <p className="text-[11px] text-gray-300 leading-loose m-0">
          <strong className="text-gray-400">sahiphoto.in</strong> provides free
          tools to resize photos for SSC CGL, CHSL, MTS, UPSC, NEET, JEE Main,
          Railway RRB NTPC, IBPS, SBI &amp; 100+ government exams. Compress
          images below 100KB, resize signatures, convert photos to JPG — trusted
          by lakhs of students across India.
        </p>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100 px-6 py-3.5">
        <div className="max-w-2xl mx-auto flex flex-wrap justify-between items-center gap-2.5">
          <p className="m-0 text-[11px] text-gray-400">
            © {new Date().getFullYear()} sahiphoto.in · Helping candidates since
            2024
          </p>
          <div className="flex gap-4">
            {[
              ["Privacy", "https://sahiphoto.in/privacy"],
              ["Terms", "https://sahiphoto.in/terms"],
              ["Contact", "https://sahiphoto.in/contact"],
            ].map(([l, h]) => (
              <a
                key={l}
                href={h}
                className="text-[11px] text-gray-400 no-underline"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Hidden SEO ─────────────────────────────────────────────────────────── */
export function HiddenSEO({ faqs = [] as [string, string][], extraText = "" }) {
  return (
    <div
      aria-hidden="true"
      className="absolute -left-[9999px] w-px h-px overflow-hidden pointer-events-none"
    >
      {extraText && <p>{extraText}</p>}
      {faqs.map(([q, a]) => (
        <div key={q}>
          <h3>{q}</h3>
          <p>{a}</p>
        </div>
      ))}
    </div>
  );
}
