export interface ExamMetadata {
  exam: string;
  status?: string;
  hasConditions?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ScrapedExam {
  mappedExamKey: string;
  apply_start_date_iso?: string;
  apply_last_date_iso?: string;
  apply_last_date?: string;
  apply_start_date?: string;
}

export type ExamStatus = "ACTIVE" | "UPCOMING" | "REST";
export type StatusFilter = "ALL" | "ACTIVE" | "UPCOMING";

export interface EnrichedExam {
  exam: string;
  status: ExamStatus;
  lastDate: Date | null;
  hasDates: boolean;
  hasConditions: boolean;
}

export interface ExamStats {
  total: number;
  totalAll: number;
  active: number;
  upcoming: number;
  rest: number;
}