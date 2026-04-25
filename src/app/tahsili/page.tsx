"use client";

import { useEffect } from "react";
import DashboardView from "@/components/DashboardView";

/**
 * Achievement route — Tahsili (Arabic) + SAAT (English).
 *
 * Mounts the shared DashboardView with examType locked to "tahsili".
 * All practice/test routing, examType / tahsiliType / practiceHref logic,
 * TestEngine usage, and API/AI calls are unchanged — they live inside
 * DashboardView and are reused as-is.
 */
export default function TahsiliPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lastDashboardRoute", "/tahsili");
    }
  }, []);

  return <DashboardView lockedExamType="tahsili" />;
}
