import { fetchExamMetadata, fetchScrapedExams } from "@/lib/exam-api";
import { buildEnrichedExams, sortEnrichedExams } from "@/lib/exam-utils";
import ExamSelectorShell from "@/components/exam-selector/ExamSelectorShell";
import HomePage from "./home/page";
import WhyChooseUs from "./home/WhyChooseUs";

export default async function Home() {
  // ✅ These run on the server — zero client bundle impact
  const [examMetadata, scrapedExams] = await Promise.all([
    fetchExamMetadata(),
    fetchScrapedExams(),
  ]);

  const enriched = buildEnrichedExams(examMetadata, scrapedExams);
  const sorted = sortEnrichedExams(enriched);

  return (
    <>
        <HomePage></HomePage>
        <ExamSelectorShell initialExams={sorted} />
        <WhyChooseUs></WhyChooseUs>
    </>
  );
}
