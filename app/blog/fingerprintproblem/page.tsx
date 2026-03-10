"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Head from "next/head";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Fingerprint,
  Info,
  Loader2,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  XCircle,
} from "lucide-react";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sahiphoto.in";
const API = `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/compress-image`;

const META = {
  title:
    "RBI Assistant Fingerprint Upload Fix 2026–27: Auto-Crop to 240×240px, 20–50KB [Free Tool]",
  description:
    "Fingerprint rejected on RBI Assistant, SBI Clerk, IBPS PO form? Fix it free — AI auto-crops your fingerprint to exactly 240×240px JPG, 20–50KB. No signup, instant result.",
  keywords:
    "RBI assistant fingerprint upload, fingerprint 240x240 pixels, fingerprint photo rejected RBI, fix fingerprint IBPS, SBI clerk fingerprint size, SSC fingerprint format, bank exam fingerprint jpg, fingerprint 20kb 50kb resize free",
  canonical: `${SITE}/blog/rbi-assistant-fingerprint-upload-fix`,
  ogImage: `${SITE}/og/fingerprint-blog.jpg`,
};

const SCHEMAS = {
  article: {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: META.title,
    description: META.description,
    author: { "@type": "Organization", name: "SahiPhoto" },
    publisher: {
      "@type": "Organization",
      name: "SahiPhoto",
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
    datePublished: "2026-02-20",
    dateModified: "2026-03-01",
    mainEntityOfPage: { "@type": "WebPage", "@id": META.canonical },
  },
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Why is my fingerprint rejected on RBI form?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "RBI portal verifies fingerprint is exactly 240×240px, JPG, 20–50KB. Raw phone photos fail all three checks.",
        },
      },
      {
        "@type": "Question",
        name: "What are RBI Assistant fingerprint requirements 2025–26?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "JPG/JPEG format, 240×240 pixels, 20KB–50KB, blue/black ink on plain white paper.",
        },
      },
      {
        "@type": "Question",
        name: "Does this tool work for IBPS, SBI, SSC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes — IBPS PO/Clerk, SBI PO/Clerk, SSC CGL/CHSL, RRB, UPSC, NTA all require the same fingerprint format.",
        },
      },
    ],
  },
  howto: {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Fix Fingerprint for RBI Assistant Upload",
    totalTime: "PT2M",
    step: [
      {
        "@type": "HowToStep",
        name: "Take impression",
        text: "Press left thumb on ink pad, roll onto white paper.",
      },
      {
        "@type": "HowToStep",
        name: "Photograph",
        text: "Photo from directly above in good light.",
      },
      {
        "@type": "HowToStep",
        name: "Upload",
        text: "Upload to our free tool.",
      },
      {
        "@type": "HowToStep",
        name: "Download",
        text: "Download ready JPG for portal.",
      },
    ],
  },
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ToolStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface ImageSettings {
  width: number;
  height: number;
  minKB: number;
  maxKB: number;
}

interface ToolState {
  status: ToolStatus;
  progress: number;
  message: string;
  previewUrl: string | null;
  resultFile: File | null;
  sizeKB: string;
  inRange: boolean;
  errorMsg: string;
}

const INIT: ToolState = {
  status: "idle",
  progress: 0,
  message: "",
  previewUrl: null,
  resultFile: null,
  sizeKB: "",
  inRange: false,
  errorMsg: "",
};

// ── Pre-filled defaults as requested ─────────────────────────────────────────
const DEFAULT_SETTINGS: ImageSettings = {
  width: 140,
  height: 60,
  minKB: 10,
  maxKB: 20,
};

const PRESETS: { label: string; s: ImageSettings }[] = [
  { label: "Custom Default", s: DEFAULT_SETTINGS },
];

// ─── IMAGES ───────────────────────────────────────────────────────────────────
import SAMPLE_BEFORE from "@/app/components/images/before.jpg";
import SAMPLE_AFTER from "@/app/components/images/After.jpg";

