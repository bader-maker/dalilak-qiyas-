"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TestEngine from "@/components/TestEngine";

const ALLOWED_TAHSILI_SECTIONS = ["math_ar", "physics_ar", "chemistry_ar", "biology_ar"] as const;
type TahsiliSection = typeof ALLOWED_TAHSILI_SECTIONS[number];

function TahsiliArTestContent() {
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get("subject");
  const isValidSubject = (value: string | null): value is TahsiliSection =>
    value !== null && (ALLOWED_TAHSILI_SECTIONS as readonly string[]).includes(value);

  if (isValidSubject(subjectParam)) {
    return (
      <TestEngine
        examCategory="tahsili_ar"
        testMode="section"
        selectedSection={subjectParam}
        isTrialTest={false}
      />
    );
  }

  return (
    <TestEngine
      examCategory="tahsili_ar"
      testMode="comprehensive"
      isTrialTest={false}
    />
  );
}

export default function TahsiliArTestPage() {
  return (
    <Suspense fallback={null}>
      <TahsiliArTestContent />
    </Suspense>
  );
}
