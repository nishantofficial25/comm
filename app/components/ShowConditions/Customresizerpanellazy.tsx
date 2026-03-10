// components/CustomResizerPanelLazy.tsx
// Thin client wrapper so we can use ssr:false (not allowed in Server Components).
"use client";

import dynamic from "next/dynamic";

const CustomResizerPanel = dynamic(() => import("@/components/Customresizerpanel"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 border-4 border-green-100 rounded-full" />
        <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin" />
      </div>
    </div>
  ),
});

export default function CustomResizerPanelLazy() {
  return <CustomResizerPanel />;
}
