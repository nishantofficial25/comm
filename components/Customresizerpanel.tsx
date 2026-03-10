// components/CustomResizerPanel.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import {
  Download,
  FileText,
  GripVertical,
  ImageIcon,
  Images,
  Loader,
  Upload,
  X,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { compressImage, combineImagesToPdf } from "@/lib/imageProcessor";
import { revokeUrl } from "@/lib/utils";
import type { PdfPage } from "@/lib/types";
import { formatFileSize } from "@/app/action/fileformat";

/* ── Constants ───────────────────────────────────────────── */
const CM_TO_PX = 300 / 2.54;
const cmToPx = (value: string): number =>
  Math.round(parseFloat(value) * CM_TO_PX);

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1000 * 1000;

/* ── Progress Bar ────────────────────────────────────────── */
const ProgressBar = ({
  percent,
  message,
}: {
  percent: number;
  message: string;
}) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs text-gray-500 mb-1">
      <span className="truncate pr-2">{message || "Processing…"}</span>
      <span className="font-bold text-green-600 shrink-0">{percent}%</span>
    </div>
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500 transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);

/* ── PDF Page Reorder Strip ──────────────────────────────── */
const PdfPageReorder = ({
  pages,
  onReorder,
  onRemove,
}: {
  pages: PdfPage[];
  onReorder: (p: PdfPage[]) => void;
  onRemove: (i: number) => void;
}) => {
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnter = (idx: number) => {
    dragOverIdx.current = idx;
    setOverIdx(idx);
  };
  const handleDragEnd = () => {
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
    setDraggingIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
      {pages.map((page, idx) => (
        <div
          key={page.id}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragEnter={() => handleDragEnter(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-grab active:cursor-grabbing select-none border transition-all duration-150 ${
            draggingIdx === idx
              ? "opacity-40 bg-gray-100 border-gray-300"
              : overIdx === idx && draggingIdx !== idx
                ? "bg-green-50 border-green-400 shadow-sm"
                : "bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white"
          }`}
        >
          <GripVertical size={13} className="text-gray-300 shrink-0" />
          {page.previewUrl ? (
            <img
              src={page.previewUrl}
              alt={`page ${idx + 1}`}
              className="w-8 h-8 object-cover rounded border border-gray-200 shrink-0"
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
            onClick={() => onRemove(idx)}
            className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  IMAGE RESIZER TAB                                         */
/* ═══════════════════════════════════════════════════════════ */
interface ImageResult {
  file: File;
  inRange: boolean;
  sizeKB: string;
  previewUrl: string | null;
}

const ImageResizerTab = () => {
  const [file, setFile] = useState<File | null>(null);
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [dimensionUnit, setDimensionUnit] = useState<"cm" | "px">("cm");
  const [outputName, setOutputName] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [result, setResult] = useState<ImageResult | null>(null);
  const [progress, setProgress] = useState({ percent: 0, message: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = useCallback((f: File) => {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large (max ${MAX_FILE_SIZE_MB} MB)`, {
        position: "top-center",
      });
      return;
    }
    setFile(f);
    setResult((prev) => {
      revokeUrl(prev?.previewUrl);
      return null;
    });
    setProgress({ percent: 0, message: "" });
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) acceptFile(f);
      e.target.value = "";
    },
    [acceptFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile],
  );

  const handleResize = useCallback(async () => {
    if (!file)
      return toast.error("Please select a file first.", {
        position: "top-center",
      });
    if (!minSize || !maxSize)
      return toast.error("Min and Max size are required.", {
        position: "top-center",
      });

    setStatus("processing");
    setProgress({ percent: 0, message: "Starting…" });
    setResult(null);

    try {
      const widthPx = width
        ? dimensionUnit === "cm"
          ? cmToPx(width + "cm")
          : Number(width)
        : null;
      const heightPx = height
        ? dimensionUnit === "cm"
          ? cmToPx(height + "cm")
          : Number(height)
        : null;

      const res = await compressImage({
        file,
        minSizeMB: Number(minSize) / 1000,
        maxSizeMB: Number(maxSize) / 1000,
        widthPx,
        heightPx,
        outputType: "image",
        outputFileName: outputName || file.name.split(".")[0],
        onProgress: (percent, message) => setProgress({ percent, message }),
      });

      if (!res.inRange) {
        toast.error(
          `Got ${(res.file.size / 1000).toFixed(1)} KB — required ${minSize}–${maxSize} KB`,
          { position: "top-center", autoClose: 7000 },
        );
      }

      const previewUrl = res.file.type.startsWith("image/")
        ? URL.createObjectURL(res.file)
        : null;
      setResult({
        file: res.file,
        inRange: res.inRange,
        sizeKB: (res.file.size / 1000).toFixed(1),
        previewUrl,
      });
      setStatus("done");
      setProgress({ percent: 100, message: "Complete!" });
    } catch (err: any) {
      toast.error(err.message || "Failed to process file.", {
        position: "top-center",
      });
      setStatus("idle");
      setProgress({ percent: 0, message: "" });
    }
  }, [file, minSize, maxSize, width, height, dimensionUnit, outputName]);

  const reset = useCallback(() => {
    setFile(null);
    setResult((prev) => {
      revokeUrl(prev?.previewUrl);
      return null;
    });
    setMinSize("");
    setMaxSize("");
    setWidth("");
    setHeight("");
    setOutputName("");
    setStatus("idle");
    setProgress({ percent: 0, message: "" });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const isProcessing = status === "processing";

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Settings
        </p>
        <div className="flex flex-wrap gap-3 mb-3 items-end">
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Min Size (KB) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              placeholder="e.g. 10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <span className="text-gray-400 font-bold pb-2">–</span>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Max Size (KB) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mb-3 items-end">
          <div className="flex-1 min-w-[90px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Width (optional)
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="e.g. 3.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <span className="text-gray-400 font-bold pb-2">×</span>
          <div className="flex-1 min-w-[90px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Height (optional)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 4.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <div className="w-20">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Unit
            </label>
            <select
              value={dimensionUnit}
              onChange={(e) => setDimensionUnit(e.target.value as "cm" | "px")}
              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white"
            >
              <option value="cm">cm</option>
              <option value="px">px</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Output Name (optional)
          </label>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            placeholder="Custom filename"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-green-400 bg-green-50"
            : file
              ? "border-green-500 bg-green-50"
              : "border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/40"
        }`}
      >
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm truncate max-w-[220px]">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(Number((file.size / 1000)))}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="font-semibold text-gray-700 text-sm">
              Select or Drag &amp; Drop Image
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPG, PNG, HEIC · Max {MAX_FILE_SIZE_MB} MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {isProcessing && progress.percent > 0 && (
        <ProgressBar percent={progress.percent} message={progress.message} />
      )}

      <div className="flex gap-3">
        <button
          onClick={handleResize}
          disabled={isProcessing}
          className="cursor-pointer flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow"
        >
          {isProcessing ? (
            <>
              <Loader size={16} className="animate-spin" /> Processing…
            </>
          ) : (
            <>
              <Upload size={16} /> Resize Image
            </>
          )}
        </button>
        <button
          onClick={reset}
          disabled={isProcessing}
          className="cursor-pointer px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      {result && (
        <div
          className={`rounded-xl border-2 p-4 ${result.inRange ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
        >
          <div className="flex items-start gap-3">
            {result.previewUrl && (
              <img
                src={result.previewUrl}
                alt="Preview"
                loading="lazy"
                decoding="async"
                className="w-20 h-20 object-cover rounded-lg border-2 border-white shadow-sm shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">
                {result.file.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{result.file.type}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${result.inRange ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                >
                  {result.inRange ? "✓" : "✗"} {formatFileSize(Number(result.sizeKB))}
                </span>
                {!result.inRange && (
                  <span className="text-xs text-red-600">
                    Required: {minSize}–{maxSize} KB
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => saveAs(result.file, result.file.name)}
            className={`w-full mt-3 py-2.5 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm transition-colors ${result.inRange ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600"}`}
          >
            <Download size={16} />
            {result.inRange ? "Download File" : "Download Anyway"}
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  PDF BUILDER TAB                                           */
/* ═══════════════════════════════════════════════════════════ */
interface PdfResult {
  file: File;
  inRange: boolean;
  sizeKB: string;
}

const PdfBuilderTab = () => {
  const [pdfMode, setPdfMode] = useState<"choose" | "pdf" | "images">("choose");
  const [pdfPages, setPdfPages] = useState<PdfPage[]>([]);
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [outputName, setOutputName] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [result, setResult] = useState<PdfResult | null>(null);
  const [progress, setProgress] = useState({ percent: 0, message: "" });
  const pdfFileRef = useRef<HTMLInputElement>(null);
  const imgFileRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handlePdfFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      e.target.value = "";
      setPdfPages([
        { id: Date.now(), name: f.name, file: f, previewUrl: null },
      ]);
      setPdfMode("pdf");
    },
    [],
  );

  const handleImgFilesPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      e.target.value = "";
      const pages = files.map((f, i) => ({
        id: Date.now() + i,
        name: f.name,
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));
      setPdfPages((prev) => [...prev, ...pages]);
      setPdfMode("images");
    },
    [],
  );

  const handleAddMore = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      e.target.value = "";
      const pages = files.map((f, i) => ({
        id: Date.now() + i,
        name: f.name,
        file: f,
        previewUrl: URL.createObjectURL(f),
      }));
      setPdfPages((prev) => [...prev, ...pages]);
    },
    [],
  );

  const removePdfPage = useCallback((idx: number) => {
    setPdfPages((prev) => {
      const copy = [...prev];
      revokeUrl(copy[idx]?.previewUrl);
      copy.splice(idx, 1);
      if (copy.length === 0) setPdfMode("choose");
      return copy;
    });
  }, []);

  const resetPdfState = useCallback(() => {
    setPdfPages((prev) => {
      prev.forEach((p) => revokeUrl(p.previewUrl));
      return [];
    });
    setPdfMode("choose");
  }, []);

  const hasLimits = !!(minSize && maxSize);

  const handleBuild = useCallback(async () => {
    if (pdfPages.length === 0)
      return toast.error("Please add at least one file.", {
        position: "top-center",
      });
    setStatus("processing");
    setProgress({ percent: 0, message: "Starting…" });
    setResult(null);

    try {
      let res: { file: File; inRange: boolean };

      if (pdfMode === "pdf" && pdfPages.length === 1) {
        if (hasLimits) {
          res = await compressImage({
            file: pdfPages[0].file,
            minSizeMB: Number(minSize) / 1000,
            maxSizeMB: Number(maxSize) / 1000,
            outputType: "pdf",
            outputFileName: outputName || null,
            onProgress: (p, m) => setProgress({ percent: p, message: m }),
          });
        } else {
          const f = pdfPages[0].file;
          const baseName = outputName
            ? outputName.replace(/\.pdf$/i, "") + ".pdf"
            : f.name.endsWith(".pdf")
              ? f.name
              : f.name + ".pdf";
          res = {
            file: new File([f], baseName, { type: "application/pdf" }),
            inRange: true,
          };
          setProgress({ percent: 100, message: "Complete!" });
        }
      } else {
        const combined = await combineImagesToPdf({
          files: pdfPages.map((p) => p.file),
          minSizeMB: hasLimits ? Number(minSize) / 1000 : 0,
          maxSizeMB: hasLimits ? Number(maxSize) / 1000 : 500,
          outputFileName: outputName || null,
          onProgress: (p, m) => setProgress({ percent: p, message: m }),
        });
        res = hasLimits ? combined : { ...combined, inRange: true };
      }

      if (hasLimits && !res.inRange) {
        toast.error(
          `Got ${(res.file.size / 1000).toFixed(1)} KB — required ${minSize}–${maxSize} KB`,
          { position: "top-center", autoClose: 7000 },
        );
      }

      setResult({
        file: res.file,
        inRange: hasLimits ? res.inRange : true,
        sizeKB: (res.file.size / 1000).toFixed(1),
      });
      setStatus("done");
      setProgress({ percent: 100, message: "Complete!" });
    } catch (err: any) {
      toast.error(err.message || "Failed to build PDF.", {
        position: "top-center",
      });
      setStatus("idle");
      setProgress({ percent: 0, message: "" });
    }
  }, [pdfPages, pdfMode, minSize, maxSize, outputName, hasLimits]);

  const reset = useCallback(() => {
    resetPdfState();
    setMinSize("");
    setMaxSize("");
    setOutputName("");
    setStatus("idle");
    setProgress({ percent: 0, message: "" });
    setResult(null);
  }, [resetPdfState]);

  const isProcessing = status === "processing";

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Settings
        </p>
        <div className="flex flex-wrap gap-3 mb-3 items-end">
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Min Size (KB){" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <span className="text-gray-400 font-bold pb-2">–</span>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Max Size (KB){" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Output Name (optional)
          </label>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            placeholder="Custom filename"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* File Chooser */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Add Files
        </p>

        {pdfMode === "choose" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => pdfFileRef.current?.click()}
              className="flex flex-col items-center gap-1.5 py-4 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-300 text-orange-700 rounded-lg transition-colors"
            >
              <FileText size={20} />
              <span className="text-[14px] font-bold leading-tight text-center">
                Upload PDF
              </span>
              <span className="text-[12px] text-orange-500 text-center leading-tight">
                Compress existing PDF
              </span>
            </button>
            <button
              onClick={() => imgFileRef.current?.click()}
              className="flex flex-col items-center gap-1.5 py-4 px-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 hover:border-purple-300 text-purple-700 rounded-lg transition-colors"
            >
              <Images size={20} />
              <span className="text-[14px] font-bold leading-tight text-center">
                Images → PDF
              </span>
              <span className="text-[12px] text-purple-500 text-center leading-tight">
                Combine images into PDF
              </span>
            </button>
          </div>
        )}

        {pdfPages.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {pdfMode === "pdf"
                  ? "Selected PDF"
                  : `${pdfPages.length} image${pdfPages.length !== 1 ? "s" : ""} — drag to reorder`}
              </p>
              <button
                onClick={resetPdfState}
                className="text-[10px] text-red-400 hover:text-red-600 font-semibold transition-colors"
              >
                Clear
              </button>
            </div>
            <PdfPageReorder
              pages={pdfPages}
              onReorder={setPdfPages}
              onRemove={removePdfPage}
            />
            {pdfMode === "images" && (
              <button
                onClick={() => addMoreRef.current?.click()}
                className="w-full py-1.5 border border-dashed border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload size={11} /> Add more images
              </button>
            )}
          </>
        )}

        <input
          ref={pdfFileRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={handlePdfFilePick}
        />
        <input
          ref={imgFileRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={handleImgFilesPick}
        />
        <input
          ref={addMoreRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          onChange={handleAddMore}
        />
      </div>

      {isProcessing && progress.percent > 0 && (
        <ProgressBar percent={progress.percent} message={progress.message} />
      )}

      <div className="flex gap-3">
        <button
          onClick={handleBuild}
          disabled={isProcessing || pdfPages.length === 0}
          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm shadow"
        >
          {isProcessing ? (
            <>
              <Loader size={16} className="animate-spin" /> Building PDF…
            </>
          ) : pdfMode === "images" ? (
            <>
              <Images size={16} /> Make PDF ({pdfPages.length}{" "}
              {pdfPages.length === 1 ? "image" : "images"})
            </>
          ) : (
            <>
              <FileText size={16} />{" "}
              {hasLimits ? "Compress PDF" : "Process PDF"}
            </>
          )}
        </button>
        <button
          onClick={reset}
          disabled={isProcessing}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors text-sm disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      {result && (
        <div
          className={`rounded-xl border-2 p-4 ${result.inRange ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center shrink-0">
              <FileText size={22} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm truncate">
                {result.file.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">application/pdf</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${result.inRange ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                >
                  {result.inRange ? "✓" : "✗"} {formatFileSize(Number((result.sizeKB)))}
                </span>
                {hasLimits && !result.inRange && (
                  <span className="text-xs text-red-600">
                    Required: {minSize}–{maxSize} KB
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => saveAs(result.file, result.file.name)}
            className={`w-full mt-3 py-2.5 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm transition-colors ${result.inRange ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600"}`}
          >
            <Download size={16} />
            {result.inRange ? "Download PDF" : "Download Anyway"}
          </button>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */
export default function CustomResizerPanel() {
  const [activeTab, setActiveTab] = useState<"image" | "pdf">("image");

  return (
    <>
      <ToastContainer />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">
          Custom Resizer
        </h1>
        <p className="text-sm text-gray-500 text-center mb-5">
          Resize images or build PDFs to exact requirements
        </p>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
          {(["image", "pdf"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === tab
                  ? "bg-white text-green-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "image" ? (
                <ImageIcon size={15} />
              ) : (
                <FileText size={15} />
              )}
              {tab === "image" ? "Image Resizer" : "PDF Builder"}
            </button>
          ))}
        </div>

        {activeTab === "image" ? <ImageResizerTab /> : <PdfBuilderTab />}
      </div>
    </>
  );
}
