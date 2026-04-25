"use client";

import { useEffect } from "react";
import DashboardView from "@/components/DashboardView";

/**
 * Aptitude route — Qudrat (Arabic) + GAT (English).
 *
 * Mounts the shared DashboardView with examType locked to "qudurat".
 * All practice/test routing, examType / quduratType / practiceHref logic,
 * TestEngine usage, and API/AI calls are unchanged — they live inside
 * DashboardView and are reused as-is.
 */
export default function QudratPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("lastDashboardRoute", "/qudrat");
    }
  }, []);

  return <DashboardView lockedExamType="qudurat" />;
}
