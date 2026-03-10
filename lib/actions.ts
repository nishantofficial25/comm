"use server";

import { submitExamRequest } from "@/lib/exam-api";

export async function submitRequest(formData: FormData) {
  return submitExamRequest({
    examName: formData.get("examName") as string,
    message: (formData.get("message") as string) || null,
    requestedAt: new Date().toISOString(),
  });
}