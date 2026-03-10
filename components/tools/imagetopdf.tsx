// components/ImageToPdfTool.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Download,
  Loader,
  X,
  Images,
  FileText,
  GripVertical,
} from "lucide-react";
import { combineImagesToPdf } from "@/lib/imageProcessor";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { formatFileSize } from "@/app/action/fileformat";

const revokeUrl = (u?: string | null) => u && URL.revokeObjectURL(u);

interface PdfPage {
  id: number;
  name: string;
  file: File;
  previewUrl: string | null;
}
interface Result {
  file: File;
  inRange: boolean;
  sizeKB: string;
}

const Bar = ({ pct, msg }: { pct: number; msg: string }) => (
  <div className="mb-3.5">
    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
      <span className="truncate pr-2">{msg || "Processing…"}</span>
      <span className="font-extrabold text-violet-600 shrink-0">{pct}%</span>
    </div>
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg,#6d28d9,#8b5cf6)",
        }}
      />
    </div>
  </div>
);

/* ── Draggable thumbnail grid ─────────────────────────────────────────────── */
function PageGrid({
  pages,
  onReorder,
  onRemove,
}: {
  pages: PdfPage[];
  onReorder: (p: PdfPage[]) => void;
  onRemove: (i: number) => void;
}) {
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const touchGhost = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const commitReorder = () => {
    if (
      dragIdx.current !== null &&
      dragOverIdx.current !== null &&
      dragIdx.current !== dragOverIdx.current
    ) {
      const arr = [...pages];
      const [moved] = arr.splice(dragIdx.current, 1);
      arr.splice(dragOverIdx.current, 0, moved);
      onReorder(arr);
    }
    dragIdx.current = null;
    dragOverIdx.current = null;
  };

  const onDragStart = (e: React.DragEvent, i: number) => {
    dragIdx.current = i;
    setDragging(i);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(i));
  };
  const onDragEnter = (i: number) => {
    dragOverIdx.current = i;
    setOver(i);
  };
  const onDragEnd = () => {
    commitReorder();
    setDragging(null);
    setOver(null);
  };

  const onTouchStart = (e: React.TouchEvent, i: number) => {
    dragIdx.current = i;
    setDragging(i);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ghost = (e.currentTarget as HTMLElement).cloneNode(
      true,
    ) as HTMLElement;
    ghost.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;opacity:0.85;pointer-events:none;z-index:99999;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.2);`;
    document.body.appendChild(ghost);
    touchGhost.current = ghost;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragIdx.current === null) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (touchGhost.current) {
      touchGhost.current.style.top = `${touch.clientY - 40}px`;
      touchGhost.current.style.left = `${touch.clientX - 39}px`;
    }
    if (!gridRef.current) return;
    for (const item of gridRef.current.querySelectorAll<HTMLElement>(
      "[data-card-idx]",
    )) {
      const r = item.getBoundingClientRect();
      if (
        touch.clientX >= r.left &&
        touch.clientX <= r.right &&
        touch.clientY >= r.top &&
        touch.clientY <= r.bottom
      ) {
        const idx = Number(item.dataset.cardIdx);
        dragOverIdx.current = idx;
        setOver(idx);
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
    setDragging(null);
    setOver(null);
  };

  return (
    <div ref={gridRef} className="flex flex-wrap gap-2.5">
      {pages.map((p, i) => (
        <div
          key={p.id}
          data-card-idx={i}
          draggable
          onDragStart={(e) => onDragStart(e, i)}
          onDragEnter={() => onDragEnter(i)}
          onDragEnd={onDragEnd}
          onDragOver={(e) => e.preventDefault()}
          onTouchStart={(e) => onTouchStart(e, i)}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="rounded-xl overflow-hidden cursor-grab select-none transition-all duration-150"
          style={{
            width: 78,
            flexShrink: 0,
            background: "#fafafa",
            border: `2px solid ${over === i && dragging !== i ? "#8b5cf6" : dragging === i ? "#ede9fe" : "#e2e8f0"}`,
            opacity: dragging === i ? 0.35 : 1,
            boxShadow:
              over === i && dragging !== i ? "0 0 0 2px #8b5cf640" : "none",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {p.previewUrl ? (
            <img
              src={p.previewUrl}
              alt={`p${i + 1}`}
              className="w-full block pointer-events-none"
              style={{ height: 60, objectFit: "cover" }}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center bg-gray-100"
              style={{ height: 60 }}
            >
              <FileText size={18} color="#8b5cf6" />
            </div>
          )}
          <div className="px-1.5 py-1 flex items-center justify-between bg-white">
            <div className="flex items-center gap-0.5">
              <GripVertical size={10} color="#94a3b8" />
              <span className="text-[9px] text-violet-600 font-bold">
                p.{i + 1}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(i);
              }}
              className="bg-transparent border-0 cursor-pointer text-gray-400 hover:text-red-500 transition-colors p-0 flex"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main tool ───────────────────────────────────────────────────────────── */
export default function ImageToPdfTool() {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [outputName, setOutputName] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [prog, setProg] = useState({ pct: 0, msg: "" });
  const [drag, setDrag] = useState(false);
  const mainRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const isCardDragging = useRef(false);

  const addFiles = useCallback((files: File[]) => {
    const newPages = files
      .filter(
        (f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name),
      )
      .map((f, i) => ({
        id: Date.now() + i,
        name: f.name,
        file: f,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      }));
    if (!newPages.length)
      return void toast.error("Please add image files only.", {
        position: "top-center",
      });
    setPages((p) => [...p, ...newPages]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (isCardDragging.current) return;
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) addFiles(files);
    },
    [addFiles],
  );

  const removeAt = useCallback(
    (idx: number) =>
      setPages((p) => {
        const c = [...p];
        revokeUrl(c[idx]?.previewUrl);
        c.splice(idx, 1);
        return c;
      }),
    [],
  );

  const clearAll = useCallback(
    () =>
      setPages((p) => {
        p.forEach((pg) => revokeUrl(pg.previewUrl));
        return [];
      }),
    [],
  );

  const handleBuild = useCallback(async () => {
    if (!pages.length)
      return void toast.error("Add at least one image.", {
        position: "top-center",
      });
    const hasLimits = !!(minSize && maxSize);
    setStatus("processing");
    setProg({ pct: 0, msg: "Sending to server…" });
    setResult(null);
    try {
      let res = await combineImagesToPdf({
        files: pages.map((p) => p.file),
        minSizeMB: hasLimits ? Number(minSize) / 1000 : 0,
        maxSizeMB: hasLimits ? Number(maxSize) / 1000 : 500,
        outputFileName: outputName || null,
        onProgress: (pct, msg) => setProg({ pct, msg }),
      });
      if (!hasLimits) res = { ...res, inRange: true };
      if (hasLimits && !res.inRange)
        toast.error(
          `Got ${(res.file.size / 1000).toFixed(1)} KB — required ${minSize}–${maxSize} KB`,
          { position: "top-center", autoClose: 7000 },
        );
      setResult({
        file: res.file,
        inRange: hasLimits ? res.inRange : true,
        sizeKB: (res.file.size / 1000).toFixed(1),
      });
      setStatus("done");
      setProg({ pct: 100, msg: "Complete!" });
    } catch (err: any) {
      toast.error(err.message || "Failed to build PDF.", {
        position: "top-center",
      });
      setStatus("idle");
      setProg({ pct: 0, msg: "" });
    }
  }, [pages, minSize, maxSize, outputName]);

  const reset = useCallback(() => {
    clearAll();
    setMinSize("");
    setMaxSize("");
    setOutputName("");
    setStatus("idle");
    setProg({ pct: 0, msg: "" });
    setResult(null);
  }, [clearAll]);

  const busy = status === "processing";
  const hasPages = pages.length > 0;

  return (
    <div className="space-y-3.5 pb-7">
      {/* Step 1 — Upload */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">
          Step 1 — Add Images
        </p>
        <div
          onClick={!hasPages ? () => mainRef.current?.click() : undefined}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer.types.includes("Files")) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          className="rounded-xl transition-all duration-200"
          style={{
            border: `2px dashed ${drag || hasPages ? "#8b5cf6" : "#e2e8f0"}`,
            padding: hasPages ? "20px" : "44px 24px",
            textAlign: "center",
            cursor: hasPages ? "default" : "pointer",
            background: hasPages ? "#faf5ff" : drag ? "#faf5ff" : "#fafafa",
          }}
        >
          {hasPages ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="m-0 text-[11px] font-extrabold text-violet-600 uppercase tracking-widest">
                  {pages.length} image{pages.length !== 1 ? "s" : ""} — drag to
                  reorder
                </p>
                <button
                  onClick={clearAll}
                  className="bg-transparent border-0 cursor-pointer text-xs text-gray-400 hover:text-red-500 font-bold transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div
                onDragStart={() => {
                  isCardDragging.current = true;
                }}
                onDragEnd={() => {
                  isCardDragging.current = false;
                }}
              >
                <PageGrid
                  pages={pages}
                  onReorder={setPages}
                  onRemove={removeAt}
                />
              </div>
              <button
                onClick={() => addRef.current?.click()}
                className="w-full mt-3 py-2 border border-dashed border-gray-300 rounded-xl bg-transparent cursor-pointer text-violet-600 font-bold text-[13px] flex items-center justify-center gap-1.5 hover:border-violet-400 transition-colors"
              >
                <Upload size={13} /> Add more images
              </button>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
                <Upload size={24} color="#7c3aed" />
              </div>
              <p className="font-bold text-sm text-gray-600 m-0 mb-1">
                Click or Drag &amp; Drop Images
              </p>
              <p className="text-xs text-gray-400 m-0">
                JPG · PNG · HEIC · Multiple files supported
              </p>
            </>
          )}
        </div>
        <input
          ref={mainRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            const f = Array.from(e.target.files || []);
            e.target.value = "";
            if (f.length) addFiles(f);
          }}
        />
        <input
          ref={addRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={(e) => {
            const f = Array.from(e.target.files || []);
            e.target.value = "";
            if (f.length) addFiles(f);
          }}
        />
      </div>

      {/* Step 2 — Settings */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">
          Step 2 — Output Settings{" "}
          <span className="font-medium normal-case text-gray-300">
            (all optional)
          </span>
        </p>
        <div className="flex gap-3 flex-wrap items-end mb-4">
          <div className="flex-1 min-w-[100px]">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Min Size (KB)
            </label>
            <input
              type="number"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 transition-colors"
            />
          </div>
          <span className="text-gray-300 font-bold pb-2.5">–</span>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Max Size (KB)
            </label>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
            Output Filename
          </label>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            placeholder="my-document"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 transition-colors"
          />
        </div>
      </div>

      {busy && prog.pct > 0 && <Bar pct={prog.pct} msg={prog.msg} />}

      <div className="flex gap-3">
        <button
          onClick={handleBuild}
          disabled={busy || !hasPages}
          className="flex-1 py-3.5 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-sm transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#6d28d9,#8b5cf6)" }}
        >
          {busy ? (
            <>
              <Loader size={16} className="animate-spin" /> Building PDF…
            </>
          ) : (
            <>
              <Images size={15} /> Make PDF ({pages.length} image
              {pages.length !== 1 ? "s" : ""})
            </>
          )}
        </button>
        <button
          onClick={reset}
          disabled={busy}
          className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm border border-gray-200 disabled:opacity-50 transition-colors"
        >
          Reset
        </button>
      </div>

      {result && (
        <div
          className={`rounded-2xl border-2 p-5 ${result.inRange ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
        >
          <div className="flex gap-3.5 items-center mb-3.5">
            <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={20} color="#7c3aed" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 m-0 mb-1 truncate">
                {result.file.name}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold text-white ${result.inRange ? "bg-green-600" : "bg-red-600"}`}
                >
                  {result.inRange ? "✓" : "✗"}{" "}
                  {formatFileSize(Number(result.sizeKB))}
                </span>
                {minSize && maxSize && !result.inRange && (
                  <span className="text-xs text-red-600">
                    Required: {minSize}–{maxSize} KB
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => saveAs(result.file, result.file.name)}
            className="w-full py-3 text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{
              background: result.inRange
                ? "linear-gradient(135deg,#0369a1,#0ea5e9)"
                : "linear-gradient(135deg,#991b1b,#dc2626)",
            }}
          >
            <Download size={16} />{" "}
            {result.inRange ? "Download PDF" : "Download Anyway"}
          </button>
        </div>
      )}
    </div>
  );
}
