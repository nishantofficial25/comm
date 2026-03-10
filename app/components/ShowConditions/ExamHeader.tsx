// components/ExamHeader.tsx
// Pure Server Component — no interactivity needed here.

import { ExternalLink } from "lucide-react";
import type { ExamStatus } from "@/app/action/examActions";

interface Props {
  examName: string;
  docCount: number;
  examStatus: ExamStatus | null;
  notificationUrl: string;
  applyLink: string;
}

export default function ExamHeader({
  examName,
  docCount,
  examStatus,
  notificationUrl,
  applyLink,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <svg
            className="w-4 h-4 text-blue-500 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2
            className="text-sm font-bold text-gray-800 truncate"
            title={examName}
          >
            {examName}
          </h2>
        </div>

        {examStatus && (
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${examStatus.type === "ACTIVE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              {examStatus.label}
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {examStatus.daysLeft === 0
                ? "Last Day"
                : `${examStatus.daysLeft}d ${examStatus.type === "ACTIVE" ? "left" : "to go"}`}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-bold rounded-full">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
          {docCount} Doc{docCount !== 1 ? "s" : ""}
        </span>

        <div className="flex gap-2 ml-auto">
          {applyLink && (
            <a
              href={applyLink}
              rel="noopener noreferrer"
              target="_blank"
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold rounded-lg transition-colors "
              style={{ color: "white" }}
            >
              Apply <ExternalLink size={11} />
            </a>
          )}
          {notificationUrl && (
            <a
              href={notificationUrl}
              rel="noopener noreferrer"
              target="_blank"
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-xs font-bold rounded-lg transition-colors"
              style={{ color: "white" }}
            >
              Notice <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
