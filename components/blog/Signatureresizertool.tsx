"use client";
export const revalidate = 3600;
import { useState, useRef, useCallback } from "react";
import { ScanLine, Upload, Loader, Download, RotateCcw } from "lucide-react";
import { compressImage } from "@/lib/imageProcessor";

interface Result {
  file: File;
  url: string | null;
  sizeKB: number;
  inRange: boolean;
  scanApplied: boolean;
}

interface Progress {
  percent: number;
  message: string;
}

function ScanToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3 mb-5 transition-all duration-200 border"
      style={{
        background: enabled ? "#f5f3ff" : "#f9fafb",
        borderColor: enabled ? "#7c3aed" : "#e5e7eb",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-2.5">
        <ScanLine size={18} color={enabled ? "#7c3aed" : "#9ca3af"} />
        <div>
          <p
            className="text-[13px] font-bold m-0"
            style={{ color: enabled ? "#5b21b6" : "#6b7280" }}
          >
            Scan Enhancement{" "}
            <span
              className="text-[10px] font-bold tracking-wider uppercase ml-1 px-1.5 py-0.5 rounded"
              style={{
                color: enabled ? "#7c3aed" : "#9ca3af",
                background: enabled ? "#ede9fe" : "#f3f4f6",
              }}
            >
              {enabled ? "ON" : "OFF"}
            </span>
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 m-0">
            {enabled
              ? "White background · dark ink · removes grey/noise"
              : "Standard resize only — original colours preserved"}
          </p>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        className="relative shrink-0 focus:outline-none"
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: enabled
            ? "linear-gradient(135deg,#7c3aed,#a855f7)"
            : "#d1d5db",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            boxShadow: enabled
              ? "inset 0 1px 3px rgba(109,40,217,0.35)"
              : "inset 0 1px 3px rgba(0,0,0,0.12)",
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 3,
            left: enabled ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
            transition: "left 0.22s cubic-bezier(0.34,1.56,0.64,1)",
            pointerEvents: "none",
          }}
        />
      </button>
    </div>
  );
}

// UPSC signature spec — hardcoded since this is a standalone UPSC-specific tool
const SPEC = {
  minSizeMB: 0.02,
  maxSizeMB: 0.1,
  widthPx: 500,
  heightPx: 350,
  outputFileName: "signature",
};

