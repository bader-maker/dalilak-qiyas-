"use client";

import TestEngine from "@/components/TestEngine";

export default function SAATTestPage() {
  return (
    <TestEngine
      examCategory="saat_en"
      testMode="comprehensive"
      questionLimit={40}
      timeLimit={60}
      isTrialTest={true}
    />
  );
}
