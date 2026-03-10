// components/PdfPageReorder.tsx
"use client";

import { useRef, useState } from "react";
import { FileText, GripVertical, X } from "lucide-react";
import type { PdfPage } from "@/lib/types";

interface Props {
  pages: PdfPage[];
  onReorder: (pages: PdfPage[]) => void;
  onRemove: (idx: number) => void;
}

export default function PdfPageReorder({ pages, onReorder, onRemove }: Props) {
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const touchGhost = useRef<HTMLElement | null>(null);

  const commitReorder = () => {
    if (
      dragIdx.current !== null &&
      dragOverIdx.current !== null &&
      dragIdx.current !== dragOverIdx.current
    ) {
      const arr = [...pages];
      const [m] = arr.splice(dragIdx.current, 1);
      arr.splice(dragOverIdx.current, 0, m);
      onReorder(arr);
    }
    dragIdx.current = null;
    dragOverIdx.current = null;
  };

  const onDragStart = (e: React.DragEvent, i: number) => {
    dragIdx.current = i;
    setDraggingIdx(i);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  };

  const onDragEnter = (i: number) => {
    dragOverIdx.current = i;
    setOverIdx(i);
  };

  const onDragEnd = () => {
    commitReorder();
    setDraggingIdx(null);
    setOverIdx(null);
  };

  const onTouchStart = (e: React.TouchEvent, i: number) => {
    dragIdx.current = i;
    setDraggingIdx(i);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ghost = (e.currentTarget as HTMLElement).cloneNode(
      true,
    ) as HTMLElement;
    Object.assign(ghost.style, {
      position: "fixed",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      opacity: "0.85",
      pointerEvents: "none",
      zIndex: "99999",
      borderRadius: "8px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      margin: "0",
    });
    document.body.appendChild(ghost);
    touchGhost.current = ghost;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragIdx.current === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (touchGhost.current) {
      touchGhost.current.style.top = `${touch.clientY - 20}px`;
      touchGhost.current.style.left = `${touch.clientX - 20}px`;
    }
    if (!listRef.current) return;
    for (const row of listRef.current.querySelectorAll<HTMLElement>(
      "[data-row-idx]",
    )) {
      const r = row.getBoundingClientRect();
      if (
        touch.clientX >= r.left &&
        touch.clientX <= r.right &&
        touch.clientY >= r.top &&
        touch.clientY <= r.bottom
      ) {
        const idx = Number(row.dataset.rowIdx);
        dragOverIdx.current = idx;
        setOverIdx(idx);
        break;
      }
    }
  };

  const onTouchEnd = () => {
    if (touchGhost.current) {
      document.body.removeChild(touchGhost.current);
      touchGhost.current = null;
    }
    commitReorder();
    setDraggingIdx(null);
    setOverIdx(null);
  };

  return (
    <div ref={listRef} className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
      {pages.map((page, idx) => (
        <div
          key={page.id}
          data-row-idx={idx}
          draggable
          onDragStart={(e) => onDragStart(e, idx)}
          onDragEnter={() => onDragEnter(idx)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 select-none border transition-all duration-150 ${
            draggingIdx === idx
              ? "opacity-40 bg-gray-100 border-gray-300"
              : overIdx === idx && draggingIdx !== idx
                ? "bg-green-50 border-green-400 shadow-sm"
                : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white"
          }`}
          style={{ userSelect: "none" }}
        >
          <div
            onTouchStart={(e) => onTouchStart(e, idx)}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              touchAction: "none",
              cursor: "grab",
              flexShrink: 0,
              padding: "2px",
              margin: "-2px",
            }}
          >
            <GripVertical size={13} className="text-gray-300" />
          </div>

          {page.previewUrl ? (
            <img
              src={page.previewUrl}
              alt={`page ${idx + 1}`}
              className="w-8 h-8 object-cover rounded border border-gray-200 shrink-0"
              style={{ pointerEvents: "none" }}
            />
          ) : (
            <div className="w-8 h-8 bg-red-50 border border-red-200 rounded flex items-center justify-center shrink-0">
              <FileText size={14} className="text-red-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-700 truncate leading-tight">
              {page.name}
            </p>
            <p className="text-[9px] text-gray-400 leading-tight">
              Page {idx + 1}
            </p>
          </div>

          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(idx);
            }}
            className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}
