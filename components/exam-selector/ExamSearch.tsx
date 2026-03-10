"use client";

import { useRef, RefObject } from "react";
import { Search } from "lucide-react";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  examGridRef: RefObject<HTMLDivElement | null>;
}

export default function ExamSearch({
  searchQuery,
  onSearchChange,
  examGridRef,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile || !examGridRef.current) return;
    setTimeout(() => {
      examGridRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      examGridRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 350);
  };

  return (
    <div className="relative group">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-500 transition-colors"
        size={20}
      />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search exams..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={handleFocus}
        className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition-all duration-300"
      />
    </div>
  );
}
