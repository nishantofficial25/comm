// lib/imageProcessor.ts
// Browser-only image processing utilities.
// All canvas / DOM work is isolated here — never imported in Server Components.
"use-client";

// ─── v9 backend API contract ──────────────────────────────────────────────────
// KEY CHANGES v9:
//   - browserCompress is SKIPPED entirely — server handles all compression
//     This prevents double-compression and avoids the over-compress→pad cycle
//   - Files already in range AND correct dimensions → returned to server
//     with browser_compressed=false so server can return them as-is
//   - Size target is now upper end (90% of max), not midpoint
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = `${process.env.NEXT_PUBLIC_API_BASE}/api/compress-image`;

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1000 * 1000;

// ── Fire-and-forget tracker ───────────────────────────────────────────────────
export type TrackType =
  | "image"
  | "pdf"
  | "imagetopdf"
  | "signature"
  | "passport"
  | "fingerprint";

const _lastSent: Partial<Record<TrackType, number>> = {};
const DEDUP_MS = 3000;

export function _track(type: TrackType): void {
  const now = Date.now();
  const last = _lastSent[type] ?? 0;
  if (now - last < DEDUP_MS) return;
  _lastSent[type] = now;
  fetch("/api/track-resize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  })
    .then((r) => r.json())
    .catch(() => {});
}

// ── Fingerprint detection ─────────────────────────────────────────────────────
export function isFingerprintRequirement(value?: string | null): boolean {
  if (!value) return false;
  const s = value.trim().toLowerCase();
  return (
    s.includes("fingerprint") || s.includes("thumb") || s.includes("impression")
  );
}

// ── HEIC support ──────────────────────────────────────────────────────────────
let _heic2any:
  | ((opts: Record<string, unknown>) => Promise<Blob | Blob[]>)
  | null = null;

const loadHeic2any = (): Promise<typeof _heic2any> =>
  new Promise((resolve, reject) => {
    if (_heic2any) return resolve(_heic2any);
    if ((window as any).__heic2any__) {
      _heic2any = (window as any).__heic2any__;
      return resolve(_heic2any);
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
    script.onload = () => {
      _heic2any = (window as any).heic2any;
      resolve(_heic2any);
    };
    script.onerror = () => reject(new Error("Failed to load HEIC converter"));
    document.head.appendChild(script);
  });

const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);
const HEIC_EXTENSIONS = new Set(["heic", "heif"]);
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/avif",
  "image/svg+xml",
  ...HEIC_TYPES,
]);

const getExt = (name = "") => name.split(".").pop()?.toLowerCase() ?? "";
const isHeic = (f: File) =>
  HEIC_TYPES.has(f.type) || HEIC_EXTENSIONS.has(getExt(f.name));
const isSupported = (f: File) =>
  SUPPORTED_IMAGE_TYPES.has(f.type) ||
  isHeic(f) ||
  (!f.type && /\.(jpe?g|png|webp|gif|bmp|tiff?|avif|heic|heif)$/i.test(f.name));

