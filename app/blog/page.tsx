"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Fingerprint,
  Search,
  Tag,
  UserCircle2,
  PenLine,
} from "lucide-react";

// ─── BLOG REGISTRY ────────────────────────────────────────────────────────────
export const ALL_BLOGS = [
  {
    slug: "rbi-assistant-fingerprint-upload-fix",
    title: "Fix Your Fingerprint Upload for RBI Assistant, DSSSB ASO & SSC",
    excerpt:
      "Fingerprint rejected on your exam form? Your image must be exactly 240×240 px, JPG, 20–50 KB. Free AI tool fixes it in 10 seconds — no signup needed.",
    category: "Fingerprint",
    tags: ["RBI", "DSSSB", "SSC", "IBPS", "SBI", "Fingerprint"],
    readTime: "5 min",
    date: "Mar 2026",
    icon: Fingerprint,
    accent: "#6366f1",
    accentLight: "#eef2ff",
    accentBorder: "#c7d2fe",
    href: "/blog/fingerprintproblem",
    featured: true,
    badge: "Free Tool",
  },
  {
    slug: "upsc-photo-75-percent-face-coverage",
    title: "UPSC Photo 75% Face Coverage Fix 2026–27 [Free Auto-Crop Tool]",
    excerpt:
      "Getting 'face coverage invalid' on UPSC, NTA, SSC or IBPS form? Your face must fill 75% of the photo height. Fix it instantly with our free AI face-crop tool.",
    category: "Passport Photo",
    tags: ["UPSC", "NTA", "SSC", "Face Coverage", "Passport Photo"],
    readTime: "5 min",
    date: "Feb 2026",
    icon: UserCircle2,
    accent: "#d97706",
    accentLight: "#fffbeb",
    accentBorder: "#fde68a",
    href: "/blog/upscphoto",
    featured: false,
    badge: "Popular",
  },
  {
    slug: "upsc-triple-signature-blank-percentage",
    title: 'Fix UPSC Triple Signature "Blank Percentage > 95.5%" Error 2026',
    excerpt:
      "Stuck on UPSC's blank percentage error? Your triple signature must have signatures filling most of the frame. Resize to 500×350 px, 20–100 KB JPG in seconds with our free tool.",
    category: "Signature",
    tags: ["UPSC", "CSE", "Triple Signature", "Blank Percentage", "OTR"],
    readTime: "5 min",
    date: "Feb 2026",
    icon: PenLine,
    accent: "#16a34a",
    accentLight: "#f0fdf4",
    accentBorder: "#86efac",
    href: "/blog/upsctriplesignature",
    featured: false,
    badge: "Verified Fix",
  },
] as const;

type Blog = (typeof ALL_BLOGS)[number];

const CATEGORIES = [
  "All",
  ...Array.from(new Set(ALL_BLOGS.map((b) => b.category))),
] as const;

// ─── UNIFIED BLOG CARD ────────────────────────────────────────────────────────
function BlogCard({ blog }: { blog: Blog }) {
  const Icon = blog.icon;
  return (
    <Link
      href={blog.href}
      className="group flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all duration-200"
    >
      {/* Top accent strip */}
      <div
        className="relative px-6 pt-6 pb-5 flex items-start justify-between gap-4"
        style={{
          background: blog.accentLight,
          borderBottom: `1px solid ${blog.accentBorder}`,
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: blog.accent }}
        >
          <Icon size={20} strokeWidth={1.4} className="text-white" />
        </div>
        {blog.badge && (
          <span
            className="text-[10px] font-black uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
            style={{ background: blog.accent, color: "#fff" }}
          >
            {blog.badge}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 px-6 py-5 gap-3">
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-semibold">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: blog.accentLight,
              color: blog.accent,
              border: `1px solid ${blog.accentBorder}`,
            }}
          >
            {blog.category}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {blog.readTime}
          </span>
          <span className="ml-auto">{blog.date}</span>
        </div>
        <h2 className="text-[15px] font-extrabold text-slate-900 leading-snug tracking-tight group-hover:text-indigo-700 transition-colors line-clamp-2">
          {blog.title}
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 flex-1">
          {blog.excerpt}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {blog.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200"
            >
              {tag}
            </span>
          ))}
          {blog.tags.length > 4 && (
            <span className="text-[10px] font-semibold text-slate-400 px-1">
              +{blog.tags.length - 4}
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 text-sm font-bold mt-1 transition-all group-hover:gap-2.5"
          style={{ color: blog.accent }}
        >
          Read Guide{" "}
          <ArrowRight
            size={14}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </Link>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function BlogsPage() {
  const [category, setCategory] = useState<string>("All");
  const [query, setQuery] = useState("");

  const filtered = ALL_BLOGS.filter((b) => {
    const matchesCat = category === "All" || b.category === category;
    const q = query.toLowerCase();
    const matchesQuery =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.excerpt.toLowerCase().includes(q) ||
      b.tags.some((t) => t.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="font-sans text-slate-700 bg-white min-h-screen">
      {/* ── PAGE HEADER ── */}
      <header className="max-w-4xl mx-auto px-6 pt-10 pb-10 border-b-2 border-slate-800">
        <div className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-4">
          <BookOpen size={13} />
          SahiPhoto Guides
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-3">
          Exam Form Photo Guides
        </h1>
        <p className="text-base text-slate-500 max-w-xl leading-relaxed mb-7">
          Step-by-step guides to fix photo upload rejections on Indian
          government exam portals — with free AI tools for each.
        </p>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search guides…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium
                       text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400
                       focus:ring-2 focus:ring-indigo-100 transition-all bg-slate-50"
          />
        </div>
      </header>

      {/* ── CATEGORY TABS ── */}
      <div className="max-w-4xl mx-auto px-6 pt-5 pb-2 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const count =
            cat === "All"
              ? ALL_BLOGS.length
              : ALL_BLOGS.filter((b) => b.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                category === cat
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              <Tag size={10} />
              {cat}
              <span
                className={`ml-0.5 font-mono text-[10px] rounded-full px-1.5 ${
                  category === cat
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── GRID ── */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-700 mb-1">
              No guides found
            </p>
            <p className="text-sm text-slate-400">
              Try a different keyword or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filtered.map((b) => (
              <BlogCard key={b.slug} blog={b} />
            ))}
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing{" "}
            <strong className="text-slate-600">{filtered.length}</strong> of{" "}
            <strong className="text-slate-600">{ALL_BLOGS.length}</strong>{" "}
            guides
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={11} /> More guides coming soon
          </span>
        </div>
      </main>
    </div>
  );
}