// ─── BEFORE / AFTER ───────────────────────────────────────────────────────────
function BeforeAfterComparison() {
  return (
    <div className="flex flex-col items-center gap-5 my-8 py-7 px-6 bg-slate-50 rounded-2xl border border-slate-200">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-500">
        Before &amp; After Processing
      </p>
      <div className="flex items-end gap-8 justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-32 h-40 rounded-xl overflow-hidden shadow border-2 border-red-200 bg-white">
            <Image
              src={SAMPLE_BEFORE}
              alt="Raw fingerprint photo on paper — rejected by RBI portal"
              fill
              className="object-cover object-center"
            />
            <div className="absolute bottom-0 left-0 right-0 py-1.5 bg-red-500 text-white text-[9px] font-black text-center tracking-widest uppercase">
              ✗ RAW — Rejected
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold text-red-500">
              ~2 MB · 1500×2000 px
            </span>
            <span className="text-[9px] text-slate-400">
              Wrong size &amp; format
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-32 h-40 rounded-xl overflow-hidden shadow-md border-2 border-emerald-400 bg-white">
            <Image
              src={SAMPLE_AFTER}
              alt="Fingerprint auto-cropped to 240×240px — accepted by RBI portal"
              fill
              className="object-contain p-3"
            />
            <div className="absolute inset-3 border border-dashed border-emerald-400/50 rounded pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 py-1.5 bg-emerald-500 text-white text-[9px] font-black text-center tracking-widest uppercase">
              ✓ Processed — Accepted
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold text-emerald-600">
              ~32 KB · 240×240 px
            </span>
            <span className="text-[9px] text-slate-400">
              JPG · Ready to upload
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
// Kept as a standalone component (not nested inside FingerprintTool) so it
// never remounts on parent re-renders.  All four inputs are plain <input>
// elements with no clamping while typing — values commit on blur / Enter.
function SettingsPanel({
  settings,
  onChange,
}: {
  settings: ImageSettings;
  onChange: (s: ImageSettings) => void;
}) {
  // String drafts — let the user type freely without any mid-keystroke clamping
  const [w, setW] = useState(String(settings.width));
  const [h, setH] = useState(String(settings.height));
  const [mn, setMn] = useState(String(settings.minKB));
  const [mx, setMx] = useState(String(settings.maxKB));

  // When a preset button fires onChange from the outside, sync drafts
  useEffect(() => {
    setW(String(settings.width));
  }, [settings.width]);
  useEffect(() => {
    setH(String(settings.height));
  }, [settings.height]);
  useEffect(() => {
    setMn(String(settings.minKB));
  }, [settings.minKB]);
  useEffect(() => {
    setMx(String(settings.maxKB));
  }, [settings.maxKB]);

  const commit = (
    raw: string,
    setter: (v: string) => void,
    field: keyof ImageSettings,
    fallback: number,
  ) => {
    const n = parseInt(raw, 10);
    const safe = isNaN(n) || n < 1 ? fallback : n;
    setter(String(safe));
    onChange({ ...settings, [field]: safe });
  };

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono " +
    "font-semibold text-slate-800 bg-white focus:outline-none focus:border-indigo-400 " +
    "focus:ring-2 focus:ring-indigo-100 transition-all";

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      {/* Always-visible header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex-wrap">
        <Settings2 size={14} className="text-indigo-500 shrink-0" />
        <span className="text-sm font-bold text-slate-700">
          Output Settings
        </span>
        {/* <div className="flex flex-wrap gap-1.5 ml-1">
          {[
            `Size: ${settings.minKB}–${settings.maxKB} KB`,
            `Dim: ${settings.width}×${settings.height} px`,
            "Fmt: JPG",
          ].map((pill) => (
            <span
              key={pill}
              className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-mono"
            >
              {pill}
            </span>
          ))}
        </div> */}
      </div>

      <div className="px-4 py-4">
        {/* Preset buttons */}
        {/* <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => {
            const active =
              settings.width === p.s.width &&
              settings.height === p.s.height &&
              settings.minKB === p.s.minKB &&
              settings.maxKB === p.s.maxKB;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange(p.s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {p.label}
                <span
                  className={`ml-1.5 font-mono text-[10px] ${active ? "text-indigo-200" : "text-slate-400"}`}
                >
                  {p.s.width}×{p.s.height} · {p.s.minKB}–{p.s.maxKB}KB
                </span>
              </button>
            );
          })}
        </div> */}

        {/* Four editable fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Width */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Width
            </label>
            <div className="flex items-center gap-1.5">
              <input
                className={inputCls}
                value={w}
                onChange={(e) => setW(e.target.value.replace(/\D/g, ""))}
                onBlur={() => commit(w, setW, "width", settings.width)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="text-xs text-slate-400 shrink-0">px</span>
            </div>
          </div>

          {/* Height */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Height
            </label>
            <div className="flex items-center gap-1.5">
              <input
                className={inputCls}
                value={h}
                onChange={(e) => setH(e.target.value.replace(/\D/g, ""))}
                onBlur={() => commit(h, setH, "height", settings.height)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="text-xs text-slate-400 shrink-0">px</span>
            </div>
          </div>

          {/* Min KB */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Min Size
            </label>
            <div className="flex items-center gap-1.5">
              <input
                className={inputCls}
                value={mn}
                onChange={(e) => setMn(e.target.value.replace(/\D/g, ""))}
                onBlur={() => commit(mn, setMn, "minKB", settings.minKB)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="text-xs text-slate-400 shrink-0">KB</span>
            </div>
          </div>

          {/* Max KB */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Max Size
            </label>
            <div className="flex items-center gap-1.5">
              <input
                className={inputCls}
                value={mx}
                onChange={(e) => setMx(e.target.value.replace(/\D/g, ""))}
                onBlur={() => commit(mx, setMx, "maxKB", settings.maxKB)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              <span className="text-xs text-slate-400 shrink-0">KB</span>
            </div>
          </div>
        </div>

        {settings.minKB >= settings.maxKB && (
          <p className="mt-3 text-xs text-red-500 font-medium flex items-center gap-1.5">
            <AlertTriangle size={11} /> Min size must be less than max size.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── UPLOAD TOOL ──────────────────────────────────────────────────────────────
function FingerprintTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [s, setS] = useState<ToolState>(INIT);
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);

  const reset = () => {
    if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    setS(INIT);
  };

  const run = useCallback(
    async (file: File) => {
      if (file.size > 10_000_000) {
        setS((p) => ({
          ...p,
          status: "error",
          errorMsg: "File too large — use a photo under 10 MB.",
        }));
        return;
      }
      if (settings.minKB >= settings.maxKB) {
        setS((p) => ({
          ...p,
          status: "error",
          errorMsg: "Min size must be less than max size — fix settings above.",
        }));
        return;
      }

      setS({
        ...INIT,
        status: "uploading",
        progress: 12,
        message: "Uploading fingerprint photo…",
      });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("min_size_mb", (settings.minKB / 1000).toFixed(5));
      fd.append("max_size_mb", (settings.maxKB / 1000).toFixed(5));
      fd.append("width", String(settings.width));
      fd.append("height", String(settings.height));
      fd.append("browser_compressed", "false");
      fd.append("output_type", "fingerprint");
      fd.append(
        "scan_options",
        JSON.stringify({
          uniform_lighting: false,
          clean_white: false,
          perfect_flat: false,
          additionalRequirements: "fingerprint",
          fingerprintEnhance: false,
        }),
      );

      try {
        setS((p) => ({
          ...p,
          status: "processing",
          progress: 38,
          message: "Detecting fingerprint region…",
        }));
        const res = await fetch(API, {
          method: "POST",
          body: fd,
          cache: "no-store",
        });
        setS((p) => ({
          ...p,
          progress: 76,
          message: `Resizing to ${settings.width} × ${settings.height} px…`,
        }));

        if (!res.ok) {
          let msg = `Server error (${res.status})`;
          try {
            const j = await res.json();
            if (j?.error) msg = j.error;
          } catch {}
          throw new Error(msg);
        }
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          throw new Error(
            j?.error ??
              "Could not detect fingerprint. Use a clear ink impression on white paper.",
          );
        }

        setS((p) => ({ ...p, progress: 94, message: "Finalising…" }));
        const blob = await res.blob();
        const resultFile = new File([blob], "fingerprint.jpg", {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(resultFile);
        const sizeKB = (resultFile.size / 1000).toFixed(1);
        const inRange =
          resultFile.size >= settings.minKB * 1000 &&
          resultFile.size <= settings.maxKB * 1000;

        setS({
          status: "done",
          progress: 100,
          message: "Done!",
          previewUrl,
          resultFile,
          sizeKB,
          inRange,
          errorMsg: "",
        });
      } catch (e: any) {
        setS((p) => ({
          ...p,
          status: "error",
          progress: 0,
          errorMsg: e.message ?? "Something went wrong.",
        }));
      }
    },
    [settings],
  );

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) run(f);
    e.target.value = "";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) run(f);
  };
  const save = () => {
    if (!s.resultFile || !s.previewUrl) return;
    const a = document.createElement("a");
    a.href = s.previewUrl;
    a.download = s.resultFile.name;
    a.click();
  };

  // Aspect-ratio-correct preview box height (max 160, min 44)
  const previewH = Math.min(
    160,
    Math.max(44, Math.round(110 * (settings.height / settings.width))),
  );

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-xl shadow-slate-100 mt-6 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-7 py-6 flex justify-between items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 bg-white/15 text-white/90 text-[10px] font-black tracking-[0.12em] uppercase px-3 py-1 rounded-full mb-3">
            <Sparkles size={9} strokeWidth={2.5} /> Free · No signup · Instant
          </span>
          <h2 className="text-xl font-extrabold text-white mb-1 tracking-tight">
            Fingerprint Auto-Crop &amp; Resize Tool
          </h2>
          <p className="text-sm text-indigo-100/80 leading-snug">
            Upload photo → AI crops fingerprint → custom size JPG → Ready to
            submit
          </p>
        </div>
        <Fingerprint
          size={58}
          strokeWidth={0.9}
          className="text-white/15 shrink-0 hidden sm:block"
          aria-hidden
        />
      </div>

      {/* Body */}
      <div>
        {/* ── IDLE ── */}
        {s.status === "idle" && (
          <div className="p-5 flex flex-col gap-4">
            {/* Settings panel always shown in idle state */}
            <SettingsPanel settings={settings} onChange={setSettings} />

            {/* Drop zone */}
            <div
              className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                drag
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50"
              }`}
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
                  drag
                    ? "bg-indigo-100 text-indigo-500 border border-indigo-300"
                    : "bg-white text-slate-400 border border-slate-200 shadow-sm"
                }`}
              >
                <Fingerprint size={28} strokeWidth={1.3} />
              </div>
              <p className="text-base font-bold text-slate-800 mb-1">
                Drag &amp; drop your fingerprint photo
              </p>
              <p className="text-sm text-slate-400 mb-4">
                or click to browse · JPG, PNG, HEIC · Max 10 MB
              </p>

              {/* Live spec pills mirror settings in real-time */}
              <div className="flex flex-wrap justify-center gap-2 mb-5">
                {[
                  `Size: ${settings.minKB}–${settings.maxKB} KB`,
                  `Dim: ${settings.width}×${settings.height} px`,
                  "Fmt: JPG",
                ].map((pill) => (
                  <span
                    key={pill}
                    className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-full font-mono"
                  >
                    {pill}
                  </span>
                ))}
              </div>

              <button
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-7 py-3 text-sm font-bold transition-colors shadow-sm"
                type="button"
              >
                <UploadCloud size={14} /> Choose Photo
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.heic,.heif"
                hidden
                onChange={onFile}
              />
            </div>
          </div>
        )}

        {/* ── PROCESSING ── */}
        {(s.status === "uploading" || s.status === "processing") && (
          <div className="py-16 px-6 text-center">
            <div className="relative inline-flex mb-6">
              <Fingerprint
                size={52}
                strokeWidth={0.8}
                className="text-indigo-100"
              />
              <Loader2
                size={52}
                strokeWidth={1.4}
                className="text-indigo-500 animate-spin absolute inset-0"
              />
            </div>
            <p className="text-base font-bold text-slate-800 mb-5">
              {s.message}
            </p>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs mx-auto mb-2">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
                style={{ width: `${s.progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {s.progress}% · Usually under 5 seconds
            </p>
          </div>
        )}

        {/* ── ERROR ── */}
        {s.status === "error" && (
          <div className="py-10 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <XCircle size={28} strokeWidth={1.3} className="text-red-500" />
            </div>
            <p className="text-lg font-bold text-slate-800 mb-2">
              Couldn't process your image
            </p>
            <p className="text-sm text-slate-500 mb-5">{s.errorMsg}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-5 max-w-sm mx-auto">
              <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Tips for a better result:
              </p>
              <ul className="list-disc pl-4 text-xs text-amber-700 flex flex-col gap-1">
                <li>Use blue or black ink on plain white paper</li>
                <li>Take photo in good natural light (no flash)</li>
                <li>Hold camera directly above the fingerprint</li>
                <li>Fingerprint should fill most of the frame</li>
                <li>Keep the paper flat — no shadows or glare</li>
              </ul>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-600 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all shadow-sm"
            >
              <UploadCloud size={13} /> Try Another Photo
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {s.status === "done" && s.previewUrl && (
          <div className="grid grid-cols-[auto_1fr] gap-6 p-6 items-start">
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative rounded-xl overflow-hidden shadow border-2 border-emerald-400 bg-white"
                style={{ width: 110, height: previewH }}
              >
                <img
                  src={s.previewUrl}
                  alt="Processed fingerprint JPG for exam portal"
                  className="w-full h-full object-contain p-1"
                />
                <div className="absolute inset-2 border border-dashed border-emerald-400/40 rounded pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-400 text-center font-mono">
                {settings.width} × {settings.height} px · JPG
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold w-fit ${s.inRange ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}
              >
                {s.inRange ? (
                  <>
                    <CheckCircle2 size={12} /> {s.sizeKB} KB — Ready to upload
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> {s.sizeKB} KB — Check form limit
                  </>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {[
                  "Fingerprint auto-detected & cropped",
                  `Resized to ${settings.width} × ${settings.height} px`,
                  "JPG format",
                  `Compressed to ${settings.minKB}–${settings.maxKB} KB target`,
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2 text-xs text-slate-600"
                  >
                    <CheckCircle2
                      size={11}
                      className="text-emerald-500 shrink-0"
                    />{" "}
                    {t}
                  </li>
                ))}
              </ul>
              {/* Spec pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  `Size: ${settings.minKB}–${settings.maxKB} KB`,
                  `Dim: ${settings.width}×${settings.height} px`,
                  "Fmt: JPG",
                ].map((pill) => (
                  <span
                    key={pill}
                    className="text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-1 rounded-full font-mono"
                  >
                    {pill}
                  </span>
                ))}
              </div>
              <button
                onClick={save}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-sm font-bold transition-colors w-full mt-1 shadow-sm"
              >
                <Download size={14} /> Download Fingerprint
              </button>
              <button
                onClick={reset}
                className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl py-2.5 text-sm font-medium transition-all w-full text-center"
              >
                Process Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
        Your image is processed securely and deleted immediately — never stored
        or shared.
      </div>
    </div>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function Faq({
  q,
  a,
  open: init = false,
}: {
  q: string;
  a: string;
  open?: boolean;
}) {
  const [open, setOpen] = useState(init);
  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${open ? "border-indigo-200 shadow-sm" : "border-slate-200"}`}
    >
      <button
        className="w-full px-5 py-4 bg-white flex items-center justify-between gap-3 text-sm font-semibold text-slate-800 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <ChevronDown
          size={16}
          className={`text-indigo-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-100 pt-3">
          {a}
        </p>
      )}
    </div>
  );
}

// ─── SPEC TILE ────────────────────────────────────────────────────────────────
function Spec({
  label,
  value,
  hl = false,
}: {
  label: string;
  value: string;
  hl?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3.5 flex flex-col gap-1.5 ${hl ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}
    >
      <span
        className={`text-[9px] font-black uppercase tracking-[0.15em] ${hl ? "text-indigo-500" : "text-slate-400"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-bold leading-tight font-mono ${hl ? "text-indigo-700" : "text-slate-800"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── STEP ─────────────────────────────────────────────────────────────────────
function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex gap-5 items-start pb-7 relative z-10 last:pb-0">
      <div
        className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow"
        style={{
          boxShadow: "0 0 0 4px #f8fafc,0 2px 8px rgba(99,102,241,0.25)",
        }}
      >
        {n}
      </div>
      <div className="pt-1.5">
        <strong className="text-sm font-bold text-slate-800 block mb-1">
          {title}
        </strong>
        <p className="text-sm text-slate-500 leading-relaxed m-0">{body}</p>
      </div>
    </li>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function FingerprintBlog() {
  return (
    <>
      <Head>
        <title>{META.title}</title>
        <meta name="description" content={META.description} />
        <meta name="keywords" content={META.keywords} />
        <link rel="canonical" href={META.canonical} />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large"
        />
        <meta name="author" content="SahiPhoto Editorial Team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={META.title} />
        <meta property="og:description" content={META.description} />
        <meta property="og:url" content={META.canonical} />
        <meta property="og:image" content={META.ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="SahiPhoto" />
        <meta property="og:locale" content="en_IN" />
        <meta
          property="article:published_time"
          content="2026-02-20T00:00:00+05:30"
        />
        <meta
          property="article:modified_time"
          content="2026-03-01T00:00:00+05:30"
        />
        <meta property="article:section" content="Bank Exam Preparation" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={META.title} />
        <meta name="twitter:description" content={META.description} />
        <meta name="twitter:image" content={META.ogImage} />
        {Object.values(SCHEMAS).map((sc, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(sc) }}
          />
        ))}
      </Head>

      <div className="fp-pg font-sans text-slate-700 bg-white min-h-screen">
        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <header className="max-w-3xl mx-auto px-6 pt-6 pb-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center border-b-2 border-slate-800">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              RBI Assistant — Thumb Guidelines 2026–27
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-slate-900 mb-4 tracking-tight">
              Fix Your Fingerprint Issue for{" "}
              <em className="not-italic text-indigo-600">GOVT Exams</em>
              <span className="text-xl md:text-2xl font-semibold text-slate-500 block mt-2 sr-only">
                Here's the 240 × 240 px Rule — and the Free Fix.
              </span>
            </h1>
            <p className="text-sm text-slate-500 max-w-xl mb-5 leading-relaxed">
              Bank exam portals reject fingerprint photos automatically. The fix
              is simple:{" "}
              <strong className="text-slate-800">
                exactly 240 × 240 px · JPG · 20–50 KB.
              </strong>{" "}
              Our free AI tool handles it in seconds — or set custom dimensions
              for any exam.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "📅 Mar 2026",
                "⏱ 5 min read",
                "🛠 Free tool inside",
                "✅ All bank exams",
              ].map((c) => (
                <span
                  key={c}
                  className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-500 font-semibold"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div
            className="hidden md:flex flex-col items-center gap-3 shrink-0"
            aria-hidden
          >
            <div className="w-28 h-28 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center relative overflow-hidden shadow-sm">
              <Fingerprint
                size={68}
                strokeWidth={0.7}
                className="text-slate-300"
              />
              <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-black bg-red-500/90 text-white py-1.5">
                ✗ REJECTED
              </div>
            </div>
            <span className="text-indigo-400 font-black text-xl">↓</span>
            <div className="w-28 h-28 rounded-2xl bg-indigo-50 border-2 border-indigo-300 flex items-center justify-center relative overflow-hidden shadow">
              <Fingerprint
                size={68}
                strokeWidth={0.7}
                className="text-indigo-400"
              />
              <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-black bg-indigo-600/90 text-white py-1.5">
                ✓ 240 × 240 px
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6">
          {/* ── TOOL ─────────────────────────────────────────────────────────── */}
          <section className="border-b border-slate-200 pb-12" id="tool">
            <div className="pt-12">
              <p className="text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-3">
                Free Tool
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight tracking-tight">
                Fix Your Fingerprint — Custom Size &amp; Dimensions
              </h2>
              <p className="text-slate-600 leading-relaxed mb-2">
                Upload any fingerprint photo. Set your target dimensions and
                file size below, or pick a quick preset for your exam.
              </p>
            </div>
            <BeforeAfterComparison />
            <FingerprintTool />
          </section>

          {/* ── SPECS ────────────────────────────────────────────────────────── */}
          <section className="py-12 border-b border-slate-200">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-3">
              Specifications
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
              Complete RBI Fingerprint Image Requirements 2025–26
            </h2>
            <p className="text-slate-600 leading-relaxed mb-6">
              Every requirement must be met simultaneously. One deviation causes
              an immediate rejection.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <Spec hl label="File Size" value="20 KB – 50 KB" />
              <Spec hl label="Dimensions" value="240 × 240 px" />
              <Spec hl label="File Format" value="JPG / JPEG" />
              <Spec label="Ink Colour" value="Blue or Black" />
              <Spec label="Paper" value="Plain White A4" />
              <Spec label="Finger" value="Left Thumb (LTI)" />
              <Spec label="Background" value="White / Off-white" />
              <Spec label="Ridge Clarity" value="All ridges visible" />
              <Spec label="Editing" value="No filters allowed" />
              <Spec label="Orientation" value="Upright, full print" />
              <Spec label="Photo Age" value="Recent impression" />
              <Spec label="Colour Mode" value="Greyscale / Colour OK" />
            </div>
            <p className="text-xs text-slate-400 mt-4">
              * Always verify against the official notification PDF for your
              specific exam cycle.
            </p>
          </section>

          {/* ── STEPS ────────────────────────────────────────────────────────── */}
          <section className="py-12 border-b border-slate-200">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-3">
              Step-by-Step Guide
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
              How to Take a Perfect Fingerprint for Online Forms
            </h2>
            <p className="text-slate-600 leading-relaxed mb-8">
              No special equipment needed. Use standard office ink and your
              phone:
            </p>
            <ol className="relative flex flex-col gap-0">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 z-0" />
              <Step
                n="01"
                title="Get a stamp pad with blue or black ink"
                body="Use a standard office stamp pad. Avoid red or coloured inks — they may not be accepted by automated scanners at exam centres."
              />
              <Step
                n="02"
                title="Press your left thumb firmly on the pad"
                body="Roll gently left to right to get an even coat of ink across the entire fingertip."
              />
              <Step
                n="03"
                title="Roll the impression onto clean white A4 paper"
                body="Press and roll gently to capture the full ridge pattern. Avoid smearing. Only use plain white paper."
              />
              <Step
                n="04"
                title="Let the ink dry completely (30–60 seconds)"
                body="Wet ink photographs blurry. The impression should be sharp, dark, and fully dry before photographing."
              />
              <Step
                n="05"
                title="Photograph from directly above in natural light"
                body="Place paper flat on a table. Hold camera directly above and parallel to the paper. Avoid flash — use window daylight."
              />
              <Step
                n="06"
                title="Upload here — AI handles the rest in seconds"
                body="Our AI auto-crops the fingerprint, resizes to your chosen dimensions, and compresses to your target KB range. No signup, done in under 5 seconds."
              />
            </ol>
          </section>

          {/* ── DOS & DON'TS ─────────────────────────────────────────────────── */}
          <section className="py-12 border-b border-slate-200">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-3">
              Common Mistakes
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
              What Gets Fingerprints Rejected — and What Passes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm font-bold border-b border-slate-200">
                  <XCircle size={14} /> Common Rejections
                </div>
                <ul className="p-4 flex flex-col gap-2 bg-white">
                  {[
                    "Wrong file size (above 50KB or below 20KB)",
                    "Wrong dimensions (not 240×240px)",
                    "PNG, BMP, TIFF or PDF instead of JPG",
                    "Fingerprint too light (insufficient ink)",
                    "Smudged or smeared impression",
                    "Too much white space around fingerprint",
                    "Flash glare washing out ridge details",
                    "Photo taken at an angle",
                    "Right thumb instead of left thumb",
                    "Edited, filtered, or AI-enhanced image",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-1.5 text-xs text-slate-600 leading-snug"
                    >
                      <XCircle
                        size={9}
                        className="text-red-400 shrink-0 mt-0.5"
                      />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-bold border-b border-slate-200">
                  <CheckCircle2 size={14} /> Requirements Met
                </div>
                <ul className="p-4 flex flex-col gap-2 bg-white">
                  {[
                    "Left thumb impression in blue or black ink",
                    "All ridges clearly visible and sharp",
                    "JPG format, 240×240px, 20–50KB",
                    "Full fingerprint captured (tip to base)",
                    "White or off-white paper background",
                    "Photo taken directly from above",
                    "Even natural light, no flash glare",
                    "Ink fully dry before photographing",
                    "No filters or post-processing applied",
                    "Fresh, recent impression",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-1.5 text-xs text-slate-600 leading-snug"
                    >
                      <CheckCircle2
                        size={9}
                        className="text-emerald-500 shrink-0 mt-0.5"
                      />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── EXAM TABLE ───────────────────────────────────────────────────── */}
          <section className="py-12 border-b border-slate-200">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-3">
              Quick Reference
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
              Fingerprint Requirements Across Major Indian Exams
            </h2>
            <div className="overflow-x-auto rounded-xl shadow border border-slate-200">
              <table className="w-full border-collapse bg-white text-sm">
                <thead>
                  <tr>
                    {[
                      "Exam / Board",
                      "Dimensions",
                      "File Size",
                      "Format",
                      "Finger",
                    ].map((h) => (
                      <th
                        key={h}
                        className="bg-slate-900 text-white text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "RBI Assistant / Grade B",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "IBPS PO / MT",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "IBPS Clerk",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "IBPS RRB Officer / OA",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "SBI PO / MT",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "SBI Clerk (JA / JAA)",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "SSC CGL / CHSL / MTS",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "RRB NTPC / Group D / ALP",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "UPSC CSE / NDA / CDS",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "NTA — CUET / JEE / NEET",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "NABARD / SEBI / LIC AAO",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                    [
                      "State PSC (most boards)",
                      "240×240 px",
                      "20–50 KB",
                      "JPG",
                      "Left Thumb",
                    ],
                  ].map(([ex, dim, fs, fmt, finger]) => (
                    <tr
                      key={ex}
                      className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-semibold text-slate-800 text-xs">
                        {ex}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-indigo-600 text-xs font-mono">
                        {dim}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs font-mono">
                        {fs}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs font-mono">
                        {fmt}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">
                        {finger}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              * Always check the official notification for your specific exam
              cycle.
            </p>
          </section>

          {/* ── CTA ──────────────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden bg-slate-900 rounded-2xl px-10 py-12 my-12 flex items-center justify-between">
            <div className="relative z-10 max-w-md">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-3 tracking-tight">
                Don't Let a Fingerprint Error Reject Your Application
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Free tool · under 10 seconds · no account · image deleted
                immediately
              </p>
              <a
                href="#tool"
                className="inline-flex items-center gap-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl px-7 py-3.5 text-base font-bold transition-colors"
              >
                <Fingerprint size={16} /> Fix My Fingerprint — Free
              </a>
            </div>
            <div
              className="absolute -right-12 -top-12 pointer-events-none opacity-[0.06]"
              aria-hidden
            >
              <Fingerprint
                size={260}
                strokeWidth={0.5}
                className="text-white"
              />
            </div>
          </div>

          {/* ── CHECKLIST ────────────────────────────────────────────────────── */}
          <section className="py-12 border-b border-slate-200">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-3">
              Before You Submit
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4 leading-tight tracking-tight">
              Final Checklist — Tick Every Box Before Uploading
            </h2>
            <ul className="flex flex-col gap-3">
              {[
                "Fingerprint is from the left thumb (LTI)",
                "Ink is blue or black — no other colours",
                "All ridge patterns are clearly visible and sharp",
                "Image saved in JPG / JPEG format",
                "File dimensions are exactly 240 × 240 pixels",
                "File size is between 20 KB and 50 KB",
                "No manual filters or editing (use our tool instead)",
                "Photo taken directly from above, not at an angle",
                "Background is plain white or off-white paper",
                "Ink was fully dry before photographing",
              ].map((t) => (
                <li key={t}>
                  <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-700 select-none">
                    <input type="checkbox" className="peer hidden" />
                    <span className="w-5 h-5 shrink-0 border-2 border-slate-300 rounded peer-checked:bg-indigo-500 peer-checked:border-indigo-500 flex items-center justify-center transition-all bg-white">
                      <svg
                        className="hidden peer-checked:block w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {t}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl p-5 mt-7 text-sm text-indigo-900">
              <Sparkles size={17} className="text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1 text-indigo-800">
                  All the best for your exam!
                </strong>
                Years of preparation deserve a clean, error-free application. A
                10-second fix means one less thing to worry about.
              </div>
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────────── */}
          <section className="py-12">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-indigo-500 mb-3">
              FAQ
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="flex flex-col gap-2">
              <Faq
                open
                q="Why does the RBI / IBPS portal reject my fingerprint image?"
                a="These portals run automated checks verifying exact dimensions (240×240px), file format (JPG), and file size (20–50KB). A raw phone photo typically fails all three. Our tool fixes all three in one step."
              />
              <Faq
                q="How do I set custom dimensions for a different exam?"
                a="Click 'Custom Output Settings' in the tool above. Enter your width, height, min KB and max KB — or pick a quick preset. The spec pills update live so you see the exact output before uploading."
              />
              <Faq
                q="Can I use Microsoft Paint or an online resize tool?"
                a="You can try, but it's very difficult to simultaneously hit the right dimensions AND stay within a specific KB range. Most tools don't auto-compress to a KB target. Our tool handles both at once."
              />
              <Faq
                q="My fingerprint impression is very light — will the tool still work?"
                a="Our tool applies contrast enhancement during processing. However, a very faint impression may not have enough ridge detail for biometric matching. If the result looks too light, redo the impression with fresh, darker ink."
              />
              <Faq
                q="Can I use this for both IBPS and SBI applications?"
                a="Yes. The output is a standard JPG at your chosen dimensions — accepted by RBI, IBPS, SBI, SSC, NTA, and virtually all Indian government exam portals."
              />
              <Faq
                q="Is there any charge to use this tool?"
                a="Completely free — no signup, no subscription, no hidden fee. Your image is processed and deleted immediately; we never store anything."
              />
            </div>
          </section>
        </main>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="max-w-3xl mx-auto px-6 py-10 border-t-2 border-slate-800 flex flex-col gap-2">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} SahiPhoto · Free tools for Indian exam
            aspirants
          </p>
          <div className="flex flex-wrap gap-2 items-center text-xs text-slate-400">
            {[
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
              ["More Guides", "/blog"],
              ["Contact", "/contact"],
            ].map(([label, href], i, arr) => (
              <React.Fragment key={label}>
                <a
                  href={href}
                  className="hover:text-indigo-600 transition-colors"
                >
                  {label}
                </a>
                {i < arr.length - 1 && <span>·</span>}
              </React.Fragment>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
