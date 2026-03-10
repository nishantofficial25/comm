// app/pdf-compressor/page.tsx
import type { Metadata } from "next";
import { SharedFooter } from "../shared";
import PdfCompressorTool from "@/components/tools/pdfcompressor";

export const metadata: Metadata = {
  title: "Free PDF Compressor – Compress PDF to Exact KB for Exams | SahiPhoto",
  description:
    "Compress PDF files to exact KB size. No sign-up needed. Free secure tool by sahiphoto.in.",
  keywords: [
    "pdf compressor",
    "compress pdf online",
    "reduce pdf size",
    "pdf to kb",
    "compress pdf",
    "shrink pdf free",
    "sahiphoto",
  ],
  alternates: { canonical: "https://sahiphoto.in/pdf-compressor" },
  openGraph: {
    title: "Free PDF Compressor – Compress PDF to Exact KB | SahiPhoto",
    description:
      "Reduce PDF size to specific KB range. Secure, free, by sahiphoto.in.",
    type: "website",
  },
};

const faqItems: [string, string][] = [
  [
    "How do I compress a PDF to a specific size in KB?",
    "Upload your PDF, enter your Min and Max target in KB, then click 'Compress PDF'. Our servers automatically compress the file to fit within your specified range.",
  ],
  [
    "What is the maximum PDF size I can upload?",
    "You can upload PDF files up to 50 MB.",
  ],
  [
    "Is my PDF safe when uploaded?",
    "Yes. Files are processed on our encrypted servers and permanently deleted right after you download your file. We never store or share your documents.",
  ],
  [
    "Will compressing reduce quality?",
    "The tool applies smart compression to minimise quality loss. For most PDFs, the difference is barely noticeable at standard compression levels.",
  ],
  [
    "Is this tool completely free?",
    "Yes — no sign-up, no payment. This is a free tool by sahiphoto.in for exam aspirants and students.",
  ],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PDF Compressor – sahiphoto.in",
  applicationCategory: "Utility",
  operatingSystem: "Any",
  url: "https://sahiphoto.in/tools/pdfcompressor",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  description: "Compress PDF files to exact KB.",
};

export default function PdfCompressorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div
        className="min-h-screen bg-gray-50 text-gray-900"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* <PageNavbar themeKey="pdf" activeTool="PDF Compressor" /> */}

        <header
          className="px-6 pt-14 pb-10 text-center border-b border-gray-200"
          style={{
            background: "linear-gradient(180deg,#eff6ff 0%,#f8fafc 100%)",
          }}
        >
          <div className="inline-flex items-center gap-1.5 bg-blue-100 border border-blue-300 text-blue-700 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest mb-5">
            📄 PDF Compressor
          </div>
          <h1
            className="font-black tracking-tight text-gray-900 mb-3.5"
            style={{
              fontSize: "clamp(1.8rem,4.5vw,2.8rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Compress PDF to <span className="text-blue-600">Exact Size</span>
          </h1>
          <p className="text-base text-gray-500 max-w-lg mx-auto leading-relaxed">
            Reduce PDF file size to precise KB requirements for government
            portals, job applications &amp; exam forms. Fast, secure &amp;
            completely free.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            {[
              "✓ Any PDF Format",
              "✓ Set KB Range",
              "✓ Instant Download",
              "✓ Secure Servers",
            ].map((t) => (
              <span
                key={t}
                className="text-xs font-semibold text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full border border-blue-200"
              >
                {t}
              </span>
            ))}
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 pt-7">
          <PdfCompressorTool />
        </main>

        <section className="max-w-2xl mx-auto px-4 pb-12 pt-2">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-gray-900 mb-5">
              Frequently Asked Questions
            </h2>
            {faqItems.map(([q, a]) => (
              <div
                key={q}
                className="mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0"
              >
                <h3 className="text-sm font-bold text-gray-700 mb-1">{q}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed m-0">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        <SharedFooter themeKey="pdf" toolName="PDF Compressor" />
      </div>
    </>
  );
}
