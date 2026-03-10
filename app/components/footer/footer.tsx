// app/components/Footer.tsx
// Server Component — SSR/ISR. No self-links on any page.

import Link from "next/link";
import {
  FileText,
  Mail,
  ExternalLink,
  ChevronRight,
  Search,
  Award,
  GraduationCap,
} from "lucide-react";
import { fetchExamMetadata } from "@/lib/exam-api";
import { ExamMetadata } from "@/types/exam";
import FooterExamGrid from "./Footerexamgrid";

// ─── helpers ────────────────────────────────────────────────────────────────

export const toSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Normalise a pathname to a bare slug for comparison ("/" → "", "/ssc-cgl/" → "ssc-cgl") */
const toCurrentSlug = (pathname: string) => pathname.replace(/^\/|\/$/g, "");

type Category = "ssc" | "upsc" | "bank" | "railway" | "state" | "other";

function getCategory(examName: string): Category {
  const lower = examName.toLowerCase();
  if (lower.includes("ssc")) return "ssc";
  if (lower.includes("upsc") || lower.includes("civil")) return "upsc";
  if (
    lower.includes("bank") ||
    lower.includes("ibps") ||
    lower.includes("rbi") ||
    lower.includes("sbi")
  )
    return "bank";
  if (lower.includes("railway") || lower.includes("rrb")) return "railway";
  if (lower.includes("state") || lower.includes("psc")) return "state";
  return "other";
}

function categorizeExams(exams: string[]) {
  const categories: Record<Category, string[]> = {
    ssc: [],
    upsc: [],
    bank: [],
    railway: [],
    state: [],
    other: [],
  };
  exams.forEach((exam) => categories[getCategory(exam)].push(exam));
  return categories;
}

function getRelatedExams(
  currentExam: string | null,
  exams: string[],
): string[] {
  if (!currentExam) return exams.slice(0, 24);

  const category = getCategory(currentExam);
  const categorized = categorizeExams(exams);

  // currentExam is already excluded from display by the grid rendering it as
  // aria-current="page" instead of a link, but we still include it in the list
  // so the grid can render it as a highlighted non-link tile.
  const related = categorized[category].slice(0, 9);
  const others = exams
    .filter((e) => !related.includes(e))
    .slice(0, 12 - related.length + (related.includes(currentExam) ? 1 : 0));

  return [...related, ...others];
}

function getDynamicSEOContent(currentExam: string | null) {
  if (currentExam) {
    return {
      title: `Related Exams for ${currentExam}`,
      sections: [
        {
          title: `${currentExam} Photo Requirements`,
          Icon: Award,
          content: `Get accurate ${currentExam} photo size specifications, ${currentExam} signature size requirements, and ${currentExam} photo resize tools. Upload your photo to automatically resize it to the exact ${currentExam} 2026 requirements.`,
        },
        {
          title: "Photo Resizing Tools",
          Icon: FileText,
          content: `Free online tools to resize photo to 20KB, 50KB, or 100KB for ${currentExam} application form. Convert images to JPG format and compress without losing quality for ${currentExam} online registration.`,
        },
        {
          title: "Similar Exams",
          Icon: GraduationCap,
          content: `Explore photo requirements for related government exams. Check specifications for other competitive exams in the same category to prepare all your documents at once.`,
        },
      ],
    };
  }
  return {
    title: "All Government Exams",
    sections: [
      {
        title: "Popular Exam Photo Resizers",
        Icon: Award,
        content:
          "SSC photo resize online for CGL, CHSL, MTS 2026 forms, UPSC photo size requirements and signature size for Civil Services, NEET photo size 2026 and JEE Main specifications, Railway RRB photo size and AFCAT photo resize, IBPS photo size and BPSC photo resize online.",
      },
      {
        title: "Smart Resize Tools",
        Icon: FileText,
        content:
          "Free photo resize for government exams - compress image below 100KB, 20KB to 50KB photo resize with quality preserved, online signature resize tool to 140x60 pixels, resize image to 200x230 pixels for passport size photo, exam photo compressor online.",
      },
      {
        title: "2026 Exam Requirements",
        Icon: GraduationCap,
        content:
          "SSC CGL photo and signature size 2026 with CHSL specifications, UPSC CSE photo size 2026 including NDA and CDS photo resize, NEET UG photo size in KB and JEE Main signature size limit, Railway RRB NTPC photo size and AFCAT photo size in pixels.",
      },
    ],
  };
}

// ─── NavItem — renders a Link or a plain span depending on current page ──────

