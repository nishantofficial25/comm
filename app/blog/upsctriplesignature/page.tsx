// app/upsc-triple-signature/page.tsx
// Server Component — metadata, hero, static sections, JSON-LD
// Only the resizer tool and FAQ accordion hydrate on client

import type { Metadata } from "next";
import { ScanLine } from "lucide-react";
import SignatureResizerTool from "@/components/blog/Signatureresizertool";
import FaqAccordion from "@/components/blog/Faqaccordion";
import image from "@/app/components/images/sample.jpg"
import image2 from "@/app/components/images/upsctriplesignature.jpg";
import Image from "next/image";
export const revalidate = 3600;
// ── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title:
    'Fix UPSC Triple Signature "Blank Percentage > 95.5%" Error – Free Tool 2026',
  description:
    'Fix UPSC "Triple Signature blank percentage should not be greater than 95.5" error instantly. Resize to correct size (500×350 px, 20–100 KB JPG) using free tool. Verified working solution for UPSC CSE 2026.',
  keywords: [
    "UPSC signature error fix",
    "blank percentage 95.5% UPSC",
    "triple signature error UPSC",
    "UPSC CSE signature upload problem",
    "UPSC OTR signature size",
    "signature resize tool UPSC",
    "sahiphoto signature tool",
  ],
  alternates: { canonical: "https://sahiphoto.in/blog/upsctriplesignature" },
  openGraph: {
    title:
      "Fix UPSC Triple Signature Blank Percentage Error 95.5% – Free Working Tool 2026",
    description:
      "Verified fix for UPSC signature blank percentage error. Resize correctly and upload successfully in one attempt.",
    url: "https://sahiphoto.in/blog/upsctriplesignature",
    type: "article",
  },
};

// ── JSON-LD ───────────────────────────────────────────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: 'Fix UPSC Triple Signature "Blank Percentage > 95.5%" Error',
  description:
    "Step-by-step guide to fix UPSC CSE signature upload blank percentage error.",
  totalTime: "PT3M",
  tool: [{ "@type": "HowToTool", name: "SahiPhoto Signature Resizer" }],
  step: [
    {
      "@type": "HowToStep",
      name: "Add Serial Numbers",
      text: "Write 1), 2), 3) with your signature next to each on paper.",
    },
    {
      "@type": "HowToStep",
      name: "Click Photo Close-up",
      text: "Get camera close so signatures fill 80% of frame.",
    },
    {
      "@type": "HowToStep",
      name: "Resize Using Tool",
      text: "Use the resizer on this page. Target: 500×350 px, 20–100 KB, JPG.",
    },
    {
      "@type": "HowToStep",
      name: "Save to Gallery",
      text: "Download the resized file to your phone gallery.",
    },
    {
      "@type": "HowToStep",
      name: "Upload from Gallery",
      text: "On UPSC portal tap Choose File → Gallery, not direct camera.",
    },
  ],
};

// ── Static Data ───────────────────────────────────────────────────────────────
const steps = [
  {
    number: "01",
    icon: "✏️",
    title: "Add Serial Number on Paper",
    detail:
      "Write 1), 2), 3) with your signature next to each — exactly like the sample image below. Use blue or black ballpoint pen. This reduces blank space and makes each signature unique.",
  },
  {
    number: "02",
    icon: "📸",
    title: "Click Photo Very Close",
    detail:
      "Get your phone camera as close as possible to the paper. The signatures should fill at least 80% of the frame. Good daylight, no shadows. Then crop tightly around the signatures.",
  },
  {
    number: "03",
    icon: "🔧",
    title: "Resize Using the Tool Above",
    detail:
      "Use the UPSC Signature Resizer on this page (or SahiPhoto.in). Target: 500×350 px, 20–100 KB, JPG. Enable Scan Enhancement for a cleaner white-background result. This step is what most people skip — and why they face the error.",
  },
  {
    number: "04",
    icon: "📂",
    title: "Save to Gallery First",
    detail:
      "After resizing, download the file to your phone gallery or Downloads folder. Do NOT directly use the camera option on the UPSC portal — browser camera captures get wrong filenames and metadata.",
  },
  {
    number: "05",
    icon: "⬆️",
    title: "Upload From Gallery on Portal",
    detail:
      "On the UPSC form, tap 'Choose File' → select 'Gallery' or 'Files'. Pick your resized signature file. Blank percentage will be within limit and upload will succeed on the first attempt.",
  },
];

