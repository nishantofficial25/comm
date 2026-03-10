// lib/types.ts
// Shared types used by both client and server code.

export interface DocumentSize {
  min: number;
  max: number;
  width?: string | null;
  height?: string | null;
  type?: string;
  name?: string | null;
  category?: string;
  additionalRequirements?: string;
}

export interface CompressedImageData {
  file: File;
  originalFile?: File;
  downloadUrl: string;
  inRange: boolean;
  sizeKB: string;
  previewUrl: string | null;
  scanApplied?: boolean;
  pageCount?: number;
}

export interface ProgressState {
  percent: number;
  message: string;
}

export type DocumentStatus = "idle" | "uploading" | "formatting" | "done";

export interface PdfPage {
  id: number;
  name: string;
  file: File;
  previewUrl: string | null;
}

export interface SizeOverrides {
  min: string;
  max: string;
  width: string;
  height: string;
  dimensionUnit: "cm" | "px";
  name: string;
  additionalRequirements?: string;
}
