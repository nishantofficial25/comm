"use client";

import { StatusFilter, ExamStats } from "@/types/exam";

interface Props {
  stats: ExamStats;
  statusFilter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  onRequestClick: () => void;
}

export default function ExamStatusFilters({
  stats,
  statusFilter,
  onFilterChange,
  onRequestClick,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
        <FilterButton
          label={`All (${stats.totalAll})`}
          active={statusFilter === "ALL"}
          activeClass="bg-green-500 text-white shadow-md"
          onClick={() => onFilterChange("ALL")}
        />
        <FilterButton
          label={`Forms Out (${stats.active})`}
          active={statusFilter === "ACTIVE"}
          activeClass="bg-red-500 text-white shadow-md"
          onClick={() => onFilterChange("ACTIVE")}
          dot="bg-red-500"
        />
        <FilterButton
          label={`Upcoming (${stats.upcoming})`}
          active={statusFilter === "UPCOMING"}
          activeClass="bg-yellow-500 text-white shadow-md"
          onClick={() => onFilterChange("UPCOMING")}
          dot="bg-yellow-400"
        />
      </div>
      <button
        onClick={onRequestClick}
        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-full transition-colors active:scale-95 shadow-md hover:shadow-lg whitespace-nowrap flex-shrink-0"
      >
        + Request
      </button>
    </div>
  );
}

function FilterButton({
  label,
  active,
  activeClass,
  onClick,
  dot,
}: {
  label: string;
  active: boolean;
  activeClass: string;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
        active
          ? activeClass
          : "bg-gray-100 text-gray-700 hover :bg-gray-200 cursor-pointer"
      }`}
    >
      {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
      {label}
    </button>
  );
}
