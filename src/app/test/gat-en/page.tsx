"use client";

import TestEngine from "@/components/TestEngine";

export default function GATEnTestPage() {
  return (
    <TestEngine
      examCategory="gat_en"
      testMode="comprehensive"
      isTrialTest={false}
    />
  );
}
