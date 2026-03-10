import type { Metadata } from "next";
import { fetchExamMetadata } from "@/lib/exam-api";
import ShowCondition from "../components/ShowConditions/showCondition";
import HeroSection from "../components/ShowConditions/examdetailherosection";
import { notFound } from "next/navigation";
interface Props {
  params: Promise<{ slug: string }>;
}
const toSlug = (name: string) =>
  name
    .toString()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function getExamNameFromSlug(slug: string) {
  if (slug === "custom") return "custom";

  const data = await fetchExamMetadata();
  const exam = data.find((item) => toSlug(item.exam) === slug);

  return exam?.exam || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const examName = await getExamNameFromSlug(slug);

  if (!examName || examName === "custom") {
    return { title: "SahiPhoto | Custom Resizer" };
  }

  return {
    title: `${examName} 2026 All documents Resizer for free | SahiPhoto`,
    description: `Resize your photo and signature for ${examName} as per official requirements.`,
  };
}

export default async function ExamPage({ params }: Props) {
  const { slug } = await params;

  const examName = await getExamNameFromSlug(slug);

  if (!examName) {
    notFound();
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <HeroSection selectedExam={examName} />
      <ShowCondition selectedExam={examName} />
    </main>
  );
}