const faqs = [
  {
    q: "What does 'blank percentage should not be greater than 95.5%' mean?",
    a: "UPSC checks how much white space is in your signature image. If your signature is tiny in a large white image, 95%+ of pixels are blank — triggering this error. Fix: get closer when clicking the photo so signature fills the frame.",
  },
  {
    q: "Why does it say 'Triple Signature' in the error?",
    a: "UPSC CSE form requires you to upload 3 signatures (triple). Each must be on a single image, labelled 1), 2), 3). The system verifies all three are present and the blank space is within limits.",
  },
  {
    q: "Should I use Scan Enhancement or standard resize?",
    a: "Scan Enhancement is recommended for most people — it removes grey backgrounds and uneven lighting from phone photos, giving a crisp white-background result that portal validators prefer. If your photo is already very clean and high-contrast, standard resize is fine.",
  },
  {
    q: "Can I use any other app instead of this resizer?",
    a: "Yes — any tool that outputs exactly 500×350 px, 20–100 KB, JPG format works. This page's built-in resizer does it for free without uploading your image anywhere.",
  },
  {
    q: "My file is resized but still fails. Why?",
    a: "You're likely uploading via the direct camera option on mobile. The browser renames the file and bypasses your resize. Always pick from gallery / files app after saving the resized image.",
  },
  {
    q: "Should all 3 signatures be on the same image?",
    a: "Yes. Write 1), 2), 3) and sign next to each on a single white sheet of paper. Photograph all three together, then resize that single photo. Upload this one image for the Triple Signature field.",
  },
];

