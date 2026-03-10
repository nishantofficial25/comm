"use client";

import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Zap,
  Lock,
  Globe,
  Star,
  CheckCircle2,
  XCircle,
  Minus,
  ScanLine,
  ImageIcon,
  FileText,
  Layers,
  RefreshCw,
  Clock,
  Smartphone,
  Trophy,
} from "lucide-react";

// ── Intersection observer hook ────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Counter animation ─────────────────────────────────────────────────────────
function AnimatedCounter({
  target,
  suffix = "",
  duration = 1600,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView();
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [inView, target, duration]);
  return (
    <span ref={ref}>
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: Zap,
    color: "#f59e0b",
    bg: "#fffbeb",
    title: "Instant Processing",
    desc: "Results in under 10 seconds — no waiting, no queues, no server roundtrips for most operations.",
  },
  {
    icon: Lock,
    color: "#10b981",
    bg: "#ecfdf5",
    title: "100% Private",
    desc: "Files are processed and deleted immediately. We never store, view, or share your documents.",
  },
  {
    icon: ScanLine,
    color: "#7c3aed",
    bg: "#f5f3ff",
    title: "Scan Enhancement",
    desc: "AI-powered scan pipeline removes grey backgrounds, uneven lighting, and noise from signature photos.",
  },
  {
    icon: Globe,
    color: "#2563eb",
    bg: "#eff6ff",
    title: "100+ Exam Profiles",
    desc: "Pre-configured specs for SSC, UPSC, NEET, JEE, Railway, Bank PO, IBPS, AFCAT and many more.",
  },
  {
    icon: RefreshCw,
    color: "#ec4899",
    bg: "#fdf2f8",
    title: "Always Up-to-Date",
    desc: "We track official exam notifications and update photo/signature specs before application windows open.",
  },
  {
    icon: Smartphone,
    color: "#0ea5e9",
    bg: "#f0f9ff",
    title: "Mobile-First",
    desc: "Touch-optimised drag-and-drop, works perfectly on Android and iPhone browsers — no app to install.",
  },
  {
    icon: ImageIcon,
    color: "#f97316",
    bg: "#fff7ed",
    title: "Multi-Format Support",
    desc: "JPG, PNG, HEIC, WebP inputs — always outputs the exact format each portal requires.",
  },
  {
    icon: Layers,
    color: "#16a34a",
    bg: "#f0fdf4",
    title: "Image to PDF",
    desc: "Combine multiple photos into a single PDF, drag to reorder pages, set target KB — all in one step.",
  },
];

const stats = [
  { value: 500000, suffix: "+", label: "Resizes done" },
  { value: 100, suffix: "+", label: "Exam profiles" },
  { value: 99, suffix: "%", label: "Success rate" },
  { value: 0, suffix: "₹", label: "Cost, forever" },
];

type CellValue = boolean | "partial" | string;

const comparisonRows: {
  aspect: string;
  sahiphoto: CellValue;
  generic: CellValue;
  manual: CellValue;
}[] = [
  {
    aspect: "Pre-set exam specs",
    sahiphoto: true,
    generic: false,
    manual: false,
  },
  {
    aspect: "Scan Enhancement (AI)",
    sahiphoto: true,
    generic: false,
    manual: false,
  },
  {
    aspect: "Image to PDF",
    sahiphoto: true,
    generic: "partial",
    manual: false,
  },
  {
    aspect: "PDF Compression",
    sahiphoto: true,
    generic: "partial",
    manual: false,
  },
  {
    aspect: "Files deleted after use",
    sahiphoto: true,
    generic: false,
    manual: true,
  },
  {
    aspect: "Mobile drag-and-drop",
    sahiphoto: true,
    generic: "partial",
    manual: false,
  },
  {
    aspect: "No account needed",
    sahiphoto: true,
    generic: false,
    manual: true,
  },
  { aspect: "Free forever", sahiphoto: true, generic: false, manual: true },
  {
    aspect: "Always updated for exams",
    sahiphoto: true,
    generic: false,
    manual: false,
  },
  {
    aspect: "One-click download",
    sahiphoto: true,
    generic: true,
    manual: false,
  },
];

