// app/image-resizer/page.tsx
import type { Metadata } from "next";
import {  SharedFooter } from "../shared";
import ImageResizerTool from "@/components/tools/imageresizer";

export const metadata: Metadata = {
  title: "Free Image Resizer – Resize Photo to Exact KB | SahiPhoto",
  description:
    "Resize and compress JPG, PNG photos to exact KB size. Set custom dimensions in cm or px. Free tool by sahiphoto.in.",
  keywords: [
    "image resizer",
    "compress photo",
    "resize photo to 50kb",
    "photo resize online free",
    "sahiphoto",
  ],
  alternates: { canonical: "https://sahiphoto.in/tools/imageresizer" },
  openGraph: {
    title: "Free Image Resizer – Resize Photo to Exact KB | SahiPhoto",
    description:
      "Compress and resize photos. Set KB range and custom dimensions. Free by sahiphoto.in.",
    type: "website",
  },
};

const faqItems = [
  [
    "How do I resize a photo to a specific size in KB?",
    "Upload your image, enter your Min and Max size in KB, then click 'Resize Image'. Our servers automatically adjust quality and dimensions to fit your exact target range.",
  ],
  [
    "What formats are supported?",
    "JPG, JPEG, PNG, and HEIC/HEIF images are supported. You can also choose the output format between JPG, JPEG, and PNG.",
  ],
  [
    "Can I set custom dimensions?",
    "Yes! Set exact width and height in centimetres (cm) or pixels (px) along with your KB size range.",
  ],
  [
    "Is my photo safe when uploaded?",
    "Yes. Files are processed on our secure servers and are automatically deleted immediately after your download. We never store or share your images.",
  ],
  [
    "Is this tool free?",
    "Completely free — no account or sign-up needed. This is a free tool from sahiphoto.in for exam aspirants.",
  ],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Image Resizer – sahiphoto.in",
  applicationCategory: "Utility",
  operatingSystem: "Any",
  url: "https://sahiphoto.in/image-resizer",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  description: "Resize and compress images to exact KB.",
};

export default function ImageResizerPage() {
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
        {/* <PageNavbar themeKey="image" activeTool="Image Resizer" />
 */}
        {/* Hero — static, server-rendered */}
        <header
          className="px-6 pt-14 pb-10 text-center border-b border-gray-200"
          style={{
            background: "linear-gradient(180deg,#fff7ed 0%,#f8fafc 100%)",
          }}
        >
          <div className="inline-flex items-center gap-1.5 bg-orange-100 border border-orange-300 text-orange-700 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-widest mb-5">
            🖼 Image Resizer
          </div>
          <h1
            className="text-4xl font-black tracking-tight text-gray-900 mb-2"
            style={{
              fontSize: "clamp(1.8rem,4.5vw,2.8rem)",
              letterSpacing: "-0.03em",
            }}
          >
            Resize Photo to <span className="text-orange-500">Exact KB</span>
          </h1>
          <p className="text-base text-gray-500 max-w-lg mx-auto leading-relaxed">
            Compress &amp; resize JPG, PNG photos to precise file sizes for SSC,
            UPSC, Bank &amp; Railway exam forms. Set custom dimensions — results
            in seconds.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            {[
              "✓ JPG · PNG · HEIC",
              "✓ Set KB Range",
              "✓ Custom Width & Height",
              "✓ Free to Use",
            ].map((t) => (
              <span
                key={t}
                className="text-xs font-semibold text-orange-700 bg-orange-100 px-3 py-1.5 rounded-full border border-orange-200"
              >
                {t}
              </span>
            ))}
          </div>
        </header>

        {/* Interactive tool — client component */}
        <main className="max-w-2xl mx-auto px-4 pt-7">
          <ImageResizerTool />
        </main>

        {/* FAQ — static, server-rendered */}
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

        <SharedFooter themeKey="image" toolName="Image Resizer" />
      </div>
    </>
  );
}
