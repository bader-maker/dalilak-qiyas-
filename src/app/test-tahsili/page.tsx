"use client";

import TestEngine from "@/components/TestEngine";

export default function TahsiliTestPage() {
  return (
    <TestEngine
      examCategory="tahsili_ar"
      testMode="comprehensive"
      questionLimit={40}
      timeLimit={60}
      isTrialTest={true}
    />
  );
}
