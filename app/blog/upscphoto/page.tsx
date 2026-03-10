"use client";


import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Head from "next/head";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ImageIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserCircle2,
  XCircle,
} from "lucide-react";

// ─── SEO ─────────────────────────────────────────────────────────────────────
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sahiphoto.in";
const API = `${process.env.NEXT_PUBLIC_API_BASE ?? ""}/api/compress-image`;

const META = {
  title:
    "UPSC Photo Upload Fix 2026–27: Your Face Must Cover 75% of the Image [Free Auto-Crop Tool]",
  description:
    "Getting 'face coverage invalid' on UPSC, NTA, SSC or IBPS form? Your face must fill 75% (3/4th) of the photo height. Fix it instantly with our free AI face-crop tool — no signup, result in seconds.",
  keywords:
    "UPSC photo 75 percent face, UPSC passport photo guidelines 2026–27, face should cover 75 percent of photo, UPSC photo upload rejected, fix UPSC form photo, NTA photo requirements, SSC photo face coverage, IAS exam photo size, passport photo face crop free tool, UPSC CSE photo format",
  canonical: `${SITE}/blog/upsc-photo-75-percent-face-coverage`,
  ogImage: `${SITE}/og/upsc-photo-blog.jpg`,
};

const SCHEMA_ARTICLE = {
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
  datePublished: "2026-02-15",
  dateModified: "2026-02-01",
  mainEntityOfPage: { "@type": "WebPage", "@id": META.canonical },
};

const SCHEMA_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why does UPSC say my face coverage is invalid?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UPSC's portal uses automated AI to verify that your face (top of head to chin) occupies at least 75% of the photo's height. Casual phone photos typically show only 30–50% face coverage and fail this check.",
      },
    },
    {
      "@type": "Question",
      name: "What is the correct photo size for UPSC 2026–27 application?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "UPSC requires a passport-size photo (3.5 cm × 4.5 cm), JPEG format, 20 KB to 200 KB, with the face covering at least 75% of the image height, on a plain white background.",
      },
    },
    {
      "@type": "Question",
      name: "How do I make my face cover 75% of the photo automatically?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use the free tool on this page. Upload any photo — our AI detects your face, crops and resizes so your face fills exactly 75% of the height, and outputs a JPEG ready to submit. No Photoshop, no signup.",
      },
    },
    {
      "@type": "Question",
      name: "Does this tool work for NTA, SSC, IBPS and Railway exams too?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All major Indian government exam portals require the same 75% face coverage standard. Our tool output is accepted by UPSC, NTA, SSC, IBPS, RRB, and state PSC boards.",
      },
    },
    {
      "@type": "Question",
      name: "Is my photo stored after processing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Your photo is processed on our secure server and deleted immediately after download. We never store, view, or share user photos.",
      },
    },
  ],
};

const SCHEMA_HOWTO = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Fix UPSC Photo Face Coverage to 75%",
  description:
    "Step-by-step guide to ensure your face covers 75% of your UPSC exam photo",
  totalTime: "PT2M",
  step: [
    {
      "@type": "HowToStep",
      name: "Upload photo",
      text: "Click the Upload button and select your image (JPG, PNG, or HEIC).",
    },
    {
      "@type": "HowToStep",
      name: "AI face detection",
      text: "Our system automatically detects your face using AI.",
    },
    {
      "@type": "HowToStep",
      name: "Auto crop to 75%",
      text: "The image is cropped and resized so your face fills exactly 75% of the photo height.",
    },
    {
      "@type": "HowToStep",
      name: "Download",
      text: "Download the processed JPEG — ready to upload on any government exam portal.",
    },
  ],
};

// ─── TYPES ────────────────────────────────────────────────────────────────────
type ToolStatus = "idle" | "uploading" | "processing" | "done" | "error";

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

// ─── BEFORE / AFTER SAMPLE IMAGES ─────────────────────────────────────────────
// Update these paths once you place akash1.jpg and akash3.jpg in /public/samples/
import SAMPLE_BEFORE from "@/app/components/images/upscphotoBefore.png"; // rejected – low face coverage
import SAMPLE_AFTER from "@/app/components/images/upscphotoAfter.png"; // accepted – 75% face coverage