async function heicToJpeg(
  file: File,
  onProgress?: (p: number, m: string) => void,
): Promise<File> {
  onProgress?.(5, "Loading HEIC converter...");
  const heic2any = await loadHeic2any();
  onProgress?.(15, "Converting HEIC to JPEG...");
  const result = await heic2any!({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  const blob = Array.isArray(result) ? result[0] : (result as Blob);
  onProgress?.(25, "HEIC converted successfully...");
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
    type: "image/jpeg",
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load: ${file.name}`));
    };
    img.src = url;
  });
}

function imageToJpegBlob(
  img: HTMLImageElement,
  scale = 1.0,
  quality = 0.85,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(50, Math.round(img.width * scale));
  canvas.height = Math.max(50, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
}

// ── buildFileName ─────────────────────────────────────────────────────────────
export function buildFileName({
  outputFileName,
  extension,
  conditionName = "",
}: {
  outputFileName?: string | null;
  extension: string;
  conditionName?: string;
}): string {
  const sanitize = (s: string) =>
    s
      .replace(/\.[^/.]+$/, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .trim();
  const safeCondition = conditionName ? sanitize(conditionName) : "";
  const timestamp = Date.now();
  if (outputFileName?.trim()) {
    const clean = sanitize(outputFileName);
    if (clean) return `${clean}.${extension}`;
  }
  return (
    ["sahiphoto", safeCondition, String(timestamp)].filter(Boolean).join("-") +
    `.${extension}`
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CompressResult {
  file: File;
  downloadUrl: string;
  inRange: boolean;
  warning: string | null;
  pageCount?: number;
}

export interface CompressOptions {
  file: File;
  minSizeMB: number;
  maxSizeMB: number;
  widthPx?: number | null;
  heightPx?: number | null;
  outputFileName?: string | null;
  outputType?: "image" | "pdf" | "signature" | "passport" | "fingerprint";
  onProgress?: (percent: number, message: string) => void;
  conditionName?: string | null;
  scanOptions?: Record<string, unknown> | null;
  trackAs?: TrackType | null;
  scanEnabled?: boolean;
  additionalRequirements?: string | null;
  fingerprintEnhance?: boolean;
}

// ── compressPdfViaBackend ─────────────────────────────────────────────────────
async function compressPdfViaBackend({
  file,
  minSizeMB,
  maxSizeMB,
  outputFileName,
  conditionName,
  onProgress,
}: Pick<
  CompressOptions,
  | "file"
  | "minSizeMB"
  | "maxSizeMB"
  | "outputFileName"
  | "conditionName"
  | "onProgress"
>): Promise<CompressResult> {
  onProgress?.(10, "Preparing PDF...");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("min_size_mb", String(minSizeMB));
  fd.append("max_size_mb", String(maxSizeMB));
  fd.append("width", "null");
  fd.append("height", "null");
  fd.append("browser_compressed", "false");
  fd.append("output_type", "pdf");
  onProgress?.(30, "Processing your PDF...");
  const res = await fetch(API_URL, {
    method: "POST",
    body: fd,
    cache: "no-store",
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`PDF compression failed (${res.status}): ${errText}`);
  }
  onProgress?.(70, "Processing PDF...");
  const blob = await res.blob();
  onProgress?.(90, "Finalizing PDF...");
  const finalName = buildFileName({
    outputFileName,
    extension: "pdf",
    conditionName: conditionName ?? "",
  });
  const finalFile = new File([blob], finalName, { type: "application/pdf" });
  onProgress?.(100, "Complete!");
  const minBytes = minSizeMB * 1_000_000;
  const maxBytes = maxSizeMB * 1_000_000;
  const inRange = finalFile.size >= minBytes && finalFile.size <= maxBytes;
  return {
    file: finalFile,
    downloadUrl: URL.createObjectURL(finalFile),
    inRange,
    warning: inRange ? null : "PDF size outside range",
  };
}

// ── convertImageToPdf ─────────────────────────────────────────────────────────
async function convertImageToPdf({
  file,
  minSizeMB,
  maxSizeMB,
  outputFileName,
  conditionName,
  onProgress,
}: Pick<
  CompressOptions,
  | "file"
  | "minSizeMB"
  | "maxSizeMB"
  | "outputFileName"
  | "conditionName"
  | "onProgress"
>): Promise<CompressResult> {
  const { jsPDF } = await import("jspdf");
  const minBytes = minSizeMB * 1_000_000;
  const maxBytes = maxSizeMB * 1_000_000;
  // FIX v9: target upper end (90% of max), not midpoint
  const targetBytes = Math.min(maxBytes * 0.9, maxBytes - 10000);
  const img = await loadImage(file);
  const longEdge = Math.max(img.width, img.height);
  const initScale = Math.min(1.0, 1240 / longEdge);
  const dimScales = [1.0, 0.85, 0.7, 0.55, 0.4, 0.28, 0.18];
  const qualities = [0.92, 0.8, 0.68, 0.56, 0.44, 0.32];
  let bestPdfBlob: Blob | null = null;
  let bestDiff = Infinity;
  let attempt = 0;
  const total = dimScales.length * qualities.length;

  outer: for (const dimScale of dimScales) {
    const cs = initScale * dimScale;
    const cw = Math.max(50, Math.round(img.width * cs));
    const ch = Math.max(50, Math.round(img.height * cs));
    for (const quality of qualities) {
      attempt++;
      onProgress?.(
        Math.round(15 + (attempt / total) * 70),
        `Optimizing PDF (${attempt}/${total})...`,
      );
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      canvas.getContext("2d")!.drawImage(img, 0, 0, cw, ch);
      const jpegBlob: Blob | null = await new Promise((r) =>
        canvas.toBlob(r, "image/jpeg", quality),
      );
      if (!jpegBlob) continue;
      const base64: string = await new Promise((r) => {
        const rd = new FileReader();
        rd.onload = () => r(rd.result as string);
        rd.readAsDataURL(jpegBlob);
      });
      const wMM = (cw * 25.4) / 300;
      const hMM = (ch * 25.4) / 300;
      const pdf = new jsPDF({
        orientation: wMM > hMM ? "landscape" : "portrait",
        unit: "mm",
        format: [wMM, hMM],
        compress: true,
      });
      pdf.addImage(base64, "JPEG", 0, 0, wMM, hMM);
      const pdfBlob = pdf.output("blob");
      if (pdfBlob.size >= minBytes && pdfBlob.size <= maxBytes) {
        const name = buildFileName({
          outputFileName,
          extension: "pdf",
          conditionName: conditionName ?? "",
        });
        onProgress?.(100, "Complete!");
        return {
          file: new File([pdfBlob], name, { type: "application/pdf" }),
          downloadUrl: URL.createObjectURL(pdfBlob),
          inRange: true,
          warning: null,
        };
      }
      // FIX v9: track closest to upper target, not midpoint
      const diff = Math.abs(pdfBlob.size - targetBytes);
      if (diff < bestDiff) {
        bestPdfBlob = pdfBlob;
        bestDiff = diff;
      }
      if (pdfBlob.size < minBytes * 0.4 && quality <= 0.44) continue outer;
    }
  }

  if (bestPdfBlob) {
    const name = buildFileName({
      outputFileName,
      extension: "pdf",
      conditionName: conditionName ?? "",
    });
    const f = new File([bestPdfBlob], name, { type: "application/pdf" });
    const inRange = f.size >= minBytes && f.size <= maxBytes;
    onProgress?.(100, "Complete!");
    return {
      file: f,
      downloadUrl: URL.createObjectURL(bestPdfBlob),
      inRange,
      warning: inRange ? null : "PDF size outside range",
    };
  }
  throw new Error("Failed to generate PDF. Please try again.");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Helper: send file to server and return the processed binary as a File
// ─────────────────────────────────────────────────────────────────────────────
async function _serverPipelineRequest({
  workingFile,
  minSizeMB,
  maxSizeMB,
  widthPx,
  heightPx,
  outputType,
  scanOptionsPayload,
  progressStart,
  progressEnd,
  onProgress,
  progressMsg,
}: {
  workingFile: File;
  minSizeMB: number;
  maxSizeMB: number;
  widthPx: number | null | undefined;
  heightPx: number | null | undefined;
  outputType: string;
  scanOptionsPayload: string;
  progressStart: number;
  progressEnd: number;
  onProgress?: (p: number, m: string) => void;
  progressMsg: string;
}): Promise<Blob> {
  const fd = new FormData();
  fd.append("file", workingFile);
  fd.append("min_size_mb", String(minSizeMB));
  fd.append("max_size_mb", String(maxSizeMB));
  fd.append("width", widthPx != null ? String(widthPx) : "null");
  fd.append("height", heightPx != null ? String(heightPx) : "null");
  fd.append("browser_compressed", "false");
  fd.append("output_type", outputType);
  fd.append("scan_options", scanOptionsPayload);

  onProgress?.(progressStart, progressMsg);

  const res = await fetch(API_URL, {
    method: "POST",
    body: fd,
    cache: "no-store",
  });

  if (!res.ok) {
    let errMsg = `Processing failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error) errMsg = errJson.error;
      else if (errJson?.traceback)
        errMsg = errJson.traceback.split("\n").pop() ?? errMsg;
    } catch {
      errMsg = await res.text().catch(() => errMsg);
    }
    throw new Error(errMsg);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await res.json();
    throw new Error(
      json?.error ?? `${outputType} processing failed. Please try again.`,
    );
  }

  onProgress?.(progressEnd, "Finalizing...");
  return res.blob();
}