function Cell({ value }: { value: CellValue }) {
  if (value === true)
    return (
      <CheckCircle2
        size={19}
        className="mx-auto"
        style={{ color: "#16a34a" }}
      />
    );
  if (value === false)
    return (
      <XCircle size={19} className="mx-auto" style={{ color: "#f87171" }} />
    );
  if (value === "partial")
    return <Minus size={19} className="mx-auto" style={{ color: "#f59e0b" }} />;
  return <span className="text-xs text-gray-500">{value}</span>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WhyChooseUs() {
  const { ref: sectionRef, inView } = useInView(0.05);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-24 px-4"
      /* style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #f0fdf4 18%, #ffffff 60%, #f8fafc 100%)",
      }} */
    >
      {/* ── Soft top fade — blends with whatever section sits above ── */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
        /* style={{
          background: "linear-gradient(180deg, #ffffff 0%, transparent 100%)",
          zIndex: 1,
        }} */
      />

      {/* ── Background decoration ── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#16a34a 1px, transparent 1px), linear-gradient(90deg, #16a34a 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Blobs */}
        <div
          className="absolute top-32 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #bbf7d0 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute top-1/2 -right-32 w-80 h-80 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #bfdbfe 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute -bottom-16 left-1/3 w-72 h-72 rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #fde68a 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* ── Header ── */}
        <div
          className="text-center mb-16 transition-all duration-700"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <div className="inline-flex items-center gap-2 bg-green-100 border border-green-300 text-green-700 rounded-full px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest mb-5">
            <Trophy size={12} /> Why SahiPhoto.in
          </div>
          <h2
            className="font-black text-gray-900 mb-4 leading-tight"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              letterSpacing: "-0.04em",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Built for one job.{" "}
            <span
              className="relative inline-block"
              style={{ color: "#16a34a" }}
            >
              Done right.
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 200 8"
                fill="none"
                preserveAspectRatio="none"
                style={{ height: 6 }}
              >
                <path
                  d="M0 6 Q50 0 100 5 Q150 10 200 4"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.6"
                />
              </svg>
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed">
            Every exam portal has strict, unique requirements. SahiPhoto is the
            only tool built specifically for Indian government exam aspirants.
          </p>
        </div>

        {/* ── Stats strip ── */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 transition-all duration-700 delay-100"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="text-center bg-white border border-gray-100 rounded-2xl py-6 px-4 shadow-sm"
              style={{ boxShadow: "0 2px 12px rgba(22,163,74,0.08)" }}
            >
              <div
                className="font-black text-gray-900 leading-none mb-1"
                style={{
                  fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                  letterSpacing: "-0.05em",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {s.suffix === "₹" ? (
                  <span>
                    <span className="text-green-600">₹</span>0
                  </span>
                ) : (
                  <>
                    <AnimatedCounter target={s.value} suffix={s.suffix} />
                  </>
                )}
              </div>
              <div className="text-[13px] text-gray-400 font-semibold uppercase tracking-wider">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Feature grid ── */}
        <div
          className="mb-20 transition-all duration-700 delay-150"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <h3
            className="text-center text-xl font-extrabold text-gray-800 mb-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            Everything you need, nothing you don&apos;t
          </h3>
          <p className="text-center text-sm text-gray-400 mb-10">
            8 tools, one free platform
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl p-5 border border-gray-100 transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  transitionDelay: `${i * 30}ms`,
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(20px)",
                }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.bg }}
                >
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                {/* Border accent on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    boxShadow: `0 0 0 1.5px ${f.color}30, 0 8px 24px ${f.color}12`,
                  }}
                />
                <h4 className="font-bold text-gray-900 text-[14px] mb-1.5 leading-snug">
                  {f.title}
                </h4>
                <p className="text-[12px] text-gray-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div
          className="transition-all duration-700 delay-200"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <div className="text-center mb-8">
            <h3
              className="text-xl font-extrabold text-gray-800 mb-1.5"
              style={{ letterSpacing: "-0.02em" }}
            >
              How we compare
            </h3>
            <p className="text-sm text-gray-400">
              SahiPhoto vs generic resizers vs doing it manually
            </p>
          </div>

          {/* Table card */}
          <div
            className="bg-white rounded-3xl overflow-hidden border border-gray-100"
            style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}
          >
            {/* Table header */}
            <div className="grid grid-cols-4 text-center">
              {/* Aspect label col */}
              <div className="py-4 px-5 border-b border-gray-100 text-left">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Feature
                </span>
              </div>
              {/* SahiPhoto */}
              <div
                className="py-4 px-3 border-b border-green-200 relative"
                style={{
                  background: "linear-gradient(180deg, #f0fdf4, #ffffff)",
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500 rounded-t-sm" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                    SahiPhoto.in
                  </span>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: "#dcfce7",
                      color: "#15803d",
                      borderColor: "#86efac",
                    }}
                  >
                    ✦ Recommended
                  </span>
                </div>
              </div>
              {/* Generic */}
              <div className="py-4 px-3 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Generic Resizer
                </span>
                <span className="text-[9px] text-gray-300 mt-0.5 block">
                  iLoveImg, Canva etc.
                </span>
              </div>
              {/* Manual */}
              <div className="py-4 px-3 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Manual
                </span>
                <span className="text-[9px] text-gray-300 mt-0.5 block">
                  Photoshop / Phone
                </span>
              </div>
            </div>

            {/* Rows */}
            {comparisonRows.map((row, i) => (
              <div
                key={i}
                className="grid grid-cols-4 text-center group transition-colors duration-150 hover:bg-gray-50/60"
              >
                {/* Label */}
                <div className="py-3.5 px-5 text-left border-b border-gray-50 flex items-center">
                  <span className="text-[13px] text-gray-700 font-medium">
                    {row.aspect}
                  </span>
                </div>
                {/* SahiPhoto */}
                <div
                  className="py-3.5 px-3 border-b border-green-50 flex items-center justify-center"
                  style={{ background: i % 2 === 0 ? "#fafffe" : "#f7fdf9" }}
                >
                  <Cell value={row.sahiphoto} />
                </div>
                {/* Generic */}
                <div className="py-3.5 px-3 border-b border-gray-50 flex items-center justify-center">
                  <Cell value={row.generic} />
                </div>
                {/* Manual */}
                <div className="py-3.5 px-3 border-b border-gray-50 flex items-center justify-center">
                  <Cell value={row.manual} />
                </div>
              </div>
            ))}

            {/* Footer legend */}
            <div className="flex items-center justify-center gap-6 py-4 px-5 bg-gray-50 border-t border-gray-100">
              {[
                {
                  icon: <CheckCircle2 size={14} style={{ color: "#16a34a" }} />,
                  label: "Available",
                },
                {
                  icon: <Minus size={14} style={{ color: "#f59e0b" }} />,
                  label: "Partial",
                },
                {
                  icon: <XCircle size={14} style={{ color: "#f87171" }} />,
                  label: "Not available",
                },
              ].map((l, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium"
                >
                  {l.icon} {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom CTA strip ── */}
        <div
          className="mt-16 transition-all duration-700 delay-300"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <div
            className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-center"
            style={{
              background:
                "linear-gradient(135deg, #052e16 0%, #14532d 50%, #16a34a 100%)",
            }}
          >
            {/* Decorative grid */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div
              aria-hidden
              className="absolute -top-16 right-16 w-56 h-56 rounded-full opacity-20"
              style={{
                background: "radial-gradient(circle, #4ade80, transparent 70%)",
              }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-center gap-1.5 mb-3">
                {[Star, Star, Star, Star, Star].map((S, i) => (
                  <S
                    key={i}
                    size={16}
                    fill="#fbbf24"
                    style={{ color: "#fbbf24" }}
                  />
                ))}
                <span className="text-white/60 text-[12px] ml-1.5 font-medium">
                  5.0 from 500+ reviews
                </span>
              </div>
              <h3
                className="text-white font-black mb-3 leading-tight"
                style={{
                  fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)",
                  letterSpacing: "-0.03em",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Ready to resize your docs in{" "}
                <span style={{ color: "#4ade80" }}>under 30 seconds?</span>
              </h3>
              <p className="text-white/60 text-base mb-7 max-w-md mx-auto">
                Free. No sign-up. No watermark. Trusted by lakhs of Indian exam
                aspirants.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/"
                  className="inline-flex items-center gap-2 bg-white text-green-800 font-bold rounded-xl px-6 py-3 text-sm transition-all hover:bg-green-50 hover:shadow-lg"
                  style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
                >
                  <Zap size={15} fill="#16a34a" style={{ color: "#16a34a" }} />
                  Start Resizing — It&apos;s Free
                </a>
                <div className="flex items-center gap-4 text-white/50 text-[12px] font-medium">
                  {["No account", "No watermark", "Instant result"].map(
                    (t, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <CheckCircle2 size={11} style={{ color: "#4ade80" }} />{" "}
                        {t}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