export default function SignatureResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [progress, setProgress] = useState<Progress>({
    percent: 0,
    message: "",
  });
  const [scanEnabled, setScanEnabled] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setStatus("idle");
    setProgress({ percent: 0, message: "" });
    const url = URL.createObjectURL(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const resizeImage = useCallback(async () => {
    if (!file) return;
    setStatus("processing");
    setProgress({ percent: 0, message: "Starting…" });
    try {
      const res = await compressImage({
        file,
        minSizeMB: SPEC.minSizeMB,
        maxSizeMB: SPEC.maxSizeMB,
        widthPx: SPEC.widthPx,
        heightPx: SPEC.heightPx,
        outputType: "signature",
        outputFileName: SPEC.outputFileName,
        conditionName: "signature",
        scanEnabled,
        onProgress: (pct, msg) =>
          setProgress({ percent: pct, message: msg || "Processing…" }),
      });
      const previewUrl = res.file.type.startsWith("image/")
        ? URL.createObjectURL(res.file)
        : null;
      setResult({
        file: res.file,
        url: previewUrl,
        sizeKB: Math.round(res.file.size / 1000),
        inRange: res.inRange,
        scanApplied: scanEnabled,
      });
      setStatus("done");
      setProgress({ percent: 100, message: "Complete!" });
    } catch (err) {
      console.error(err);
      setStatus("idle");
      setProgress({ percent: 0, message: "" });
    }
  }, [file, scanEnabled]);

  const download = () => {
    if (!result?.file) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(result.file);
    a.download = result.file.name;
    a.click();
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setStatus("idle");
    setProgress({ percent: 0, message: "" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const isProcessing = status === "processing";

  return (
    <div className="bg-white border-2 border-green-600 rounded-2xl p-7 mb-12">
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="bg-green-600 text-white rounded-md px-3 py-0.5 text-[11px] font-bold tracking-widest uppercase">
          Free Tool
        </span>
        <span className="bg-green-100 text-green-700 rounded-md px-2.5 py-0.5 text-[11px] font-bold">
          100% Secure
        </span>
      </div>
      <h3
        className="font-bold text-2xl text-green-900 mb-1.5"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        UPSC Signature Resizer
      </h3>
      <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
        Instantly resize your signature to UPSC specs:{" "}
        <strong>500×350 px · 20–100 KB · JPG · &quot;signature&quot;</strong>.
        No upload to server — works completely offline.
      </p>

      {!result && (
        <ScanToggle
          enabled={scanEnabled}
          onChange={setScanEnabled}
          disabled={isProcessing}
        />
      )}

      <div
        onClick={() => !isProcessing && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className="rounded-xl p-7 text-center mb-4 transition-all duration-200 border-2 border-dashed"
        style={{
          borderColor: dragOver ? "#16a34a" : file ? "#16a34a" : "#86efac",
          background: dragOver ? "#dcfce7" : file ? "#f0fdf4" : "#fafffe",
          cursor: isProcessing ? "default" : "pointer",
        }}
      >
        {preview && file ? (
          <div className="flex items-center justify-center gap-4">
            <img
              src={preview}
              alt="preview"
              className="h-14 rounded border border-gray-200 object-contain"
            />
            <div className="text-left">
              <p className="font-bold text-sm text-green-800">{file.name}</p>
              <p className="text-xs text-gray-400">
                {(file.size / 1000).toFixed(1)} KB · Ready to resize
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-4xl mb-2">🖊️</div>
            <p className="font-bold text-green-800 text-[15px] mb-1">
              Drop your signature image here
            </p>
            <p className="text-xs text-gray-400">
              or click to browse · JPG, PNG, HEIC supported
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {isProcessing && progress.percent > 0 && (
        <div className="mb-3.5">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{progress.message || "Processing…"}</span>
            <span className="text-green-600 font-bold">
              {progress.percent}%
            </span>
          </div>
          <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {result && (
        <div
          className="rounded-xl p-4 mb-3.5 flex items-center gap-4 flex-wrap border"
          style={{
            background: result.inRange ? "#f0fdf4" : "#fff7ed",
            borderColor: result.inRange ? "#86efac" : "#fbbf24",
          }}
        >
          {result.url && (
            <img
              src={result.url}
              alt="resized signature"
              className="h-16 w-24 object-contain border border-gray-200 rounded-md bg-white"
            />
          )}
          <div className="flex-1">
            <p
              className="font-bold text-sm mb-1"
              style={{ color: result.inRange ? "#166534" : "#92400e" }}
            >
              {result.inRange ? "✅ In range!" : "⚠️ Near limit"} —{" "}
              {result.sizeKB} KB · {SPEC.widthPx}×{SPEC.heightPx} px
              {result.scanApplied && (
                <span className="ml-2 text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                  🔬 Scanned
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              Required: 20–100 KB · UPSC signature format · JPG
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              File: <strong>{SPEC.outputFileName}.jpg</strong>
            </p>
          </div>
          <button
            onClick={download}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            <Download size={14} /> Download
          </button>
        </div>
      )}

      <div className="flex gap-2.5">
        <button
          onClick={resizeImage}
          disabled={!file || isProcessing}
          className="flex-1 flex items-center justify-center gap-2 text-white font-bold rounded-xl py-3 text-[15px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: !file ? "#d1d5db" : "#16a34a" }}
        >
          {isProcessing ? (
            <>
              <Loader size={15} className="animate-spin" />{" "}
              {progress.percent > 0 ? `${progress.percent}% — ` : ""}
              {progress.message || "Processing…"}
            </>
          ) : scanEnabled ? (
            <>
              <ScanLine size={15} /> Scan &amp; Resize for UPSC
            </>
          ) : (
            <>
              <Upload size={15} /> Resize for UPSC
            </>
          )}
        </button>
        {file && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm text-gray-600 transition-colors"
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-400 mt-3 text-center">
        💡 After downloading, go to your gallery and upload from there — not
        directly from camera
      </p>
    </div>
  );
}
