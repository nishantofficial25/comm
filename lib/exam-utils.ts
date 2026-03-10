import { ExamMetadata, ScrapedExam, ExamStatus, EnrichedExam } from "@/types/exam";

export const ITEMS_PER_PAGE = 18;

export const STATUS_PRIORITY: Record<string, number> = {
  ACTIVE: 0,
  UPCOMING: 1,
  REST: 2,
};

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getScrapedMeta(examKey: string, scrapedExams: ScrapedExam[]) {
  return scrapedExams.find((e) => e.mappedExamKey === examKey);
}

export function getManualExamData(examKey: string, examMetadata: ExamMetadata[]) {
  return examMetadata.find((e) => e.exam === examKey);
}

export function getLastDate(
  examKey: string,
  examMetadata: ExamMetadata[],
  scrapedExams: ScrapedExam[]
): Date | null {
  const scraped = getScrapedMeta(examKey, scrapedExams);
  if (scraped?.apply_last_date_iso) return new Date(scraped.apply_last_date_iso);
  const manual = getManualExamData(examKey, examMetadata);
  if (manual?.endDate) return new Date(manual.endDate);
  return null;
}

export function hasDate(
  examKey: string,
  examMetadata: ExamMetadata[],
  scrapedExams: ScrapedExam[]
): boolean {
  const scraped = getScrapedMeta(examKey, scrapedExams);
  if (scraped?.apply_last_date || scraped?.apply_start_date_iso) return true;
  const manual = getManualExamData(examKey, examMetadata);
  return !!(manual?.startDate || manual?.endDate);
}

export function getAutoStatus(
  examKey: string,
  examMetadata: ExamMetadata[],
  scrapedExams: ScrapedExam[]
): ExamStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scraped = getScrapedMeta(examKey, scrapedExams);
  let startDate: Date | null = null;
  let lastDate: Date | null = null;

  if (scraped) {
    startDate = scraped.apply_start_date_iso ? new Date(scraped.apply_start_date_iso) : null;
    lastDate = scraped.apply_last_date_iso ? new Date(scraped.apply_last_date_iso) : null;
  } else {
    const manual = getManualExamData(examKey, examMetadata);
    if (manual?.startDate) startDate = new Date(manual.startDate);
    if (manual?.endDate) lastDate = new Date(manual.endDate);
  }

  if (!lastDate || lastDate < today) return "REST";
  if (startDate && startDate <= today && lastDate >= today) return "ACTIVE";
  if (startDate && startDate > today) return "UPCOMING";
  return "REST";
}

export function getCombinedStatus(
  examKey: string,
  examMetadata: ExamMetadata[],
  scrapedExams: ScrapedExam[]
): ExamStatus {
  const autoStatus = getAutoStatus(examKey, examMetadata, scrapedExams);
  if (autoStatus !== "REST") return autoStatus;

  const manualStatus = examMetadata.find((e) => e.exam === examKey)?.status;
  if (manualStatus === "Forms Out") return "ACTIVE";
  if (manualStatus === "Notification out") return "UPCOMING";
  return "REST";
}

export function buildEnrichedExams(
  examMetadata: ExamMetadata[],
  scrapedExams: ScrapedExam[]
): EnrichedExam[] {
  return examMetadata.map((item) => ({
    exam: item.exam,
    status: getCombinedStatus(item.exam, examMetadata, scrapedExams),
    lastDate: getLastDate(item.exam, examMetadata, scrapedExams),
    hasDates: hasDate(item.exam, examMetadata, scrapedExams),
    hasConditions: item.hasConditions ?? false,
  }));
}

export function sortEnrichedExams(enriched: EnrichedExam[]): EnrichedExam[] {
  return [...enriched].sort((a, b) => {
    const statusDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
    if (statusDiff !== 0) return statusDiff;
    if (a.hasDates && !b.hasDates) return -1;
    if (!a.hasDates && b.hasDates) return 1;
    if (a.hasDates && b.hasDates) {
      if (a.lastDate && b.lastDate) return a.lastDate.getTime() - b.lastDate.getTime();
      if (a.lastDate) return -1;
      if (b.lastDate) return 1;
    }
    return a.exam.localeCompare(b.exam);
  });
}