function NavItem({
  href,
  label,
  currentSlug,
  className,
  children,
}: {
  href: string;
  label: string;
  currentSlug: string;
  className: string;
  children?: React.ReactNode;
}) {
  const hrefSlug = toCurrentSlug(href);
  const isCurrent = hrefSlug === currentSlug;

  if (isCurrent) {
    return (
      <span
        aria-current="page"
        className={`${className} opacity-60 cursor-default`}
        title={`Current page: ${label}`}
      >
        {children ?? label}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children ?? label}
    </Link>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface FooterProps {
  /** Resolved exam name from the URL, or null on non-exam pages */
  currentExam?: string | null;
  /**
   * Full pathname from the server, e.g. "/" | "/custom" | "/ssc-cgl"
   * In App Router, pass via: headers().get("x-pathname") set by middleware,
   * or directly from params in a [slug]/layout.tsx.
   */
  pathname?: string;
}

// ─── Server Component ────────────────────────────────────────────────────────

export default async function Footer({
  currentExam = null,
  pathname = "/",
}: FooterProps) {
  let exams: string[] = [];

  try {
    const metadata: ExamMetadata[] = await fetchExamMetadata();
    exams = metadata
      .map((item) => (item as any).exam ?? (item as any).examName ?? "")
      .filter(Boolean);
  } catch (err) {
    console.error("Footer: failed to fetch exam metadata", err);
  }

  const currentSlug = toCurrentSlug(pathname);
  const isHomePage = currentSlug === "";
  const displayExams = getRelatedExams(currentExam, exams);
  const dynamicContent = getDynamicSEOContent(currentExam);

  const quickLinks = [
    {
      href: "/",
      label: "Browse All Exams",
      Icon: FileText,
    },
    {
      href: "/custom",
      label: "Custom Requirements",
      Icon: ExternalLink,
    },
  ];

  const bottomNavLinks = [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/contact", label: "Contact Us" },
    { href: "/sitemap.xml", label: "Sitemap" },
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300 border-t border-gray-700">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-12">
          {/* ── Brand & Info ──────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                SahiPhoto.in
              </h3>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                Your one-stop solution for government exam photo and signature
                requirements. Accurate specifications for 100+ exams.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                Why Choose Us?
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {[
                  "Accurate photo & signature requirements",
                  "Updated for latest exam notifications",
                  "Free to use, no registration needed",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ChevronRight
                      size={16}
                      className="text-green-400 mt-0.5 flex-shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Links — no link rendered for current page */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                Quick Links
              </h4>
              <div className="flex flex-col gap-2">
                {quickLinks.map(({ href, label, Icon }) => {
                  const isCurrent = toCurrentSlug(href) === currentSlug;
                  const baseClass =
                    "flex items-center gap-2 text-sm w-fit transition-colors";

                  if (isCurrent) {
                    return (
                      <span
                        key={href}
                        aria-current="page"
                        className={`${baseClass} text-green-400 opacity-70 cursor-default`}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`${baseClass} text-gray-400 hover:text-green-400 group`}
                    >
                      <Icon
                        size={16}
                        className="group-hover:scale-110 transition-transform"
                      />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Mail size={16} />
                <span>
                  Developed for Students with ❤️ by{" "}
                  <span className="text-green-400 font-medium">
                    Nihal Singh
                  </span>{" "}
                  Contact@{" "}
                  <a
                    className="text-green-400 font-medium"
                    href="mailto:sahiphoto.in@gmail.com"
                  >
                    sahiphoto.in@gmail.com
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* ── Exam Grid ─────────────────────────────────────────────── */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Search size={24} className="text-green-400" />
                </div>
                <span>{dynamicContent.title}</span>
              </h4>
            </div>

            <FooterExamGrid
              initialExams={displayExams}
              allExams={exams}
              pathname={pathname}
              showToggle={!currentExam && exams.length > 24}
            />

            <div className="flex flex-wrap gap-3 mt-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-full">
                <Award size={16} className="text-green-400" />
                <span className="text-sm font-semibold text-green-400">
                  {currentExam
                    ? "Related Exams"
                    : `${exams.length}+ Government Exams`}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-full">
                <FileText size={16} className="text-blue-400" />
                <span className="text-sm font-medium text-blue-400">
                  Always Updated
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dynamic SEO Content ───────────────────────────────────── */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {dynamicContent.sections.map((section) => (
              <div key={section.title} className="space-y-4">
                <h5 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
                  <section.Icon size={16} className="text-green-400" />
                  {section.title}
                </h5>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          {isHomePage && (
            <div className="mt-8 pt-6 border-t border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                    Common Photo Tools
                  </h5>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Convert photo to JPG for online forms, resize photo to 20KB,
                    50KB photo resize online free, resize image for online form,
                    government exam photo resizer with format conversion
                  </p>
                </div>
                <div className="space-y-3">
                  <h5 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                    Banking &amp; Defense Exams
                  </h5>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    IBPS Clerk photo size, SSC MTS photo size requirement,
                    passport size photo maker, image compressor for exam forms,
                    PDF compressor for government exams
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom Bar ───────────────────────────────────────────── */}
        <div className="mt-10 pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs md:text-sm text-gray-500 text-center md:text-left">
              © {new Date().getFullYear()} SahiPhoto. All rights reserved. |
              Helping candidates since 2024
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm">
              {bottomNavLinks.map(({ href, label }) => {
                const isCurrent = toCurrentSlug(href) === currentSlug;
                return isCurrent ? (
                  <span
                    key={href}
                    aria-current="page"
                    className="text-green-400 opacity-70 cursor-default"
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    className="text-gray-500 hover:text-green-400 transition-colors"
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Schema.org structured data */}
        <div
          className="hidden"
          itemScope
          itemType="https://schema.org/WebApplication"
        >
          <span itemProp="name">
            {currentExam
              ? `${currentExam} Photo Resizer - SahiPhoto`
              : "SahiPhoto"}
          </span>
          <span itemProp="description">
            {currentExam
              ? `${currentExam} photo and signature requirements tool - accurate ${currentExam} photo size specifications for 2026 online application forms`
              : "Government exam photo and signature requirements tool for Indian competitive examinations"}
          </span>
          <span itemProp="applicationCategory">Utility</span>
          <span itemProp="offers" itemScope itemType="https://schema.org/Offer">
            <span itemProp="price">0</span>
            <span itemProp="priceCurrency">INR</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