const checklist = [
  "Serial numbers 1), 2), 3) written on paper",
  "All 3 signatures visible and large",
  "Photo clicked very close to paper",
  "Scan Enhancement toggled ON in the resizer tool",
  "Image resized to 500×350 px, 20–100 KB, JPG",
  "Resized file saved to gallery / downloads",
  "Uploaded via 'Gallery' picker — NOT direct camera",
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UpscTripleSignaturePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div
        className="bg-[#f8fdf8] min-h-screen text-gray-900"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        {/* ── Hero ── */}
        <header
          style={{
            background:
              "linear-gradient(135deg, #052e16 0%, #000000 50%, #10893e 100%)",
          }}
        >
          <div className="max-w-3xl mx-auto px-6 md:px-9 pt-16 pb-14">
            <div className="inline-block bg-green-500 text-white rounded-full px-3.5 py-1 text-[11px] font-bold tracking-widest uppercase mb-5">
              UPSC CSE 2026 · Form Filling Fix
            </div>
            <h1
              className="text-white leading-tight mb-5"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(26px,5vw,46px)",
              }}
            >
              Fix: &quot;Blank Percentage Should Not Be Greater Than 95.5%&quot;
              — UPSC Triple Signature Error
            </h1>
            <h2
              className="text-base mb-5 leading-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                color: "#aacd36",
              }}
            >
              Ultimate Tool for one shot problem solve —{" "}
              <a
                href="https://sahiphoto.in/upsc-cse-pre"
                className="text-white hover:underline"
              >
                sahiphoto.in
              </a>
            </h2>
            <p
              className="text-[18px] leading-relaxed mb-7 max-w-2xl"
              style={{
                color: "rgba(255,255,255,0.82)",
                fontFamily: "'Source Sans 3', sans-serif",
              }}
            >
              Thousands of UPSC CSE Prelims aspirants are stuck on this error.
              The fix is simple and takes under 3 minutes. We tested it —
              signature uploaded successfully on the first attempt.
            </p>
            <div
              className="flex flex-wrap gap-3 text-[13px]"
              style={{
                color: "rgba(255,255,255,0.55)",
                fontFamily: "sans-serif",
              }}
            >
              <span>📅 February 2026</span>
              <span>·</span>
              <span>⏱️ 5 min read</span>
              <span>·</span>
              <span>✅ Verified Working</span>
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="max-w-3xl mx-auto px-6 md:px-9">
          <br />
          {/* What is the error */}
          <section className="mb-10">
            <h2
              className="text-[28px] font-bold mb-3.5 text-green-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              What Is This Error?
            </h2>
            <p
              className="text-[16px] leading-relaxed text-gray-700 mb-3.5"
              style={{ fontFamily: "'Source Sans 3', sans-serif" }}
            >
              UPSC&apos;s portal automatically checks every uploaded signature
              image for blank/white pixel ratio. For the &quot;Triple
              Signature&quot; field (where you upload all 3 signatures on one
              image), the system requires that less than 95.5% of the image be
              white/blank.
            </p>
          </section>

          {/* Before / After */}
          <div className="bg-white border-2 border-dashed border-green-600 rounded-2xl p-6 mb-10">
            <div className="flex items-center gap-2 mb-5">
              <ScanLine size={18} color="#7c3aed" />
              <span
                className="text-[18px] font-bold text-green-900"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Before vs After: Scan Enhancement
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Before */}
              <div className="text-center">
                <span className="inline-block bg-amber-50 border border-amber-300 text-amber-800 rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                  ⚠️ Before
                </span>
                <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50">
                  <Image
                    src={image}
                    alt="Raw signature photo — grey background, uneven lighting"
                    width={400}
                    height={200}
                    className="w-full h-52 object-contain"
                  ></Image>
                </div>
                <p className="text-xs font-semibold text-amber-800 mt-2 mb-0.5">
                  Raw photo
                </p>
              </div>
              {/* After */}
              <div className="text-center">
                <span className="inline-block bg-green-100 border border-green-600 text-green-900 rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                  ✅ After Using AI Tool
                </span>
                <div className="border border-green-200 rounded-xl overflow-hidden bg-green-50">
                  <Image
                    src={image2}
                    alt="Scan-enhanced signature — pure white background, crisp dark ink"
                    width={400}
                    height={200}
                    className="w-full h-52 object-contain block"
                  ></Image>
                </div>
                <p className="text-xs font-semibold text-green-700 mt-2 mb-0.5">
                  Fixed Image - with sahiphoto.in
                </p>
              </div>
            </div>
            <p className="text-[12px] text-gray-400 mt-3">
              ✅ All 3 signatures visible · Serial numbers written ·
              Photographed close-up · Blank space minimal
            </p>
          </div>

          <hr className="border-green-100 my-10" />

          {/* ── Resizer Tool (Client) ── */}
          <section>
            <div className="inline-block bg-green-700 text-white rounded-full px-3.5 py-1 text-[11px] font-bold tracking-widest uppercase mb-3">
              Ultimate Tool
            </div>
            <h2
              className="text-[32px] font-bold mb-2 text-black"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Resize Your Signature Right Here —{" "}
            </h2>
            <p
              className="text-[15px] text-gray-500 mb-6 leading-relaxed"
              style={{ fontFamily: "sans-serif" }}
            >
              No need to visit another site. Upload your signature photo below
              and get a UPSC-ready file instantly. Toggle{" "}
              <strong>Scan Enhancement</strong> ON for the cleanest result — it
              removes grey backgrounds and uneven lighting automatically.
            </p>
            <SignatureResizerTool />

            {/* Do / Don't */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div
                className="bg-green-100 border border-green-600 rounded-xl p-3.5 text-[14px]"
                style={{ fontFamily: "sans-serif" }}
              >
                <strong className="text-green-900 block mb-1">
                  ✅ DO THIS
                </strong>
                Write 1) 2) 3) + sign next to each. Get camera very close. All 3
                fill most of the frame. Enable Scan Enhancement for white
                background.
              </div>
              <div
                className="bg-red-50 border border-red-400 rounded-xl p-3.5 text-[14px]"
                style={{ fontFamily: "sans-serif" }}
              >
                <strong className="text-red-900 block mb-1">
                  ❌ DON&apos;T DO
                </strong>
                Sign tiny at the bottom of a large white sheet. Photo from far.
                Uploading via direct camera option.
              </div>
            </div>
          </section>

          <hr className="border-green-100 mt-3 mb-10" />

          {/* Steps */}
          <section className="mb-12">
            <div className="inline-block bg-green-800 text-white rounded-full px-3.5 py-1 text-[11px] font-bold tracking-widest uppercase mb-3">
              Complete Guide
            </div>
            <h2
              className="text-[32px] font-bold mb-2 text-green-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              5 Steps to Fix the Error
            </h2>
            <p
              className="text-[15px] text-gray-500 mb-8 leading-relaxed"
              style={{ fontFamily: "sans-serif" }}
            >
              Follow in order. This exact process was verified working on the
              UPSC CSE application portal.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="bg-white border border-green-200 rounded-2xl p-6 relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={i === 4 ? { gridColumn: "1 / -1" } : {}}
                >
                  <span
                    className="absolute top-2.5 right-4 text-green-100 font-black select-none leading-none"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: 60,
                    }}
                  >
                    {step.number}
                  </span>
                  <div className="text-3xl mb-2.5">{step.icon}</div>
                  <h3
                    className="text-[19px] font-bold mb-2.5 leading-snug text-green-900"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-[14px] leading-relaxed text-gray-500 max-w-sm"
                    style={{ fontFamily: "sans-serif" }}
                  >
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-green-100 mb-10" />

          {/* Why mobile fails */}
          <section className="mb-12">
            <h2
              className="text-[28px] font-bold mb-4 text-green-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Why Does This Happen on Mobile?
            </h2>
            {[
              {
                icon: "📱",
                text: (
                  <span>
                    When you tap <strong>&apos;Camera&apos;</strong> directly on
                    the UPSC upload page, the browser captures the image and
                    assigns a random filename. It bypasses your resized file
                    entirely.
                  </span>
                ),
                bg: "#fff7ed",
                border: "#fbbf24",
              },
              {
                icon: "✅",
                text: (
                  <span>
                    When you save the resized image to your{" "}
                    <strong>gallery/downloads</strong> first, then select it via{" "}
                    <strong>&apos;Files&apos; or &apos;Gallery&apos;</strong>,
                    the correct pre-processed file gets uploaded every time.
                  </span>
                ),
                bg: "#f0fdf4",
                border: "#16a34a",
              },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3.5 rounded-xl p-4 mb-3 text-[14px] leading-relaxed border"
                style={{
                  background: p.bg,
                  borderColor: p.border,
                  fontFamily: "sans-serif",
                }}
              >
                <span className="text-2xl shrink-0">{p.icon}</span>
                <p className="m-0">{p.text}</p>
              </div>
            ))}
          </section>

          {/* Checklist */}
          <section className="bg-white border border-green-200 rounded-2xl px-7 py-7 mb-12">
            <h2
              className="text-2xl font-bold mb-5 text-green-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              📋 Pre-Upload Checklist
            </h2>
            {checklist.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 text-[15px]"
                style={{
                  borderBottom:
                    i < checklist.length - 1 ? "1px solid #f0fdf4" : "none",
                  fontFamily: "sans-serif",
                }}
              >
                <span className="text-lg">✅</span>
                <span>{item}</span>
              </div>
            ))}
          </section>

          {/* FAQ (Client — accordion) */}
          <section className="mb-14">
            <h2
              className="text-[28px] font-bold mb-6 text-green-900"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Frequently Asked Questions
            </h2>
            <FaqAccordion faqs={faqs} />
          </section>
        </main>

        {/* ── Footer ── */}
        <footer
          className="bg-[#052e16] text-center px-6 pt-12 pb-7"
          style={{
            fontFamily: "sans-serif",
            fontSize: 14,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <div className="max-w-2xl mx-auto">
            <div
              className="text-2xl text-green-400 mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <a
                href={`${process.env.BASE_URL}`}
                className="text-green-400 hover:text-green-300 no-underline"
              >
                SahiPhoto.in
              </a>
            </div>
            <p className="mb-5 leading-relaxed">
              Free browser-based tool to resize, compress, and format photos
              &amp; signatures for UPSC, SSC, Railway, Banking, and all
              government exam portals — 100% private.
            </p>
            <div className="flex flex-wrap justify-center gap-5 mb-7 text-[13px]">
              {[
                "Home",
                "UPSC Photo Resizer",
                "SSC CGL Photo",
                "Bank PO Signature",
                "Custom Resize",
              ].map((l) => (
                <a
                  key={l}
                  href={`${process.env.BASE_URL}`}
                  className="no-underline hover:text-white transition-colors"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {l}
                </a>
              ))}
            </div>
            <div
              className="rounded-xl p-3.5 mb-6 text-[12px] leading-relaxed"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              UPSC signature blank percentage error fix · triple signature blank
              more than 95.5 UPSC · UPSC CSE 2026 form filling signature upload
              problem · signature upload error UPSC prelims · upsc otr signature
              size
            </div>
            <div
              className="border-t pt-5"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <p style={{ color: "rgba(255,255,255,0.6)" }}>
                © {new Date().getFullYear()} SahiPhoto.in · Made with ❤️ for
                Indian aspirants — Nihal Singh
              </p>
              <p className="mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                Informational guide — always verify specifications on the
                official UPSC portal.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
