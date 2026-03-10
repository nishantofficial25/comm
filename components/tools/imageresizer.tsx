// components/ImageResizerTool.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, Loader, X, ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/imageProcessor";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { formatFileSize } from "@/app/action/fileformat";

const CM_TO_PX = 300 / 2.54;
const cmToPx = (v: string): number => Math.round(parseFloat(v) * CM_TO_PX);
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1000 * 1000;
const revokeUrl = (u?: string | null) => u && URL.revokeObjectURL(u);

interface Result {
  file: File;
  inRange: boolean;
  sizeKB: string;
  previewUrl: string | null;
}

const Bar = ({ pct, msg }: { pct: number; msg: string }) => (
  <div className="mb-3.5">
    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
      <span className="truncate pr-2">{msg || "Processing…"}</span>
      <span className="font-extrabold text-orange-500 shrink-0">{pct}%</span>
    </div>
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg,#ea580c,#f97316)",
        }}
      />
    </div>
  </div>
);

export default function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState<"cm" | "px">("cm");
  const [outputName, setOutputName] = useState("");
  const [format, setFormat] = useState("jpg");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [prog, setProg] = useState({ pct: 0, msg: "" });
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback((f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES)
      return void toast.error(`Max file size is ${MAX_MB} MB`, {
        position: "top-center",
      });
    setFile(f);
    setResult((p) => {
      revokeUrl(p?.previewUrl);
      return null;
    });
    setProg({ pct: 0, msg: "" });
  }, []);

  const handleResize = useCallback(async () => {
    if (!file)
      return void toast.error("Please select a file first.", {
        position: "top-center",
      });
    if (!minSize || !maxSize)
      return void toast.error("Min and Max size are required.", {
        position: "top-center",
      });
    setStatus("processing");
    setProg({ pct: 0, msg: "Sending to server…" });
    setResult(null);
    try {
      const widthPx = width
        ? unit === "cm"
          ? cmToPx(width + "cm")
          : Number(width)
        : null;
      const heightPx = height
        ? unit === "cm"
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
        onProgress: (pct, msg) => setProg({ pct, msg }),
      });
      if (!res.inRange)
        toast.error(
          `Got ${(res.file.size / 1000).toFixed(1)} KB — required ${minSize}–${maxSize} KB`,
          { position: "top-center", autoClose: 7000 },
        );
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
      setProg({ pct: 100, msg: "Complete!" });
    } catch (err: any) {
      toast.error(err.message || "Failed to process file.", {
        position: "top-center",
      });
      setStatus("idle");
      setProg({ pct: 0, msg: "" });
    }
  }, [file, minSize, maxSize, width, height, unit, outputName, format]);

  const reset = useCallback(() => {
    setFile(null);
    setResult((p) => {
      revokeUrl(p?.previewUrl);
      return null;
    });
    setMinSize("");
    setMaxSize("");
    setWidth("");
    setHeight("");
    setOutputName("");
    setFormat("jpg");
    setStatus("idle");
    setProg({ pct: 0, msg: "" });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const busy = status === "processing";

  return (
    <div className="space-y-3.5 pb-7">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        className="rounded-2xl p-9 text-center cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${drag || file ? "#f97316" : "#e2e8f0"}`,
          background: file || drag ? "#fff7ed" : "#fafafa",
        }}
      >
        {file ? (
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <ImageIcon size={20} color="#ea580c" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 m-0 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-400 m-0">
                {(file.size / 1000).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="bg-transparent border-0 cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={30} color="#94a3b8" className="mx-auto mb-2.5" />
            <p className="font-bold text-sm text-gray-600 m-0 mb-1">
              Click or Drag &amp; Drop Image
            </p>
            <p className="text-xs text-gray-400 m-0">
              JPG · PNG · HEIC · Max {MAX_MB} MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          onChange={(e) => pick(e.target.files?.[0])}
          hidden
        />
      </div>

      {/* Settings */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex gap-3 flex-wrap items-end mb-4">
          <div className="flex-1 min-w-[100px]">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Min (KB)
            </label>
            <input
              type="number"
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              placeholder="20"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors"
            />
          </div>
          <span className="text-gray-300 font-bold pb-2.5">–</span>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Max (KB)
            </label>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              placeholder="100"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors"
            />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-end mb-4">
          <div className="flex-1 min-w-[80px]">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Width
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="3.5"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors"
            />
          </div>
          <span className="text-gray-300 font-bold pb-2.5">×</span>
          <div className="flex-1 min-w-[80px]">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Height
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="4.5"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors"
            />
          </div>
          <div className="w-20">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Unit
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as "cm" | "px")}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors"
            >
              <option value="cm">cm</option>
              <option value="px">px</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="w-28">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors"
            >
              <option value="jpg">JPG</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
              Filename
            </label>
            <input
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="my-photo"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {busy && prog.pct > 0 && <Bar pct={prog.pct} msg={prog.msg} />}

      <div className="flex gap-3">
        <button
          onClick={handleResize}
          disabled={busy}
          className="flex-1 py-3.5 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-sm transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#ea580c,#f97316)" }}
        >
          {busy ? (
            <>
              <Loader size={16} className="animate-spin" /> Processing…
            </>
          ) : (
            <>
              <Upload size={15} /> Resize Image
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
          <div className="flex gap-3.5 items-start">
            {result.previewUrl && (
              <img
                src={result.previewUrl}
                alt="Preview"
                loading="lazy"
                decoding="async"
                className="w-[70px] h-[70px] object-cover rounded-xl border border-gray-200 shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 m-0 mb-1 truncate">
                {result.file.name}
              </p>
              <p className="text-[11px] text-gray-400 m-0 mb-2.5">
                {result.file.type}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold text-white ${result.inRange ? "bg-green-600" : "bg-red-600"}`}
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
            className="w-full mt-4 py-3 text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
            style={{
              background: result.inRange
                ? "linear-gradient(135deg,#0369a1,#0ea5e9)"
                : "linear-gradient(135deg,#991b1b,#dc2626)",
            }}
          >
            <Download size={16} />{" "}
            {result.inRange ? "Download Image" : "Download Anyway"}
          </button>
        </div>
      )}
    </div>
  );
}
