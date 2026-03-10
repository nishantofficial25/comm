// app/image-to-pdf/page.tsx
import type { Metadata } from "next";
import { SharedFooter } from "../shared";
import ImageToPdfTool from "@/components/tools/imagetopdf";

export const metadata: Metadata = {
  title:
    "Free Image to PDF Converter – Combine JPG, PNG Photos into PDF | SahiPhoto",
  description:
    "Convert and combine multiple JPG, PNG, HEIC images into a single PDF online. Drag to reorder pages, set target KB size. Free tool by sahiphoto.in.",
  keywords: [
    "image to pdf",
    "jpg to pdf",
    "png to pdf",
    "combine images to pdf",
    "photos to pdf online free",
    "sahiphoto",
  ],
  alternates: { canonical: "https://sahiphoto.in/image-to-pdf" },
  openGraph: {
    title: "Free Image to PDF – Combine JPG, PNG into PDF | SahiPhoto",
    description:
      "Convert multiple images into one PDF. Drag to reorder pages, set target file size. Free and secure.",
    type: "website",
  },
};

const faqItems: [string, string][] = [
  [
    "How do I convert images to a PDF?",
    "Click the upload area or drag your images in. Add as many as you need, drag the thumbnails to reorder the pages, then click 'Make PDF' to generate and download instantly.",
  ],
  [
    "Can I change the page order?",
    "Yes! After uploading, drag the photo thumbnails to rearrange them. On mobile, press and hold a thumbnail to drag it. The final PDF follows your custom order.",
  ],
  [
    "Does it support multiple images?",
    "Absolutely. Select multiple files at once or use 'Add more images' to keep adding pages to your PDF.",
  ],
  [
    "Can I set a target PDF file size?",
    "Yes — enter Min and Max KB values in Step 2 and the tool will compress images to fit your range.",
  ],
  [
    "Are my images safe when uploaded?",
    "Yes. Files are processed on our secure servers and permanently deleted immediately after download. We never store or share your photos.",
  ],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Image to PDF Converter – sahiphoto.in",
  applicationCategory: "Utility",
  operatingSystem: "Any",
  url: "https://sahiphoto.in/tools/imagetopdf",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  description:
    "Convert and combine multiple images into a single PDF document online for free.",
};

export default function ImageToPdfPage() {
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
        {/* <PageNavbar themeKey="imgpdf" activeTool="Image to PDF" />
 */}
        <header
          className="px-6 pt-14 pb-10 text-center border-b border-gray-200"
          style={{
            background: "linear-gradient(180deg,#f5f3ff 0%,#f8fafc 100%)",
          }}
        >
          <div className="inline-flex items-center gap-1.5 bg-violet-100 border border-violet-300 text-violet-700 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest mb-5">
            🖼 Image to PDF
          </div>
          <h1
            className="font-black tracking-tight text-gray-900 mb-3.5"
            style={{
              fontSize: "clamp(1.8rem,4.5vw,2.8rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Combine Images into <span className="text-violet-600">One PDF</span>
          </h1>
          <p className="text-base text-gray-500 max-w-lg mx-auto leading-relaxed">
            Upload JPG, PNG or HEIC photos, drag to arrange page order &amp;
            download a polished PDF instantly. Perfect for multi-page exam
            documents.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            {[
              "✓ Drag to Reorder Pages",
              "✓ Multiple Images at Once",
              "✓ Optional KB Range",
              "✓ Free & Secure",
            ].map((t) => (
              <span
                key={t}
                className="text-xs font-semibold text-violet-700 bg-violet-100 px-3 py-1.5 rounded-full border border-violet-200"
              >
                {t}
              </span>
            ))}
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 pt-7">
          <ImageToPdfTool />
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

        <SharedFooter themeKey="imgpdf" toolName="Image to PDF" />
      </div>
    </>
  );
}