// ─── BEFORE / AFTER COMPARISON ───────────────────────────────────────────────
function BeforeAfterComparison() {
  return (
    <div className="not-sr-only flex flex-col items-center gap-3 my-6">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
        Real Example — Before &amp; After
      </p>
      <div className="flex items-stretch gap-4 justify-center">
        {/* Before */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-24 h-[120px] rounded-lg overflow-hidden shadow-md border-2 border-red-400">
            <Image
              src={SAMPLE_BEFORE}
              alt="Before: face covers only ~36% of photo height — UPSC rejected"
              fill
              className="object-cover object-top"
            />
            {/* ruler overlay */}
            <div className="absolute right-1 top-0 bottom-0 w-3 bg-red-400/30 flex items-center justify-center">
              <span className="text-[7px] font-bold text-red-700 [writing-mode:vertical-rl] rotate-180">
                ~36%
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <XCircle size={9} /> Rejected
          </span>
        </div>

        {/* Arrow */}
        <div className="flex items-center text-stone-400 font-bold text-xl self-center">
          →
        </div>

        {/* After */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-24 h-[120px] rounded-lg overflow-hidden shadow-md border-2 border-green-500">
            <Image
              src={SAMPLE_AFTER}
              alt="After: face covers 75% of photo height — UPSC accepted"
              fill
              className="object-cover object-top"
            />
            {/* dashed guide box */}
            <div className="absolute top-[5%] left-[8%] right-[8%] h-[75%] border border-dashed border-white/80 rounded flex items-end justify-center pb-1">
              <span className="text-[7px] font-bold bg-green-600 text-white px-1 rounded-full">
                75% ✓
              </span>
            </div>
            {/* ruler overlay */}
            <div
              className="absolute right-1 top-0 w-3 bg-green-500/30 flex items-center justify-center"
              style={{ height: "75%" }}
            >
              <span className="text-[7px] font-bold text-green-800 [writing-mode:vertical-rl] rotate-180">
                75%
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 size={9} /> Accepted
          </span>
        </div>
      </div>
      <p className="text-[11px] text-stone-500 text-center max-w-xs">
        Both photos are of the same person. The right one was processed with our
        tool.
      </p>
    </div>
  );
}

// ─── TOOL ─────────────────────────────────────────────────────────────────────
function PassportPhotoTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [s, setS] = useState<ToolState>(INIT);

  const reset = () => {
    if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    setS(INIT);
  };

  const run = useCallback(async (file: File) => {
    if (file.size > 10_000_000) {
      setS((p) => ({
        ...p,
        status: "error",
        errorMsg: "File too large — please use a photo under 10 MB.",
      }));
      return;
    }
    setS({
      ...INIT,
      status: "uploading",
      progress: 15,
      message: "Uploading photo…",
    });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("min_size_mb", "0.02");
    fd.append("max_size_mb", "0.20");
    fd.append("width", "413");
    fd.append("height", "531");
    fd.append("browser_compressed", "false");
    fd.append("output_type", "passport");
    fd.append(
      "scan_options",
      JSON.stringify({
        uniform_lighting: false,
        clean_white: false,
        perfect_flat: false,
        additionalRequirements: "75%face",
      }),
    );

    try {
      setS((p) => ({
        ...p,
        status: "processing",
        progress: 40,
        message: "Detecting your face with AI…",
      }));
      const res = await fetch(API, {
        method: "POST",
        body: fd,
        cache: "no-store",
      });
      setS((p) => ({
        ...p,
        progress: 78,
        message: "Cropping to 75% face coverage…",
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
            "Face not detected. Please use a clear front-facing photo.",
        );
      }

      setS((p) => ({ ...p, progress: 93, message: "Finalising…" }));
      const blob = await res.blob();
      const resultFile = new File([blob], `photo.jpg`, {
        type: "image/jpeg",
      });
      const previewUrl = URL.createObjectURL(resultFile);
      const sizeKB = (resultFile.size / 1000).toFixed(1);
      const inRange = resultFile.size >= 20_000 && resultFile.size <= 200_000;
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
        errorMsg: e.message ?? "Something went wrong — please try again.",
      }));
    }
  }, []);

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

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-xl mt-6 bg-white">
      {/* Header */}
      <div className="bg-[#142b4e] px-7 py-6 flex justify-between items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1 bg-white/10 text-white/80 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2">
            <Sparkles size={10} strokeWidth={2.5} /> Free · No signup · Instant
          </span>
          <h2 className="font-serif text-xl font-bold text-white mb-1">
            Auto Crop - AI Tool
          </h2>
          <p className="sr-only text-sm text-white/70 leading-snug">
            Upload any photo → AI detects face → crops to 75% coverage → ready
            to submit
          </p>
        </div>
        <UserCircle2
          size={56}
          strokeWidth={1.1}
          className="text-white/10 shrink-0 hidden sm:block"
          aria-hidden
        />
      </div>

      {/* Body */}
      <div>
        {/* IDLE */}
        {s.status === "idle" && (
          <div
            className={`m-5 p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all
              ${drag ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-stone-50 hover:border-amber-400 hover:bg-amber-50"}`}
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
            aria-label="Upload photo"
          >
            <div
              className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4 transition-all
              ${drag ? "border-amber-500 text-amber-600 bg-white" : "border-stone-200 text-stone-500 bg-white"}`}
            >
              <UploadCloud size={28} strokeWidth={1.5} />
            </div>
            <p className="text-base font-semibold text-stone-800 mb-1">
              Drag &amp; drop your photo here
            </p>
            <p className="text-sm text-stone-400 mb-5">
              or click to browse · JPG, PNG, HEIC · Max 10 MB
            </p>
            <button
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-6 py-2.5 text-sm font-bold transition-colors"
              type="button"
            >
              <Camera size={14} /> Choose Photo
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif"
              hidden
              onChange={onFile}
            />
          </div>
        )}

        {/* PROCESSING */}
        {(s.status === "uploading" || s.status === "processing") && (
          <div className="py-14 px-6 text-center">
            <Loader2
              size={40}
              strokeWidth={1.4}
              className="text-amber-600 animate-spin mx-auto mb-5"
            />
            <p className="text-base font-semibold text-stone-800 mb-4">
              {s.message}
            </p>
            <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden max-w-xs mx-auto mb-2">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${s.progress}%` }}
              />
            </div>
            <p className="text-xs text-stone-400">
              {s.progress}% · Usually under 5 seconds
            </p>
          </div>
        )}

        {/* ERROR */}
        {s.status === "error" && (
          <div className="py-10 px-6 text-center">
            <XCircle
              size={44}
              strokeWidth={1.2}
              className="text-red-500 mx-auto mb-3"
            />
            <p className="text-lg font-bold text-stone-800 mb-2">
              Couldn't process your photo
            </p>
            <p className="text-sm text-stone-500 mb-5">{s.errorMsg}</p>
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-left mb-5 max-w-sm mx-auto">
              <p className="text-xs font-bold text-stone-700 mb-2">
                Tips for a better result:
              </p>
              <ul className="list-disc pl-4 text-xs text-stone-500 flex flex-col gap-1">
                <li>Good even lighting — avoid dark or backlit photos</li>
                <li>Face the camera directly, don't look sideways</li>
                <li>Make sure your full face is visible and unobstructed</li>
                <li>Use a sharp photo — avoid blurry images</li>
              </ul>
            </div>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-white border border-stone-200 hover:border-amber-500 hover:text-amber-600 text-stone-600 rounded-lg px-5 py-2 text-sm font-semibold transition-all"
            >
              <UploadCloud size={13} /> Try Another Photo
            </button>
          </div>
        )}

        {/* DONE */}
        {s.status === "done" && s.previewUrl && (
          <div className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr] gap-6 p-6 items-start">
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-[100px] rounded-lg overflow-hidden shadow-md">
                <img
                  src={s.previewUrl}
                  alt="Processed UPSC passport photo with 75% face coverage"
                  className="w-full block"
                />
                <div className="absolute inset-0 border-2 border-green-500 rounded-lg flex flex-col items-center justify-end pb-1.5 bg-gradient-to-t from-green-800/20 to-transparent">
                  <div className="absolute top-[5%] left-[10%] right-[10%] h-[75%] border border-dashed border-white/80 rounded flex items-end justify-center pb-1">
                    <span className="text-[8px] font-bold bg-green-600 text-white px-1.5 rounded-full">
                      75% ✓
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 text-center">
                413 × 531 px · JPEG
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold w-fit
                ${s.inRange ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
              >
                {s.inRange ? (
                  <>
                    <CheckCircle2 size={12} /> {s.sizeKB} KB — Ready to upload
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> {s.sizeKB} KB — Verify form
                    limit
                  </>
                )}
              </div>
              <ul className="flex flex-col gap-1.5">
                {[
                  "Face covers 75% of image height",
                  "Standard passport dimensions",
                  "JPEG format",
                  "Compressed to target size",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2 text-xs text-stone-600"
                  >
                    <CheckCircle2
                      size={12}
                      className="text-green-600 shrink-0"
                    />{" "}
                    {t}
                  </li>
                ))}
              </ul>
              <button
                onClick={save}
                className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white rounded-lg py-3 text-sm font-bold transition-colors w-full"
              >
                <Download size={14} /> Download Photo
              </button>
              <button
                onClick={reset}
                className="bg-stone-100 hover:border hover:border-stone-300 text-stone-500 hover:text-stone-700 rounded-lg py-2.5 text-sm font-medium transition-all w-full text-center"
              >
                Process Another
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer strip */}
      <div className="px-6 py-3 border-t border-stone-100 bg-stone-50 flex items-center gap-2 text-[11px] text-stone-400">
        <ShieldCheck size={13} className="text-green-600 shrink-0" />
        Your photo is processed securely and deleted immediately — never stored
        or shared.
      </div>
    </div>
  );
}

