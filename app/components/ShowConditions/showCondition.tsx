// components/ShowCondition.tsx
// Server Component — fetches data on the server, renders static shell.

import { Suspense } from "react";
import { fetchExamPageData } from "../../action/examActions";
import ExamHeader from "./ExamHeader";
import ShowConditionClient from "./ShowConditionClient";
import CustomResizerPanelLazy from "./Customresizerpanellazy";
import ExamSEOSection from "../bottomSeo/Examseosection";

interface Props {
  selectedExam: string;
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-500">Loading exam details…</p>
      </div>
    </div>
  );
}

async function ExamContent({ selectedExam }: Props) {
  const data = await fetchExamPageData(selectedExam);

  if (!data.condObj || data.orderedTypes.length === 0) {
    const isDev = process.env.NODE_ENV === "development";
    return (
      <div className="space-y-3">
        <p className="text-center py-6 text-gray-500 text-sm">
          {selectedExam == null ? (
            <>
              <span className="text-3xl shrink-0">⚠️</span>
              <span>
                No Exam Available for this URL, try selecting one from{" "}
              </span>
              <a
                href="/"
                style={{
                  color: "green",
                  textDecoration: "underline dotted green 1px",
                }}
              >
                sahiphoto.in
              </a>
            </>
          ) : (
            `No document requirements found for &ldquo;${selectedExam}&rdquo;.`
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">
        {selectedExam} Photo and Signature Resizer - Official Requirements{" "}
        {new Date().getFullYear()}
      </h1>

      <ExamHeader
        examName={selectedExam}
        docCount={data.orderedTypes.length}
        examStatus={data.examStatus}
        notificationUrl={data.notificationUrl}
        applyLink={data.applyLink}
      />

      <ShowConditionClient
        examName={selectedExam}
        orderedTypes={data.orderedTypes}
        condObj={data.condObj as Record<string, any>}
      />
    </>
  );
}

export default async function ShowCondition({ selectedExam }: Props) {
  const data = await fetchExamPageData(selectedExam);
  if (selectedExam === "custom") {
    return <CustomResizerPanelLazy />;
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ExamContent selectedExam={selectedExam} />
      <ExamSEOSection
        examName={selectedExam}
        examConditions={data.condObj}
      ></ExamSEOSection>
    </Suspense>
  );
}
