"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { EnrichedExam, StatusFilter, ExamStats } from "@/types/exam";
import { toSlug, STATUS_PRIORITY, ITEMS_PER_PAGE } from "@/lib/exam-utils";
import ExamSearch from "./ExamSearch";
import ExamStatusFilters from "./ExamStatusFilters";
import ExamCard from "./ExamCard";
import RequestExamModal from "./RequestExamModal";

interface Props {
  initialExams: EnrichedExam[];
}

export default function ExamGrid({ initialExams }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const examGridRef = useRef<HTMLDivElement>(null);

  // Reset visible count on filter/search change
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q);
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const handleFilterChange = useCallback((f: StatusFilter) => {
    setStatusFilter(f);
    setVisibleCount(ITEMS_PER_PAGE);
  }, []);

  const { orderedExams, stats } = useMemo<{
    orderedExams: EnrichedExam[];
    stats: ExamStats;
  }>(() => {
    const filtered = initialExams.filter((e) =>
      e.exam.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const statusFiltered = filtered.filter((e) => {
      if (statusFilter === "ALL") return true;
      return e.status === statusFilter;
    });

    // Already sorted from server — just apply client-side filter
    return {
      orderedExams: statusFiltered,
      stats: {
        total: statusFiltered.length,
        totalAll: filtered.length,
        active: filtered.filter((e) => e.status === "ACTIVE").length,
        upcoming: filtered.filter((e) => e.status === "UPCOMING").length,
        rest: filtered.filter((e) => e.status === "REST").length,
      },
    };
  }, [initialExams, searchQuery, statusFilter]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setVisibleCount((prev) =>
          Math.min(prev + ITEMS_PER_PAGE, orderedExams.length),
        );
      }
    },
    [orderedExams.length],
  );

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const visibleExams = isMobile
    ? orderedExams.slice(0, visibleCount)
    : orderedExams;

  return (
    <div
      ref={examGridRef}
      className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      {/* Sticky header */}
      <div className="sticky top-0 bg-white z-20 border-b border-gray-100">
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg md:text-xl font-bold text-gray-800">
              Select Exam
            </h1>
            <span className="px-3 py-1 bg-green-500 text-white text-sm font-semibold rounded-full">
              {stats.total} exams
            </span>
          </div>

          <ExamStatusFilters
            stats={stats}
            statusFilter={statusFilter}
            onFilterChange={handleFilterChange}
            onRequestClick={() => setRequestModalOpen(true)}
          />

          <ExamSearch
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            examGridRef={examGridRef}
          />

          {searchQuery && (
            <div className="flex gap-2 text-xs text-gray-600 bg-green-50 rounded-lg p-2.5 border border-green-100">
              <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>
                Found:{" "}
                <strong className="text-green-700">{stats.active}</strong>{" "}
                active,{" "}
                <strong className="text-yellow-600">{stats.upcoming}</strong>{" "}
                upcoming,{" "}
                <strong className="text-gray-500">{stats.rest}</strong> others
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable grid */}
      <div
        className="p-3 md:p-4 custom-scrollbar exam-grid-container"
        onScroll={handleScroll}
      >
        {visibleExams.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {/* Custom exam always first */}
            <ExamCard
              exam={{
                exam: "Custom",
                status: "REST",
                lastDate: null,
                hasDates: false,
                hasConditions: true,
              }}
              isCustom
            />

            {visibleExams.map((examData) => (
              <ExamCard key={examData.exam} exam={examData} />
            ))}
          </div>
        ) : (
          <EmptyState searchQuery={searchQuery} />
        )}

        <div className="text-center pt-3 text-sm text-gray-600">
          <span>Didn't find your Exam? </span>
          <button
            onClick={() => setRequestModalOpen(true)}
            className="text-green-600 hover:text-green-700 font-semibold underline hover:no-underline transition-all cursor-pointer"
          >
            Request one
          </button>
        </div>
      </div>

      <RequestExamModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #10b981; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .exam-grid-container { max-height: calc(100dvh - 180px); overflow-y: auto; }
        @media (max-width: 768px) { .exam-grid-container { max-height: calc(100dvh - 240px); } }
      `}</style>
    </div>
  );
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  const { Search } = require("lucide-react");
  return (
    <div className="text-center py-12 space-y-3">
      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
        <Search className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-gray-500 font-medium">
        No exams found matching "{searchQuery}"
      </p>
      <p className="text-sm text-gray-400">Try different keywords or filters</p>
    </div>
  );
}
