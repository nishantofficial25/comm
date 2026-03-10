import { EnrichedExam } from "@/types/exam";
import ExamGrid from "./ExamGrid";

interface Props {
  initialExams: EnrichedExam[];
}

export default function ExamSelectorShell({ initialExams }: Props) {
  return (
      <div className="container mx-auto px-1 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* ExamGrid is Client because of search/filter interactivity */}
          <ExamGrid initialExams={initialExams} />
        </div>
      </div>
  );
}