// ─── FAQ ACCORDION ────────────────────────────────────────────────────────────
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
      className={`border rounded-xl overflow-hidden transition-colors ${open ? "border-amber-400" : "border-stone-200"}`}
    >
      <button
        className="w-full px-5 py-4 bg-white flex items-center justify-between gap-3 text-sm font-semibold text-stone-800 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{q}</span>
        <ChevronDown
          size={16}
          className={`text-stone-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm text-stone-600 leading-relaxed bg-white">
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
      className={`rounded-lg border p-3 flex flex-col gap-1 ${hl ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-white"}`}
    >
      <span
        className={`text-[10px] font-bold uppercase tracking-wider ${hl ? "text-amber-700" : "text-stone-400"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm font-bold leading-tight ${hl ? "text-amber-800" : "text-stone-800"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function UPSCPassportPhotoBlog() {
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
        <meta
          property="og:image:alt"
          content="UPSC Photo 75% Face Coverage Guide"
        />
        <meta property="og:site_name" content="SahiPhoto" />
        <meta property="og:locale" content="en_IN" />
        <meta
          property="article:published_time"
          content="2026-02-15T00:00:00+05:30"
        />
        <meta
          property="article:modified_time"
          content="2026-02-01T00:00:00+05:30"
        />
        <meta property="article:section" content="UPSC Preparation" />
        <meta
          property="article:tag"
          content="UPSC, Passport Photo, Face Coverage"
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={META.title} />
        <meta name="twitter:description" content={META.description} />
        <meta name="twitter:image" content={META.ogImage} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_ARTICLE) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_FAQ) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_HOWTO) }}
        />
      </Head>

      {/* All content scoped under .upsc-pg — does NOT bleed into navbar/footer */}
      <div className="upsc-pg font-sans text-stone-700 bg-[#fffef9] min-h-screen">
        {/* ── BREADCRUMB ── */}
        <nav
          className="max-w-3xl mx-auto px-6 pt-5 flex items-center gap-1.5 text-xs text-stone-400 sr-only"
          aria-label="Breadcrumb"
        >
          <a href="/" className="hover:text-amber-600 transition-colors">
            Home
          </a>
          <ChevronRight size={11} />
          <a href="/blog" className="hover:text-amber-600 transition-colors">
            Blog
          </a>
          <ChevronRight size={11} />
          <span>UPSC Photo 75% Fix</span>
        </nav>

        {/* ══ HERO ══ */}
        <header className="max-w-3xl mx-auto px-6 pt-5 pb-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center border-b-2 border-stone-800">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              UPSC — Photo Guidelines 2026–27
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-stone-900 mb-5">
              Your Exam Photo
              <br />
              <em className="italic text-amber-600">Keeps Getting Rejected.</em>
              <br />
              <span className="text-2xl md:text-3xl font-semibold text-stone-500 block mt-1">
                Here's the 75% Rule — and the Fix.
              </span>
            </h1>
            <p className="sr-only text-base text-stone-600 max-w-xl mb-5 leading-relaxed">
              Thousands of UPSC aspirants lose precious application time every
              year — not because of eligibility, but because the portal silently
              rejects their photo. The reason:{" "}
              <strong>
                your face must cover exactly 75% of the photo height.
              </strong>{" "}
              This guide explains why, and gives you a free one-click tool to
              fix it instantly.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "📅 Feb 2026",
                "⏱ 5 min read",
                "🛠 Free tool inside",
                "✅ All govt exams",
              ].map((c) => (
                <span
                  key={c}
                  className="bg-stone-100 border border-stone-200 rounded-full px-3 py-1 text-xs text-stone-500 font-semibold"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Visual diagram */}
          <div
            className="hidden md:flex flex items-center gap-3 shrink-0 justify-center"
            aria-hidden
          >
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-20 h-28 rounded-lg overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-stone-200" />
                <div className="absolute left-1/2 -translate-x-1/2 top-5 w-8 h-10 rounded-[44%_44%_38%_38%] bg-[#d4a878]" />
                <div className="absolute right-1 top-0 bottom-0 w-3 bg-black/10 flex items-center justify-center">
                  <span className="text-[7px] font-bold text-stone-700 [writing-mode:vertical-rl] rotate-180">
                    36%
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold bg-red-600/85 text-white py-1">
                  ✗ REJECTED
                </div>
              </div>
            </div>
            <span className="text-xl font-bold text-stone-400">→</span>
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-20 h-28 rounded-lg overflow-hidden shadow-md">
                <div className="absolute inset-0 bg-green-50" />
                <div className="absolute left-1/2 -translate-x-1/2 top-1 w-[70%] h-[80%] rounded-[44%_44%_38%_38%] bg-[#d4a878]" />
                <div
                  className="absolute right-1 top-0 w-3 bg-green-500/25 flex items-center justify-center"
                  style={{ height: "75%" }}
                >
                  <span className="text-[7px] font-bold text-green-800 [writing-mode:vertical-rl] rotate-180">
                    75%
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold bg-green-700/85 text-white py-1">
                  ✓ ACCEPTED
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── ALERT ── */}
        <div
          className="sr-only max-w-3xl mx-auto my-5 px-6 py-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex gap-3 items-start text-sm text-amber-800"
          role="alert"
        >
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Automated rejection in effect:</strong> UPSC, NTA and SSC
            portals now use AI to verify face coverage before any human reviews
            your application. A photo that "looks fine" may still fail.
          </span>
        </div>

        {/* ══ CONTENT ══ */}
        <main className="max-w-3xl mx-auto px-6">
          {/* 1 — Understanding the rule */}
          <section
            className="sr-only py-12 border-b border-stone-200"
            aria-labelledby="h1"
          >
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              Understanding the Rule
            </p>
            <h2
              id="h1"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-5 leading-tight"
            >
              What Does "Face Covers 75%" Actually Mean?
            </h2>
            <p className="mb-4 text-stone-600 leading-relaxed">
              When the UPSC notification says{" "}
              <em className="italic text-amber-700">
                "the face should cover 75% of the photograph,"
              </em>{" "}
              they mean a precise measurement: from the{" "}
              <strong className="text-stone-800">top of your head</strong> to
              your <strong className="text-stone-800">chin</strong>, that
              vertical distance must fill at least{" "}
              <strong className="text-stone-800">
                three-quarters of the total photo height.
              </strong>
            </p>
            <div className="flex gap-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-4 my-6 text-sm text-amber-900">
              <ImageIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1">Simple rule of thumb:</strong> If
                your photo is 4 cm tall, your face must span at least 3 cm from
                forehead to chin. Everything above your head and below your chin
                is wasted space that must be minimised.
              </div>
            </div>
            <p className="mb-4 text-stone-600 leading-relaxed">
              The failure mode is almost always a photo taken from too far away
              — a casual phone selfie, a cropped group photo, or a photo where
              you're visible from waist to head. Even after cropping, too much
              background remains above and below the face.
            </p>
            <p className="text-stone-600 leading-relaxed">
              Since 2022, UPSC's online form system and NTA's portal both run{" "}
              <strong className="text-stone-800">
                automated computer vision checks
              </strong>{" "}
              on uploaded photos. Your photo is measured mathematically, not
              judged visually. This is why a photo that looks fine to you gets
              flagged.
            </p>
          </section>

          {/* 2 — TOOL */}
          <section
            className="border-b border-stone-200"
            aria-labelledby="h2"
            id="tool"
          >
            <h2
              id="h2"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-3 leading-tight sr-only"
            >
              Fix Your Photo Right Now — Free, Instant, Private
            </h2>
            <p className="sr-only text-stone-600 leading-relaxed mb-2">
              Upload any photo below. Our AI finds your face, crops and scales
              so your face fills exactly <strong>75%</strong> of the height, and
              outputs a JPEG at the correct passport dimensions — ready to
              submit on any government exam portal.
            </p>

            {/* Before / After sample images */}
            <BeforeAfterComparison />

            <PassportPhotoTool />
          </section>

          {/* 3 — Specs */}
          <section
            className="py-12 border-b border-stone-200"
            aria-labelledby="h3"
          >
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              Specifications
            </p>
            <h2
              id="h3"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-4 leading-tight"
            >
              Complete UPSC Photo Requirements 2026–27
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Every one of the following conditions must be met simultaneously.
              One failure in any column means rejection — even if every other
              property is correct.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <Spec hl label="Face Coverage" value="75% of photo height" />
              <Spec label="Dimensions" value="3.5 cm × 4.5 cm" />
              <Spec label="File Format" value="JPEG / JPG only" />
              <Spec hl label="File Size" value="20 KB – 200 KB" />
              <Spec label="Background" value="Plain white" />
              <Spec label="Expression" value="Neutral, mouth closed" />
              <Spec label="Lighting" value="Even, no shadows" />
              <Spec hl label="Glasses" value="Not allowed (2026–27+)" />
              <Spec label="Head Covering" value="Religious reasons only" />
              <Spec label="Photo Age" value="Within 6 months" />
              <Spec label="Look Direction" value="Straight at camera" />
              <Spec label="Editing/Filters" value="Not allowed" />
            </div>
            <p className="text-xs text-stone-400 mt-4">
              * Always cross-check the official notification PDF for your
              specific exam cycle — specifications occasionally change.
            </p>
          </section>

          {/* 4 — Dos and Don'ts */}
          <section
            className="py-12 border-b border-stone-200"
            aria-labelledby="h4"
          >
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              Common Mistakes
            </p>
            <h2
              id="h4"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-6 leading-tight"
            >
              What Gets Photos Rejected — and What Passes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Don'ts */}
              <div className="rounded-xl overflow-hidden border border-stone-200">
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm font-bold">
                  <XCircle size={15} /> Common Rejections
                </div>
                <ul className="p-4 flex flex-col gap-2 bg-white">
                  {[
                    "Selfie-style photo (face covers only 30–40%)",
                    "Smiling with teeth showing",
                    "Wearing spectacles or sunglasses",
                    "Coloured or patterned background",
                    "Shadow on face or background",
                    "Photo older than 6 months",
                    "Head tilted, turned, or looking away",
                    "Blurry or low-resolution image",
                    "PNG, BMP, TIFF or PDF format",
                    "Cropped from group or event photo",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-1.5 text-xs text-stone-600 leading-snug"
                    >
                      <XCircle
                        size={10}
                        className="text-red-500 shrink-0 mt-0.5"
                      />{" "}
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Do's */}
              <div className="rounded-xl overflow-hidden border border-stone-200">
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 text-sm font-bold">
                  <CheckCircle2 size={15} /> Requirements Met
                </div>
                <ul className="p-4 flex flex-col gap-2 bg-white">
                  {[
                    "Face clearly visible, looking straight at camera",
                    "Face height is 75% or more of photo height",
                    "Plain white or off-white background",
                    "Good even lighting — no shadows",
                    "Neutral expression, mouth closed",
                    "Recent photo (taken within 6 months)",
                    "JPEG format, 20–200 KB",
                    "Both ears visible if possible",
                    "No filters, retouching or enhancements",
                    "Taken by another person, not a selfie",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-1.5 text-xs text-stone-600 leading-snug"
                    >
                      <CheckCircle2
                        size={10}
                        className="text-green-600 shrink-0 mt-0.5"
                      />{" "}
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* 5 — Steps */}
          <section
            className="py-12 border-b border-stone-200"
            aria-labelledby="h5"
          >
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              Step-by-Step Guide
            </p>
            <h2
              id="h5"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-4 leading-tight"
            >
              How to Take a Correct UPSC Photo at Home
            </h2>
            <p className="text-stone-600 leading-relaxed mb-8">
              You don't need a professional studio. Follow these six steps with
              your phone and you'll get a photo that passes every automated
              check.
            </p>
            <ol className="relative flex flex-col gap-0">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-stone-200 z-0" />
              {[
                {
                  n: "01",
                  t: "Find a plain white wall or door",
                  b: "Stand 1–2 feet in front of a plain white, cream, or light grey wall. Avoid tiles, windows, furniture, or any pattern behind you.",
                },
                {
                  n: "02",
                  t: "Set up even lighting",
                  b: "Face a window during daylight, or position two light sources on either side. Avoid single overhead light — it creates shadows under eyes and chin.",
                },
                {
                  n: "03",
                  t: "Ask someone else to take the photo",
                  b: "Selfies are rejected almost universally — the angle is wrong and your face fills too little of the frame. Ask a friend or family member.",
                },
                {
                  n: "04",
                  t: "Get close — face must fill the frame",
                  b: "The photographer should stand close enough that your head takes up most of the vertical space. Small amount above hair and below chin.",
                },
                {
                  n: "05",
                  t: "Use Portrait mode, hold phone upright",
                  b: "Use the default Camera app, phone held vertically. Take 5–10 shots and pick the sharpest — slight motion blur is common at arm's length.",
                },
                {
                  n: "06",
                  t: "Upload to our tool — it handles the rest",
                  b: "Our AI crops to 75% face coverage, resizes to correct passport dimensions, and compresses to the required file size. Done in seconds.",
                },
              ].map((step) => (
                <li
                  key={step.n}
                  className="flex gap-5 items-start pb-7 relative z-10 last:pb-0"
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold font-serif shadow-[0_0_0_4px_#fffef9]">
                    {step.n}
                  </div>
                  <div className="pt-1.5">
                    <strong className="text-sm font-bold text-stone-800 block mb-1">
                      {step.t}
                    </strong>
                    <p className="text-sm text-stone-500 leading-relaxed m-0">
                      {step.b}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 6 — Comparison table */}
          <section
            className="py-12 border-b border-stone-200"
            aria-labelledby="h6"
          >
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              Quick Reference
            </p>
            <h2
              id="h6"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-4 leading-tight"
            >
              Photo Requirements Across Major Indian Exams
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              The 75% face coverage rule is not exclusive to UPSC. All central
              government exam portals follow the same DoP&T standard.
            </p>
            <div className="overflow-x-auto rounded-xl shadow-md border border-stone-200">
              <table className="w-full border-collapse bg-white text-sm">
                <thead>
                  <tr>
                    {[
                      "Exam",
                      "Face Coverage",
                      "File Size",
                      "Format",
                      "Background",
                    ].map((h) => (
                      <th
                        key={h}
                        className="bg-stone-900 text-white text-left px-4 py-3 text-xs font-semibold whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "UPSC CSE / IAS / IFS",
                      "75%",
                      "20–200 KB",
                      "JPEG",
                      "White",
                    ],
                    [
                      "NTA — JEE / NEET / CUET",
                      "75–80%",
                      "10–200 KB",
                      "JPEG",
                      "White / Light grey",
                    ],
                    [
                      "SSC CGL / CHSL / MTS",
                      "75%",
                      "20–50 KB",
                      "JPEG",
                      "White",
                    ],
                    [
                      "IBPS PO / Clerk / SO",
                      "75%",
                      "20–50 KB",
                      "JPEG",
                      "White",
                    ],
                    ["SBI PO / Clerk", "75%", "20–50 KB", "JPEG", "White"],
                    [
                      "RRB / Railway exams",
                      "75%",
                      "20–100 KB",
                      "JPEG",
                      "White",
                    ],
                    [
                      "State PSC (most boards)",
                      "75%",
                      "10–100 KB",
                      "JPEG",
                      "White / Light",
                    ],
                    [
                      "CLAT / Law entrance exams",
                      "75%",
                      "20–80 KB",
                      "JPEG",
                      "White",
                    ],
                  ].map(([ex, fc, fs, fmt, bg]) => (
                    <tr
                      key={ex}
                      className="hover:bg-stone-50 border-b border-stone-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-semibold text-stone-800 text-xs">
                        {ex}
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700 text-xs">
                        {fc}
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-xs">{fs}</td>
                      <td className="px-4 py-3 text-stone-600 text-xs">
                        {fmt}
                      </td>
                      <td className="px-4 py-3 text-stone-600 text-xs">{bg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-stone-400 mt-3">
              * Always check the official notification for your specific exam
              cycle.
            </p>
          </section>

          {/* 7 — Why stricter */}
          <section
            className="py-12 border-b border-stone-200"
            aria-labelledby="h7"
          >
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              Background
            </p>
            <h2
              id="h7"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-4 leading-tight"
            >
              Why Did This Rule Become Stricter in Recent Years?
            </h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              Until 2019, photo uploads on government exam portals were mostly
              checked manually. The process was slow and inconsistent — some
              borderline photos were approved, others rejected arbitrarily.
            </p>
            <div className="flex gap-4 bg-[#eaf0f9] border-l-4 border-[#142b4e] rounded-r-lg p-4 my-6 text-sm text-[#0e2040]">
              <ShieldCheck
                size={18}
                className="text-[#142b4e] shrink-0 mt-0.5"
              />
              <div>
                <strong className="block mb-1">The Aadhaar connection:</strong>{" "}
                Since 2020, exam boards are required to cross-verify applicant
                identity against Aadhaar and other government IDs using facial
                recognition at exam centres. For this to work reliably, the
                application photo must show the face large enough for biometric
                matching — hence the mandatory 75% rule.
              </div>
            </div>
            <p className="text-stone-600 leading-relaxed mb-4">
              From 2022 onwards, UPSC and NTA integrated automated AI
              verification at the upload stage. The system rejects non-compliant
              photos within milliseconds — before any human sees the
              application.
            </p>
            <p className="text-stone-600 leading-relaxed">
              For aspirants filling forms at the last minute, a photo rejection
              can mean missing the deadline entirely. Getting the photo right
              before the last day is not optional.
            </p>
          </section>

          {/* CTA block */}
          <div className="relative overflow-hidden bg-stone-900 rounded-2xl px-10 py-12 my-12 flex items-center justify-between">
            <div className="relative z-10 max-w-md">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-white leading-tight mb-3">
                Don't Let a Photo Reject Your Application
              </h2>
              <p className="text-sm text-stone-400 mb-6">
                Free tool · processes in under 10 seconds · no account needed ·
                photo never stored
              </p>
              <a
                href="#tool"
                className="inline-flex items-center gap-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-7 py-3.5 text-base font-bold transition-colors"
              >
                <Camera size={16} /> Fix My Photo — Free
              </a>
            </div>
            {/* Decorative rings */}
            <div
              className="absolute -right-10 -top-10 pointer-events-none"
              aria-hidden
            >
              {[240, 170, 100].map((sz) => (
                <div
                  key={sz}
                  className="absolute rounded-full border border-white/[0.06]"
                  style={{
                    width: sz,
                    height: sz,
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* 8 — Final checklist */}
          <section
            className="py-12 border-b border-stone-200"
            aria-labelledby="h8"
          >
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              Before You Submit
            </p>
            <h2
              id="h8"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-4 leading-tight"
            >
              Final Checklist — Tick Every Box Before Uploading
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Every item must be checked before you upload on the exam portal.
              One missed requirement = rejection.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Face covers at least 75% of the photo height",
                "Photo saved in JPEG / JPG format",
                "File size is within the limit stated in your notification",
                "Background is plain white or off-white",
                "Photo taken within the last 6 months",
                "No glasses, sunglasses, or tinted lenses",
                "Looking straight at the camera — no tilt or turn",
                "No shadows on face or background",
                "Neutral expression, mouth closed",
                "No photo filters, beautification, or retouching applied",
              ].map((t) => (
                <li key={t}>
                  <label className="flex items-center gap-3 cursor-pointer text-sm text-stone-700 select-none group">
                    <input type="checkbox" className="peer hidden" />
                    <span className="w-5 h-5 shrink-0 border-2 border-stone-300 rounded peer-checked:bg-green-600 peer-checked:border-green-600 flex items-center justify-center transition-all">
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
            <div className="flex gap-4 bg-green-50 border-l-4 border-green-600 rounded-r-xl p-5 mt-7 text-sm text-green-900">
              <Sparkles size={18} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-1 text-green-900">
                  All the best for your exam!
                </strong>{" "}
                Years of preparation shouldn't be derailed by a photo
                technicality. Use our tool, get it right first time, and focus
                your energy on what truly matters — your preparation.
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-12" aria-labelledby="h9">
            <p className="text-[11px] font-bold tracking-widest uppercase text-amber-600 mb-2">
              FAQ
            </p>
            <h2
              id="h9"
              className="font-serif text-2xl md:text-3xl font-bold text-stone-900 mb-6 leading-tight"
            >
              Frequently Asked Questions
            </h2>
            <div className="flex flex-col gap-2">
              <Faq
                open
                q="Why does the UPSC portal say my face coverage is invalid?"
                a="The portal uses automated AI to measure how much vertical space your face (top of head to chin) occupies. If your face covers less than 75% of the photo height — common in casual photos — the system rejects it automatically, without human review."
              />
              <Faq
                q="My studio photo was accepted last year but rejected this year — why?"
                a="UPSC and NTA progressively tightened their automated checks between 2022 and 2026. Photos that passed older, more lenient checks now fail the stricter AI verification. Use our tool to ensure compliance with current standards."
              />
              <Faq
                q="Can I use the processed photo for both UPSC and NTA applications?"
                a="Yes. Our tool outputs a standard passport-size JPEG at 413×531 px (3.5×4.5 cm at 300 DPI) with 75% face coverage — the common standard across all major Indian government exam portals."
              />
              <Faq
                q="What if the tool can't detect my face?"
                a="This usually happens when the photo is very dark, blurry, or the face is turned sideways. Take a fresh photo in good daylight, facing the camera directly, and try again. Your full face including forehead must be visible."
              />
              <Faq
                q="The output file size is slightly outside the required range — what do I do?"
                a="Check whether the size (shown after processing) falls within your exam's specific range. Requirements vary slightly between exams. If it's a few KB off, re-check the exact limit in your notification PDF."
              />
              <Faq
                q="Is there any charge for using this tool?"
                a="No — completely free. No signup, no subscription, no hidden fee. Your photo is processed and deleted immediately; we store nothing."
              />
            </div>
          </section>
        </main>

        {/* ── FOOTER ── */}
        <footer className="max-w-3xl mx-auto px-6 py-10 border-t-2 border-stone-800 flex flex-col gap-2">
          <p className="text-xs text-stone-400">
            © {new Date().getFullYear()} SahiPhoto · Free tools for Indian exam
            aspirants
          </p>
          <div className="flex flex-wrap gap-2 items-center text-xs text-stone-400">
            {[
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
              ["More Guides", "/blog"],
              ["Contact", "/contact"],
            ].map(([label, href], i, arr) => (
              <React.Fragment key={label}>
                <a
                  href={href}
                  className="hover:text-amber-600 transition-colors"
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
