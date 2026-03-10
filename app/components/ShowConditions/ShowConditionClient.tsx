// components/ShowConditionClient.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { saveAs } from "file-saver";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import DocumentCard from "./DocumentCard";
import ReportModal from "./ReportModal";
import { compressImage, combineImagesToPdf } from "@/lib/imageProcessor";
import {
  isFaceRequirement,
  isSignatureType,
  parseSize,
  revokeUrl,
  splitText,
} from "@/lib/utils";
import type {
  CompressedImageData,
  DocumentSize,
  DocumentStatus,
  ProgressState,
} from "@/lib/types";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1000 * 1000;

interface Props {
  examName: string;
  orderedTypes: string[];
  condObj: Record<string, DocumentSize>;
}

export default function ShowConditionClient({
  examName,
  orderedTypes,
  condObj,
}: Props) {
  const [compressedImages, setCompressedImages] = useState<
    Record<string, CompressedImageData>
  >({});
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeMergedSize, setActiveMergedSize] = useState<DocumentSize | null>(
    null,
  );
  const [scanEnabledPending, setScanEnabledPending] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, DocumentStatus>>(
    {},
  );
  const [progressMap, setProgressMap] = useState<Record<string, ProgressState>>(
    {},
  );
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportConditionName, setReportConditionName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Determine the correct outputType for a document:
   *   - "passport"  if additionalRequirements triggers the face pipeline
   *   - "signature" if the type key matches isSignatureType
   *   - "pdf"       if limits.type === "pdf"
   *   - "image"     otherwise
   */
  const resolveOutputType = (
    currentType: string,
    limits: DocumentSize,
  ): "image" | "pdf" | "signature" | "passport" => {
    const additionalRequirements =
      limits.additionalRequirements && limits.additionalRequirements !== "nil"
        ? limits.additionalRequirements
        : null;

    if (isFaceRequirement(additionalRequirements)) return "passport";
    if (isSignatureType(currentType)) return "signature";
    if (limits.type === "pdf") return "pdf";
    return "image";
  };

  const processFile = useCallback(
    async (
      currentType: string,
      limits: DocumentSize,
      file: File,
      scanEnabled = false,
    ) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(
          `File too large: ${(file.size / 1000 / 1000).toFixed(2)} MB. Max ${MAX_FILE_SIZE_MB} MB.`,
          { position: "top-center", autoClose: 5000 },
        );
        return;
      }

      const additionalRequirements =
        limits.additionalRequirements && limits.additionalRequirements !== "nil"
          ? limits.additionalRequirements
          : null;

      const outputType = resolveOutputType(currentType, limits);
      const isSign = outputType === "signature";
      const isFace = outputType === "passport";

      setStatusMap((p) => ({ ...p, [currentType]: "formatting" }));
      setProgressMap((p) => ({
        ...p,
        [currentType]: { percent: 0, message: "Starting..." },
      }));

      try {
        const result = await compressImage({
          file,
          minSizeMB: Number(limits.min),
          maxSizeMB: Number(limits.max),
          widthPx: parseSize(limits.width ?? null),
          heightPx: parseSize(limits.height ?? null),
          outputType,
          outputFileName: limits.name || null,
          conditionName: currentType,
          // Scan only applies to pure signature cards (not face/passport)
          scanEnabled: isSign ? scanEnabled : false,
          additionalRequirements,
          onProgress: (percent, message) => {
            setProgressMap((p) => ({
              ...p,
              [currentType]: { percent, message },
            }));
          },
        });

        if (!result.inRange) {
          const minKB = Math.round(Number(limits.min) * 1000);
          const maxKB = Math.round(Number(limits.max) * 1000);
          toast.error(
            `⚠️ ${splitText(currentType)}: Got ${(result.file.size / 1000).toFixed(1)} KB — required ${minKB}–${maxKB} KB. Still available to download.`,
            { position: "top-center", autoClose: 7000 },
          );
        }

        const previewUrl = result.file.type.startsWith("image/")
          ? URL.createObjectURL(result.file)
          : null;

        setCompressedImages((p) => {
          revokeUrl(p[currentType]?.previewUrl);
          return {
            ...p,
            [currentType]: {
              file: result.file,
              originalFile: file,
              downloadUrl: result.downloadUrl,
              inRange: result.inRange,
              sizeKB: (result.file.size / 1000).toFixed(1),
              previewUrl,
              // Mark scanApplied for both signature and face-doc so badge shows
              scanApplied: isSign || isFace,
            },
          };
        });

        setStatusMap((p) => ({ ...p, [currentType]: "done" }));
        setProgressMap((p) => ({
          ...p,
          [currentType]: { percent: 100, message: "Complete!" },
        }));
      } catch (err: any) {
        toast.error(err.message || `Failed to process ${currentType}.`, {
          position: "top-center",
          autoClose: 5000,
        });
        setStatusMap((p) => ({ ...p, [currentType]: "idle" }));
        setProgressMap((p) => ({
          ...p,
          [currentType]: { percent: 0, message: "" },
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleRescan = useCallback(
    (type: string, scannedFile: File, previewUrl: string) => {
      setCompressedImages((p) => {
        revokeUrl(p[type]?.previewUrl);
        return {
          ...p,
          [type]: {
            ...p[type],
            file: scannedFile,
            previewUrl,
            sizeKB: (scannedFile.size / 1000).toFixed(1),
            inRange: null as any,
            scanApplied: true,
          },
        };
      });
    },
    [],
  );

  const handleFileDrop = useCallback(
    (
      type: string,
      mergedSize: DocumentSize,
      file: File,
      scanEnabled?: boolean,
    ) => processFile(type, mergedSize, file, scanEnabled ?? false),
    [processFile],
  );

  const handleUpload = useCallback(
    async (
      type: string,
      mergedSize: DocumentSize,
      pdfFiles?: File[],
      pdfMode?: string,
      scanEnabled?: boolean,
    ) => {
      if (pdfFiles && pdfFiles.length > 0) {
        setStatusMap((p) => ({ ...p, [type]: "formatting" }));
        setProgressMap((p) => ({
          ...p,
          [type]: { percent: 0, message: "Starting..." },
        }));

        const additionalRequirements =
          mergedSize.additionalRequirements &&
          mergedSize.additionalRequirements !== "nil"
            ? mergedSize.additionalRequirements
            : null;

        try {
          let result: any;
          if (pdfMode === "pdf") {
            result = await compressImage({
              file: pdfFiles[0],
              minSizeMB: Number(mergedSize.min),
              maxSizeMB: Number(mergedSize.max),
              widthPx: parseSize(mergedSize.width ?? null),
              heightPx: parseSize(mergedSize.height ?? null),
              outputType: "pdf",
              outputFileName: mergedSize.name || null,
              conditionName: type,
              additionalRequirements,
              onProgress: (pct, msg) =>
                setProgressMap((p) => ({
                  ...p,
                  [type]: { percent: pct, message: msg },
                })),
            });
            result = { ...result, pageCount: 1 };
          } else {
            result = await combineImagesToPdf({
              files: pdfFiles,
              minSizeMB: Number(mergedSize.min),
              maxSizeMB: Number(mergedSize.max),
              outputFileName: mergedSize.name || null,
              conditionName: type,
              onProgress: (pct, msg) =>
                setProgressMap((p) => ({
                  ...p,
                  [type]: { percent: pct, message: msg },
                })),
            });
          }

          if (!result.inRange) {
            const minKB = Math.round(Number(mergedSize.min) * 1000);
            const maxKB = Math.round(Number(mergedSize.max) * 1000);
            toast.error(
              `⚠️ ${splitText(type)}: Got ${(result.file.size / 1000).toFixed(1)} KB — required ${minKB}–${maxKB} KB.`,
              { position: "top-center", autoClose: 7000 },
            );
          }

          setCompressedImages((p) => {
            revokeUrl(p[type]?.previewUrl);
            return {
              ...p,
              [type]: {
                file: result.file,
                downloadUrl: result.downloadUrl,
                inRange: result.inRange,
                sizeKB: (result.file.size / 1000).toFixed(1),
                previewUrl: null,
                pageCount: result.pageCount,
              },
            };
          });
          setStatusMap((p) => ({ ...p, [type]: "done" }));
          setProgressMap((p) => ({
            ...p,
            [type]: { percent: 100, message: "Complete!" },
          }));
        } catch (err: any) {
          toast.error(err.message || `Failed to build PDF for ${type}.`, {
            position: "top-center",
            autoClose: 5000,
          });
          setStatusMap((p) => ({ ...p, [type]: "idle" }));
          setProgressMap((p) => ({
            ...p,
            [type]: { percent: 0, message: "" },
          }));
        }
        return;
      }

      // Regular file-picker flow
      setActiveType(type);
      setActiveMergedSize(mergedSize);
      setScanEnabledPending(scanEnabled ?? false);
      fileInputRef.current?.click();
    },
    [setScanEnabledPending],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeType || !activeMergedSize) return;
      const currentType = activeType,
        limits = activeMergedSize,
        useScan = scanEnabledPending;
      setActiveType(null);
      setActiveMergedSize(null);
      setScanEnabledPending(false);
      e.target.value = "";
      await processFile(currentType, limits, file, useScan);
    },
    [activeType, activeMergedSize, scanEnabledPending, processFile],
  );

  const handleReupload = useCallback((type: string) => {
    setCompressedImages((p) => {
      revokeUrl(p[type]?.previewUrl);
      const c = { ...p };
      delete c[type];
      return c;
    });
    setProgressMap((p) => {
      const c = { ...p };
      delete c[type];
      return c;
    });
    setStatusMap((p) => {
      const c = { ...p };
      delete c[type];
      return c;
    });
  }, []);

  const handleDownloadAll = useCallback(async () => {
    for (const [, data] of Object.entries(compressedImages)) {
      if (!data?.file) continue;
      saveAs(data.file, data.file.name);
      await new Promise((r) => setTimeout(r, 300));
    }
  }, [compressedImages]);

  const hasDownloads = useMemo(
    () => Object.keys(compressedImages).length > 0,
    [compressedImages],
  );

  return (
    <>
      <ToastContainer />
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        examName={examName}
        conditionName={reportConditionName}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {orderedTypes.map((type) => {
          const size = condObj[type];
          if (!size) return null;
          return (
            <DocumentCard
              key={type}
              type={type}
              size={size}
              compressed={compressedImages[type]}
              status={statusMap[type] || "idle"}
              progress={progressMap[type]}
              onUpload={handleUpload}
              onReupload={handleReupload}
              onReport={(n) => {
                setReportConditionName(n);
                setReportModalOpen(true);
              }}
              onFileDrop={handleFileDrop}
              onRescan={handleRescan}
            />
          );
        })}
      </div>
      {hasDownloads && (
        <button
          onClick={handleDownloadAll}
          className="w-full py-3.5 mt-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <Download size={18} /> Download All Documents
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,.pdf"
        hidden
        onChange={handleFileChange}
      />
    </>
  );
}
