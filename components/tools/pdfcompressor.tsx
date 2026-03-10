// components/PdfCompressorTool.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, Loader, FileText, X } from "lucide-react";
import { compressImage } from "@/lib/imageProcessor";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { formatFileSize } from "@/app/action/fileformat";

const MAX_MB = 50;
const MAX_BYTES = MAX_MB * 1000 * 1000;

interface Result {
  file: File;
  inRange: boolean;
  sizeKB: string;
}

const Bar = ({ pct, msg }: { pct: number; msg: string }) => (
  <div className="mb-3.5">
    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
      <span className="truncate pr-2">{msg || "Processing…"}</span>
      <span className="font-extrabold text-blue-600 shrink-0">{pct}%</span>
    </div>
    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg,#1d4ed8,#3b82f6)",
        }}
      />
    </div>
  </div>
);

export default function PdfCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [outputName, setOutputName] = useState("");
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
    setResult(null);
    setProg({ pct: 0, msg: "" });
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file)
      return void toast.error("Please select a PDF file.", {
        position: "top-center",
      });
    const hasLimits = !!(minSize && maxSize);
    setStatus("processing");
    setProg({ pct: 0, msg: "Sending to server…" });
    setResult(null);
    try {
      let res: { file: File; inRange: boolean };
      if (hasLimits) {
        res = await compressImage({
          file,
          minSizeMB: Number(minSize) / 1000,
          maxSizeMB: Number(maxSize) / 1000,
          outputType: "pdf",
          outputFileName: outputName || null,
          onProgress: (pct, msg) => setProg({ pct, msg }),
        });
      } else {
        const baseName = outputName
          ? outputName.replace(/\.pdf$/i, "") + ".pdf"
          : file.name.endsWith(".pdf")
            ? file.name
            : file.name + ".pdf";
        res = {
          file: new File([file], baseName, { type: "application/pdf" }),
          inRange: true,
        };
        setProg({ pct: 100, msg: "Complete!" });
      }
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
      toast.error(err.message || "Failed to compress PDF.", {
        position: "top-center",
      });
      setStatus("idle");
      setProg({ pct: 0, msg: "" });
    }
  }, [file, minSize, maxSize, outputName]);

  const reset = useCallback(() => {
    setFile(null);
    setResult(null);
    setMinSize("");
    setMaxSize("");
    setOutputName("");
    setStatus("idle");
    setProg({ pct: 0, msg: "" });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const busy = status === "processing";
  const origKB = file ? (file.size / 1000).toFixed(1) : null;
  const savedPct =
    file && result
      ? Math.round((1 - result.file.size / file.size) * 100)
      : null;

  return (
    <div className="space-y-3.5 pb-7">
      {/* Settings */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">
          Target Size{" "}
          <span className="font-medium normal-case text-gray-300">
            (optional — leave blank to rename only)
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
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
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
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5">
            Output Filename{" "}
            <span className="font-medium normal-case text-gray-300">
              (optional)
            </span>
          </label>
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            placeholder="compressed-document"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f?.type === "application/pdf") pick(f);
          else toast.error("Please drop a PDF file.");
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${drag || file ? "#3b82f6" : "#e2e8f0"}`,
          background: file || drag ? "#eff6ff" : "#fafafa",
        }}
      >
        {file ? (
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={22} color="#2563eb" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 m-0 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-400 m-0">{origKB} KB</p>
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
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
              <Upload size={24} color="#2563eb" />
            </div>
            <p className="font-bold text-sm text-gray-600 m-0 mb-1">
              Click or Drag &amp; Drop PDF
            </p>
            <p className="text-xs text-gray-400 m-0">
              PDF files only · Max {MAX_MB} MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={(e) => pick(e.target.files?.[0])}
          hidden
        />
      </div>

      {busy && prog.pct > 0 && <Bar pct={prog.pct} msg={prog.msg} />}

      {/* Before/after stats */}
      {file && result && (
        <div className="flex gap-2.5">
          {[
            {
              label: "Original",
              value: origKB,
              unit: "KB",
              color: "#64748b",
              bg: "#f8fafc",
            },
            {
              label: "Compressed",
              value: result.sizeKB,
              unit: "KB",
              color: result.inRange ? "#16a34a" : "#dc2626",
              bg: result.inRange ? "#f0fdf4" : "#fef2f2",
            },
            ...(savedPct && savedPct > 0
              ? [
                  {
                    label: "Saved",
                    value: savedPct,
                    unit: "%",
                    color: "#2563eb",
                    bg: "#eff6ff",
                  },
                ]
              : []),
          ].map(({ label, value, unit, color, bg }) => (
            <div
              key={label}
              className="flex-1 border border-gray-200 rounded-xl p-3.5 text-center"
              style={{ background: bg }}
            >
              <p className="text-[10px] font-bold text-gray-400 m-0 mb-1.5 uppercase tracking-widest">
                {label}
              </p>
              <p className="text-xl font-black m-0" style={{ color }}>
                {value} <span className="text-[11px]">{unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleCompress}
          disabled={busy || !file}
          className="flex-1 py-3.5 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 text-sm transition-opacity disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}
        >
          {busy ? (
            <>
              <Loader size={16} className="animate-spin" /> Compressing…
            </>
          ) : (
            <>
              <FileText size={15} />{" "}
              {minSize && maxSize ? "Compress PDF" : "Process PDF"}
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
            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              <FileText size={20} color="#2563eb" />
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
            {result.inRange ? "Download Compressed PDF" : "Download Anyway"}
          </button>
        </div>
      )}
    </div>
  );
}
