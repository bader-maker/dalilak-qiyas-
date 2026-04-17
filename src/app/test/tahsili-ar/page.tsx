"use client";

import TestEngine from "@/components/TestEngine";

export default function TahsiliArTestPage() {
  return (
    <TestEngine
      examCategory="tahsili_ar"
      testMode="comprehensive"
      isTrialTest={false}
    />
  );
}
