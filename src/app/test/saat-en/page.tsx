"use client";

import TestEngine from "@/components/TestEngine";

export default function SAATEnTestPage() {
  return (
    <TestEngine
      examCategory="saat_en"
      testMode="comprehensive"
      isTrialTest={false}
    />
  );
}
