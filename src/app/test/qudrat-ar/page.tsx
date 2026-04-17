"use client";

import TestEngine from "@/components/TestEngine";

export default function QudratArTestPage() {
  return (
    <TestEngine
      examCategory="qudrat_ar"
      testMode="comprehensive"
      isTrialTest={false}
    />
  );
}
