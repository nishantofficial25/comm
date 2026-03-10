"use client";

// app/components/ExamFAQSection.tsx
// Client Component — only this file needs "use client" because of useState.

import { useState, useMemo } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

// ─── FAQ bank ─────────────────────────────────────────────────────────────────

const FAQ_BANK: Record<string, { q: string; a: string }[]> = {
  default: [
    {
      q: "Is this photo and signature resizer free?",
      a: "Yes, completely free. No registration, no watermarks, and no limits on the number of files you process.",
    },
    {
      q: "Can I resize photos and signatures on mobile?",
      a: "Absolutely. The tool works on all modern smartphones and tablets directly from your browser — no app install needed.",
    },
    {
      q: "Why does the output show 'Out of range'?",
      a: "This means the compressed file couldn't fit exactly within the required KB range for this exam. You can still download it and try, or use the Edit button to adjust requirements and re-process.",
    },
    {
      q: "What image formats are accepted?",
      a: "Most exams require JPEG/JPG. The tool automatically converts your image to the correct format during processing.",
    },
    {
      q: "Does resizing reduce image quality?",
      a: "Our tool uses smart progressive compression to hit the exact size range while keeping the image as sharp as possible.",
    },
  ],
};

function getFaqs(examName: string) {
  const lower = examName.toLowerCase();
  const extra: { q: string; a: string }[] = [];
  return [...extra, ...FAQ_BANK.default];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamFAQSection({ examName }: { examName: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const faqs = useMemo(() => getFaqs(examName), [examName]);
  const yr = new Date().getFullYear();

  // JSON-LD is rendered server-side in the parent Server Component (ExamSEOSection).
  // We only handle the interactive accordion here.

  return (
    <section
      aria-labelledby={`faq-heading-${examName}`}
      style={{ margin: "40px 0" }}
    >
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#f0fdf4",
            border: "1.5px solid #bbf7d0",
            borderRadius: 99,
            padding: "5px 14px",
            marginBottom: 12,
          }}
        >
          <HelpCircle size={13} color="#16a34a" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#16a34a",
              letterSpacing: 1,
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            Help Centre
          </span>
        </div>
        <h2
          id={`faq-heading-${examName}`}
          style={{
            fontFamily: "Georgia,'Times New Roman',serif",
            fontSize: "clamp(20px,4vw,26px)",
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 6px",
            lineHeight: 1.2,
          }}
        >
          Frequently Asked Questions
        </h2>
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: 13,
            color: "#6b7280",
            margin: 0,
          }}
        >
          Common queries about {examName} photo and signature requirements {yr}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,420px),1fr))",
          gap: 10,
        }}
      >
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              style={{
                border: `1.5px solid ${isOpen ? "#86efac" : "#e5e7eb"}`,
                borderRadius: 12,
                overflow: "hidden",
                background: isOpen ? "#f0fdf4" : "#fff",
                transition: "all 0.2s",
                boxShadow: isOpen ? "0 2px 12px rgba(22,163,74,.08)" : "none",
              }}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontFamily: "sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: isOpen ? "#15803d" : "#374151",
                    lineHeight: 1.4,
                    flex: 1,
                  }}
                >
                  {faq.q}
                </span>
                <ChevronDown
                  size={16}
                  color={isOpen ? "#16a34a" : "#9ca3af"}
                  style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    flexShrink: 0,
                  }}
                />
              </button>
              {isOpen && (
                <div
                  style={{
                    padding: "12px 16px 14px",
                    fontFamily: "sans-serif",
                    fontSize: 13,
                    color: "#4b5563",
                    lineHeight: 1.6,
                    borderTop: "1px solid #d1fae5",
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
