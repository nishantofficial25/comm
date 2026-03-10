"use client";

import { useState } from "react";

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="bg-white border border-green-200 rounded-2xl px-6">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className={i < faqs.length - 1 ? "border-b border-green-50" : ""}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full bg-transparent border-none cursor-pointer text-left py-5 flex items-start justify-between gap-4 text-base font-semibold text-gray-900 hover:text-green-700 transition-colors"
          >
            <span>{faq.q}</span>
            <span
              className="text-xl shrink-0 transition-transform duration-200"
              style={{
                transform: open === i ? "rotate(180deg)" : "none",
                lineHeight: 1.4,
              }}
            >
              ⌄
            </span>
          </button>
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: open === i ? 300 : 0 }}
          >
            <p className="text-[15px] leading-relaxed text-gray-500 pb-5">
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
