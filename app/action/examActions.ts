// app/actions/examActions.ts
// Plain async server utilities — called from Server Components.

const API_BASE = process.env.API_BASE;

export interface ExamCondition {
  [key: string]: {
    min: number;
    max: number;
    width?: string | null;
    height?: string | null;
    type?: string;
    name?: string | null;
    category?: string;
  };
}

export interface ExamData {
  cond?: ExamCondition[] | ExamCondition;
  notificationUrl?: string;
  applyUrl?: string;
  [key: string]: any;
}

export interface ScrapedExamData {
  notification_link?: string;
  apply_online_link?: string;
  apply_start_date_iso?: string;
  apply_last_date_iso?: string;
}

export interface ExamPageData {
  examData: ExamData | null;
  scrapedData: ScrapedExamData | null;
  notificationUrl: string;
  applyLink: string;
  examStatus: ExamStatus | null;
  orderedTypes: string[];
  condObj: ExamCondition | null;
}

export interface ExamStatus {
  type: "ACTIVE" | "UPCOMING";
  daysLeft: number;
  label: string;
}

export function calculateExamStatus(
  examData: ExamData | null,
  scrapedData: ScrapedExamData | null,
): ExamStatus | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  if (scrapedData) {
    startDate = scrapedData.apply_start_date_iso
      ? new Date(scrapedData.apply_start_date_iso)
      : null;
    endDate = scrapedData.apply_last_date_iso
      ? new Date(scrapedData.apply_last_date_iso)
      : null;
  } else if (examData) {
    startDate = examData.startDate ? new Date(examData.startDate) : null;
    endDate = examData.endDate ? new Date(examData.endDate) : null;
  }

  if (!endDate) return null;
  const d = Math.ceil(
    (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (d < 0) return null;
  if (startDate && startDate <= today && endDate >= today)
    return { type: "ACTIVE", daysLeft: d, label: "Forms Out" };
  if (startDate && startDate > today)
    return {
      type: "UPCOMING",
      daysLeft: Math.ceil(
        (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      ),
      label: "Upcoming",
    };
  return null;
}

function extractCondObj(examData: ExamData): ExamCondition | null {
  const raw = examData?.cond;
  if (!raw) return null;
  // API returns either array [{ photo:{}, sig:{}, _order:[] }] or plain object
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === "object") return raw as ExamCondition;
  return null;
}

function extractOrderedTypes(condObj: ExamCondition): string[] {
  if (Array.isArray((condObj as any)._order)) return (condObj as any)._order;
  return Object.keys(condObj).filter((k) => k !== "_order");
}

/**
 * Mirrors the original useExamData hook exactly:
 * - Fetches both endpoints in parallel
 * - Does NOT check cRes.ok before parsing (original didn't either)
 * - sData is null if scraped endpoint fails
 */
export async function fetchExamPageData(
  examName: string,
): Promise<ExamPageData> {
  const empty: ExamPageData = {
    examData: null,
    scrapedData: null,
    notificationUrl: "",
    applyLink: "",
    examStatus: null,
    orderedTypes: [],
    condObj: null,
  };
  const toSlug = (name: string) => {
    return name
      .toString()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  let examData: ExamData | null = null;
  let scrapedData: ScrapedExamData | null = null;

  try {
    const [cRes, sRes] = await Promise.all([
      fetch(`${API_BASE}/api/conditions/${toSlug(examName)}`, {
        next: { revalidate: 300 },
      }),
      fetch(
        `${API_BASE}/api/admin/scraped-exams/${encodeURIComponent(examName)}`,
        {
          next: { revalidate: 300 },
        },
      ),
    ]);

    // Original calls .json() unconditionally on cRes
    examData = await cRes.json();
    // Original only parses sData if sRes.ok
    scrapedData = sRes.ok ? await sRes.json() : null;
  } catch (e) {
    console.error("[fetchExamPageData] Fetch failed for:", examName, e);
    return empty;
  }

  if (!examData) return empty;

  const notificationUrl =
    examData.notificationUrl || scrapedData?.notification_link || "";
  const applyLink = scrapedData?.apply_online_link || examData.applyUrl || "";
  const examStatus = calculateExamStatus(examData, scrapedData);
  const condObj = extractCondObj(examData);

  if (!condObj) {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      console.warn(
        "[fetchExamPageData] condObj is null. examData:",
        JSON.stringify(examData, null, 2),
      );
    }
    return {
      ...empty,
      examData,
      scrapedData,
      notificationUrl,
      applyLink,
      examStatus,
    };
  }

  const orderedTypes = extractOrderedTypes(condObj);

  return {
    examData,
    scrapedData,
    notificationUrl,
    applyLink,
    examStatus,
    orderedTypes,
    condObj,
  };
}
