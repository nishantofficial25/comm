// ── [TYPE-002] types/exam-detail.ts ──────────────────────────────────────────

export interface ExamConditionSize {
  min: number;
  max: number;
  width?: string;
  height?: string;
  type?: string;
  name?: string;
  category?: string;
}

export interface ExamConditions {
  cond: Array<Record<string, ExamConditionSize> & { _order?: string[] }>;
  notificationUrl?: string;
  applyUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface ScrapedExamDetail {
  mappedExamKey: string;
  notification_link?: string;
  apply_online_link?: string;
  apply_start_date_iso?: string;
  apply_last_date_iso?: string;
}

export interface ExamStatus {
  type: "ACTIVE" | "UPCOMING";
  daysLeft: number;
  label: string;
}

export interface CompressedImageData {
  file: File;
  originalFile?: File;
  downloadUrl?: string;
  inRange: boolean | null;
  sizeKB: string;
  previewUrl: string | null;
  scanApplied?: boolean;
  pageCount?: number;
}

export interface ExamDetailPageData {
  examConditions: ExamConditions | null;
  notificationUrl: string;
  applylink: string;
  examStatus: ExamStatus | null;
}

export interface PdfPage {
  id: number;
  name: string;
  file: File;
  previewUrl: string | null;
}

export type PdfMode = "choose" | "pdf" | "images";

export interface ScanParams {
  threshold: number;
  openIter: number;
  closeIter: number;
  inkBoost: number;
  cropPad: number;
  autoCrop: boolean;
  removeSpeckle: boolean;
  unsharp: boolean;
}