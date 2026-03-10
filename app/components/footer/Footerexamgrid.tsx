"use client";

// app/components/FooterExamGrid.tsx
// Thin client island — handles "show all" toggle + suppresses self-links.

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { toSlug } from "./footer";

interface FooterExamGridProps {
  initialExams: string[];
  allExams: string[];
  /** Full pathname of the current page, e.g. "/ssc-cgl" or "/" */
  pathname: string;
  showToggle: boolean;
}

export default function FooterExamGrid({
  initialExams,
  allExams,
  pathname,
  showToggle,
}: FooterExamGridProps) {
  const [showAll, setShowAll] = useState(false);
  const displayExams = showAll ? allExams : initialExams;

  // Normalise once — strip leading/trailing slashes
  const currentSlug = pathname.replace(/^\/|\/$/g, "");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {displayExams.map((exam) => {
          const slug = toSlug(exam);
          const isCurrent = slug === currentSlug;

          const inner = (
            <div className="flex items-start gap-2">
              <ChevronRight
                size={14}
                className={`mt-0.5 flex-shrink-0 transition-colors ${
                  isCurrent
                    ? "text-green-400"
                    : "text-gray-600 group-hover:text-green-400"
                }`}
              />
              <span
                className={`text-xs md:text-sm leading-snug line-clamp-2 transition-colors ${
                  isCurrent
                    ? "text-green-400 font-medium"
                    : "text-gray-400 group-hover:text-green-400"
                }`}
              >
                {exam}
              </span>
            </div>
          );

          // Current page — render a plain div, no anchor, so no duplicate link
          if (isCurrent) {
            return (
              <div
                key={exam}
                aria-current="page"
                className="relative p-3 bg-green-500/10 border border-green-500/30 rounded-lg cursor-default"
                title={`You are on: ${exam}`}
              >
                {inner}
              </div>
            );
          }

          return (
            <a
              key={exam}
              href={`/${slug}`}
              className="group relative p-3 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700 hover:border-green-500/50 rounded-lg transition-all duration-200"
              title={`${exam} photo size requirements`}
            >
              {inner}
            </a>
          );
        })}
      </div>

      {showToggle && (
        <>
          {/* Desktop toggle */}
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium hidden md:block"
          >
            {showAll ? "Show Less" : `View All ${allExams.length}`}
          </button>

          {/* Mobile toggle */}
          {!showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full md:hidden px-4 py-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>View All {allExams.length} Exams</span>
              <ChevronRight size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