// ── Main compressImage ────────────────────────────────────────────────────────
export async function compressImage({
  file,
  minSizeMB,
  maxSizeMB,
  widthPx = null,
  heightPx = null,
  outputFileName = null,
  outputType = "image",
  onProgress,
  conditionName = null,
  trackAs = null,
  scanEnabled = false,
  additionalRequirements = null,
  fingerprintEnhance = false,
}: CompressOptions): Promise<CompressResult> {
  if (!file || typeof file !== "object" || !("size" in file))
    throw new Error("Invalid file");
  if (file.size > MAX_FILE_SIZE_BYTES)
    throw new Error(`File exceeds ${MAX_FILE_SIZE_MB} MB limit`);

  const isPdfInput = file.type === "application/pdf";
  const wantPdf = outputType === "pdf";
  const isSignature = outputType === "signature";

  const isFingerprint =
    outputType === "fingerprint" ||
    isFingerprintRequirement(additionalRequirements) ||
    isFingerprintRequirement(conditionName);

  const isPassport =
    !isFingerprint &&
    (outputType === "passport" ||
      (!!additionalRequirements &&
        additionalRequirements.trim() !== "" &&
        additionalRequirements.trim().toLowerCase() !== "nil"));

  const resolvedType: TrackType =
    trackAs ??
    (isFingerprint
      ? "fingerprint"
      : isPassport
        ? "passport"
        : isSignature
          ? "signature"
          : isPdfInput || wantPdf
            ? "pdf"
            : "image");

  // ── PDF input ──────────────────────────────────────────────────────────────
  if (isPdfInput && wantPdf) {
    const result = await compressPdfViaBackend({
      file,
      minSizeMB,
      maxSizeMB,
      outputFileName,
      conditionName,
      onProgress,
    });
    _track(resolvedType);
    return result;
  }
  if (isPdfInput && !wantPdf)
    throw new Error(
      "Cannot convert PDF to image. Please upload an image file.",
    );
  if (!isPdfInput && !isSupported(file))
    throw new Error(
      `Unsupported file type: "${file.type || getExt(file.name)}"`,
    );

  // ── HEIC conversion ────────────────────────────────────────────────────────
  let workingFile = file;
  if (isHeic(file)) {
    try {
      workingFile = await heicToJpeg(file, onProgress);
    } catch (err: any) {
      throw new Error(`HEIC conversion failed: ${err.message}`);
    }
  }

  // ── Image → PDF ────────────────────────────────────────────────────────────
  if (wantPdf) {
    const result = await convertImageToPdf({
      file: workingFile,
      minSizeMB,
      maxSizeMB,
      outputFileName,
      conditionName,
      onProgress: onProgress
        ? (p, m) => onProgress(Math.round(25 + p * 0.75), m)
        : undefined,
    });
    _track(resolvedType);
    return result;
  }

  // ── Fingerprint pipeline ──────────────────────────────────────────────────
  if (isFingerprint) {
    onProgress?.(isHeic(file) ? 30 : 15, "Processing fingerprint...");

    const scanOptionsPayload = JSON.stringify({
      uniform_lighting: false,
      clean_white: false,
      perfect_flat: false,
      additionalRequirements: additionalRequirements ?? "fingerprint",
      fingerprintEnhance: Boolean(fingerprintEnhance),
    });

    const blob = await _serverPipelineRequest({
      workingFile,
      minSizeMB,
      maxSizeMB,
      widthPx,
      heightPx,
      outputType: "fingerprint",
      scanOptionsPayload,
      progressStart: 45,
      progressEnd: 85,
      onProgress,
      progressMsg: "Cropping fingerprint on server...",
    });

    const finalName = buildFileName({
      outputFileName,
      extension: "jpg",
      conditionName: conditionName ?? "",
    });
    const finalFile = new File([blob], finalName, { type: "image/jpeg" });
    onProgress?.(100, "Complete!");

    const minBytes = minSizeMB * 1_000_000;
    const maxBytes = maxSizeMB * 1_000_000;
    const inRange = finalFile.size >= minBytes && finalFile.size <= maxBytes;
    _track(resolvedType);
    return {
      file: finalFile,
      downloadUrl: URL.createObjectURL(finalFile),
      inRange,
      warning: inRange ? null : "File size outside range",
    };
  }

  // ── Passport / Face pipeline ──────────────────────────────────────────────
  if (isPassport) {
    onProgress?.(isHeic(file) ? 30 : 15, "Detecting face...");

    const scanOptionsPayload = JSON.stringify({
      uniform_lighting: false,
      clean_white: false,
      perfect_flat: false,
      additionalRequirements: additionalRequirements ?? "passport",
    });

    const blob = await _serverPipelineRequest({
      workingFile,
      minSizeMB,
      maxSizeMB,
      widthPx,
      heightPx,
      outputType: "passport",
      scanOptionsPayload,
      progressStart: 40,
      progressEnd: 85,
      onProgress,
      progressMsg: "Processing face on server...",
    });

    const finalName = buildFileName({
      outputFileName,
      extension: "jpg",
      conditionName: conditionName ?? "",
    });
    const finalFile = new File([blob], finalName, { type: "image/jpeg" });
    onProgress?.(100, "Complete!");

    const minBytes = minSizeMB * 1_000_000;
    const maxBytes = maxSizeMB * 1_000_000;
    const inRange = finalFile.size >= minBytes && finalFile.size <= maxBytes;
    _track(resolvedType);
    return {
      file: finalFile,
      downloadUrl: URL.createObjectURL(finalFile),
      inRange,
      warning: inRange ? null : "File size outside range",
    };
  }

  // ── Image / Signature path ─────────────────────────────────────────────────
  // FIX v9: SKIP browser compression entirely.
  // Let the server handle everything — browser compress→pad cycle caused
  // portal "corrupted image" errors due to excessive COM metadata.
  // The server's _compress_to_target_upper() uses real JPEG quality to reach
  // near the upper size limit, minimising any COM padding needed.

  const fd = new FormData();
  fd.append("file", workingFile);
  fd.append("min_size_mb", String(minSizeMB));
  fd.append("max_size_mb", String(maxSizeMB));
  fd.append("width", widthPx != null ? String(widthPx) : "null");
  fd.append("height", heightPx != null ? String(heightPx) : "null");
  fd.append("browser_compressed", "false"); // always false now
  fd.append("output_type", isSignature ? "signature" : "image");
  fd.append(
    "scan_options",
    JSON.stringify({
      uniform_lighting: isSignature ? scanEnabled : false,
      clean_white: isSignature ? scanEnabled : false,
      perfect_flat: false,
      additionalRequirements: additionalRequirements ?? "",
    }),
  );

  onProgress?.(
    isHeic(file) ? 35 : 20,
    isSignature ? "Processing signature..." : "Processing on server...",
  );
  const res = await fetch(API_URL, {
    method: "POST",
    body: fd,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Server error: ${await res.text()}`);
  onProgress?.(85, "Finalizing...");

  const blob = await res.blob();
  const finalName = buildFileName({
    outputFileName,
    extension: "jpg",
    conditionName: conditionName ?? "",
  });
  const finalFile = new File([blob], finalName, { type: "image/jpeg" });
  onProgress?.(100, "Complete!");

  const minBytes = minSizeMB * 1_000_000;
  const maxBytes = maxSizeMB * 1_000_000;
  const inRange = finalFile.size >= minBytes && finalFile.size <= maxBytes;
  _track(resolvedType);
  return {
    file: finalFile,
    downloadUrl: URL.createObjectURL(finalFile),
    inRange,
    warning: inRange ? null : "File size outside range",
  };
}

// ── combineImagesToPdf ────────────────────────────────────────────────────────
export async function combineImagesToPdf({
  files,
  minSizeMB,
  maxSizeMB,
  outputFileName = null,
  conditionName = null,
  onProgress,
}: {
  files: File[];
  minSizeMB: number;
  maxSizeMB: number;
  outputFileName?: string | null;
  conditionName?: string | null;
  onProgress?: (p: number, m: string) => void;
}): Promise<CompressResult & { pageCount: number }> {
  if (!files?.length) throw new Error("No files provided");
  const { jsPDF } = await import("jspdf");
  const minBytes = minSizeMB * 1_000_000;
  const maxBytes = maxSizeMB * 1_000_000;
  // FIX v9: target upper end
  const targetBytes = Math.min(maxBytes * 0.9, maxBytes - 10000);
  const progress = (pct: number, msg: string) => onProgress?.(pct, msg);

  progress(5, "Preparing images...");
  const resolvedFiles = await Promise.all(
    files.map(async (f) => (isHeic(f) ? heicToJpeg(f).catch(() => f) : f)),
  );
  const images: HTMLImageElement[] = [];
  for (let i = 0; i < resolvedFiles.length; i++) {
    progress(
      Math.round(5 + (i / resolvedFiles.length) * 20),
      `Loading image ${i + 1}/${resolvedFiles.length}...`,
    );
    images.push(await loadImage(resolvedFiles[i]));
  }

  const dimScales = [1.0, 0.85, 0.7, 0.55, 0.4, 0.28];
  const qualities = [0.92, 0.8, 0.68, 0.56, 0.44, 0.32];
  const total = dimScales.length * qualities.length;
  let bestPdfBlob: Blob | null = null;
  let bestDiff = Infinity;
  let attempt = 0;

  outer: for (const dimScale of dimScales) {
    for (const quality of qualities) {
      attempt++;
      progress(
        Math.round(25 + (attempt / total) * 65),
        `Optimizing PDF (${attempt}/${total})...`,
      );
      let pdf: InstanceType<typeof jsPDF> | null = null;

      for (const img of images) {
        const cw = Math.max(50, Math.round(img.width * dimScale));
        const ch = Math.max(50, Math.round(img.height * dimScale));
        const jpegBlob = await imageToJpegBlob(img, dimScale, quality);
        if (!jpegBlob) continue;
        const base64: string = await new Promise((r) => {
          const rd = new FileReader();
          rd.onload = () => r(rd.result as string);
          rd.readAsDataURL(jpegBlob);
        });
        const wMM = (cw * 25.4) / 300;
        const hMM = (ch * 25.4) / 300;
        if (!pdf) {
          pdf = new jsPDF({
            orientation: wMM > hMM ? "landscape" : "portrait",
            unit: "mm",
            format: [wMM, hMM],
            compress: true,
          });
        } else {
          pdf.addPage([wMM, hMM], wMM > hMM ? "landscape" : "portrait");
        }
        pdf.addImage(base64, "JPEG", 0, 0, wMM, hMM);
      }

      if (!pdf) continue;
      const pdfBlob = pdf.output("blob");
      if (pdfBlob.size >= minBytes && pdfBlob.size <= maxBytes) {
        const name = buildFileName({
          outputFileName: outputFileName ?? "combined",
          extension: "pdf",
          conditionName: conditionName ?? "",
        });
        progress(100, "Complete!");
        _track("imagetopdf");
        return {
          file: new File([pdfBlob], name, { type: "application/pdf" }),
          downloadUrl: URL.createObjectURL(pdfBlob),
          inRange: true,
          warning: null,
          pageCount: images.length,
        };
      }
      // FIX v9: track closest to upper target
      const diff = Math.abs(pdfBlob.size - targetBytes);
      if (diff < bestDiff) {
        bestPdfBlob = pdfBlob;
        bestDiff = diff;
      }
      if (pdfBlob.size < minBytes * 0.3 && quality <= 0.44) continue outer;
    }
  }

  if (bestPdfBlob) {
    const name = buildFileName({
      outputFileName: outputFileName ?? "combined",
      extension: "pdf",
      conditionName: conditionName ?? "",
    });
    const f = new File([bestPdfBlob], name, { type: "application/pdf" });
    const inRange = f.size >= minBytes && f.size <= maxBytes;
    progress(100, "Complete!");
    _track("imagetopdf");
    return {
      file: f,
      downloadUrl: URL.createObjectURL(bestPdfBlob),
      inRange,
      warning: inRange ? null : "PDF size outside range",
      pageCount: images.length,
    };
  }
  throw new Error("Failed to generate PDF. Please try again.");
}
