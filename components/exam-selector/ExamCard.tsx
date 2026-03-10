"use client";

import Link from "next/link";
import { EnrichedExam } from "@/types/exam";

interface Props {
  exam: EnrichedExam;
  isCustom?: boolean;
}

export default function ExamCard({ exam, isCustom }: Props) {
  const toSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const href = isCustom ? "/custom" : `/${toSlug(exam.exam)}`;
  const displayName = isCustom ? "Custom" : exam.exam;

  if (!exam.hasConditions && !isCustom) {
    return (
      <div
        title={exam.exam}
        className="relative px-2 py-2.5 rounded-lg font-semibold text-xs bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed opacity-70 flex flex-col items-center justify-center min-h-[50px]"
      >
        <span className="text-center leading-tight truncate w-full px-1">
          {exam.exam}
        </span>
        <span className="text-[10px] mt-1 font-bold text-orange-500">
          Coming Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      title={displayName}
      className={`relative px-2 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 bg-white text-gray-800 border-2 hover:shadow-md active:scale-95 flex items-center justify-center min-h-[50px] no-underline ${
        isCustom
          ? "border-green-600 hover:border-green-400"
          : "border-gray-200 hover:border-green-400"
      }`}
    >
      {(exam.status === "ACTIVE" || exam.status === "UPCOMING") && (
        <span
          className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full animate-pulse z-10 ${
            exam.status === "ACTIVE" ? "bg-red-500" : "bg-yellow-400"
          }`}
          title={exam.status === "ACTIVE" ? "Forms Out" : "Upcoming"}
        />
      )}
      <span className="text-center leading-tight truncate w-full px-1">
        {displayName}
      </span>
    </Link>
  );
}
