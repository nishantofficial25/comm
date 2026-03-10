import { ExamMetadata, ScrapedExam } from "@/types/exam";

const API_BASE = process.env.API_BASE;

export async function fetchExamMetadata(): Promise<ExamMetadata[]> {
  const res = await fetch(`${API_BASE}/api/exam-metadata`, {
    next: { revalidate: 300 }, // Revalidate every 5 minutes (ISR)
  });
  if (!res.ok) throw new Error("Failed to fetch exam metadata");
  return res.json();
}

export async function fetchScrapedExams(): Promise<ScrapedExam[]> {
  const res = await fetch(`${API_BASE}/api/admin/scraped-exams`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("Failed to fetch scraped exams");
  return res.json();
}

// Submit exam request — called via Server Action
export async function submitExamRequest(data: {
  examName: string;
  message: string | null;
  requestedAt: string;
}) {
  const res = await fetch(`${API_BASE}/api/requestexam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  return res.ok;
}
