// app/components/ExamSEOSection.tsx
// Server Component — renders the requirements table (server) and FAQ (client island).
// All JSON-LD schema tags live here so they're always in the server-rendered HTML.

import ExamRequirementsTable, {
  type ExamConditions,
} from "./Examrequirementstable";
import ExamFAQSection from "./examfaqsection";

// ─── FAQ JSON-LD (built server-side so it ships in the initial HTML) ──────────

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
  ssc: [
    {
      q: "What background is required for the SSC photo?",
      a: "A plain white background is required for SSC exams. Ensure there are no shadows, patterns, or distracting elements behind you.",
    },
    {
      q: "Why was my SSC signature rejected?",
      a: "Common reasons include a file size outside the allowed range, wrong format, blurry scan, or signature going beyond the canvas edges. Use Scan Enhancement to clean it up.",
    },
    {
      q: "Can I wear glasses in the SSC photo?",
      a: "SSC guidelines generally require a clear, full-face photo without dark glasses. Prescription glasses may be acceptable — always check the latest notification.",
    },
    {
      q: "Is live photo capture mandatory for SSC?",
      a: "SSC does not mandate live capture. You can upload a scanned or photographed passport-size image.",
    },
    {
      q: "Can I use the same photo for multiple SSC exams?",
      a: "If the requirements are identical (which they often are across SSC exams), the same processed file can be reused — just make sure it is recent.",
    },
  ],
  upsc: [
    {
      q: "What signature style does UPSC require?",
      a: "UPSC requires a signature in running (cursive) handwriting — block capitals are not accepted. Sign on white paper and scan clearly.",
    },
    {
      q: "Can I use a digital photo for UPSC?",
      a: "Yes, a digital camera or smartphone photo is acceptable as long as it is a recent, clear, passport-size portrait on a plain light background.",
    },
    {
      q: "Does UPSC reject photos with glasses?",
      a: "Dark or tinted glasses are not allowed. Prescription glasses are generally permitted — always refer to the latest UPSC notification for confirmation.",
    },
    {
      q: "Is background colour important for UPSC photo?",
      a: "A plain white or off-white background is strongly recommended. Avoid busy patterns, gradients, or dark backgrounds.",
    },
  ],
  rbi: [
    {
      q: "Does RBI Grade B require a scanned signature?",
      a: "Yes. Sign on blank white paper with black or blue ink, scan or photograph it, then upload. Enable Scan Enhancement for a clean white background.",
    },
    {
      q: "What happens if my RBI photo exceeds the size limit?",
      a: "The application form will likely reject it. Use the tool to automatically compress it into the accepted range before uploading.",
    },
  ],
  sbi: [
    {
      q: "Why does SBI reject my photo?",
      a: "Most rejections are due to wrong file size, incorrect dimensions, non-white background, or uploading in PNG instead of JPEG.",
    },
    {
      q: "What ink colour should I use for my SBI signature?",
      a: "Use black or blue ink on plain white paper. The signature must be in running script — initials alone are not accepted.",
    },
  ],
  ibps: [
    {
      q: "What are the IBPS photo requirements?",
      a: "IBPS requires a recent passport-size photo in JPEG format on a white background. Check the official notification for the exact KB range for each exam cycle.",
    },
    {
      q: "Can I use the same photo for IBPS PO and Clerk?",
      a: "Requirements are usually identical across IBPS exams in the same cycle. The same processed file can generally be reused.",
    },
  ],
  nra: [
    {
      q: "What is NRA CET and why does it need a photo?",
      a: "NRA CET (Common Eligibility Test) is a shared exam for multiple central government jobs. A recent passport-size photo in JPEG format is required for the application form.",
    },
  ],
};

function getFaqsForSchema(examName: string) {
  const lower = examName.toLowerCase();
  const extra: { q: string; a: string }[] = [];
  if (lower.includes("ssc")) extra.push(...FAQ_BANK.ssc);
  else if (lower.includes("upsc")) extra.push(...FAQ_BANK.upsc);
  else if (lower.includes("rbi")) extra.push(...FAQ_BANK.rbi);
  else if (lower.includes("sbi")) extra.push(...FAQ_BANK.sbi);
  else if (lower.includes("ibps")) extra.push(...FAQ_BANK.ibps);
  else if (lower.includes("nra")) extra.push(...FAQ_BANK.nra);
  return [...extra, ...FAQ_BANK.default];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  examName: string;
  examConditions: ExamConditions | null;
}

export default function ExamSEOSection({ examName, examConditions }: Props) {
  if (!examName) return null;

  const faqs = getFaqsForSchema(examName);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div>
      {/* FAQ JSON-LD lives here so it is always server-rendered, regardless of
          whether the client-side accordion has hydrated yet. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Requirements table — Server Component, zero JS sent to browser */}
      <ExamRequirementsTable
        examName={examName}
        examConditions={examConditions}
      />

      <hr
        style={{
          border: "none",
          borderTop: "1.5px dashed #e5e7eb",
          margin: "40px 0",
        }}
      />

      {/* FAQ accordion — Client Component island (useState for open/close) */}
      <ExamFAQSection examName={examName} />
    </div>
  );
}
