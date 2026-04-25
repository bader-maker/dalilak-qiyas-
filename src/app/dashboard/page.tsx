"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy /dashboard route.
 *
 * The dashboard has been split into two focused routes:
 *   /qudrat   → Aptitude tests (Qudrat + GAT)
 *   /tahsili  → Achievement tests (Tahsili + SAAT)
 *
 * /dashboard now redirects to whichever of those the user visited last
 * (persisted in localStorage under "lastDashboardRoute"), defaulting
 * to /qudrat. The URL is preserved so any external links / bookmarks
 * to /dashboard keep working.
 */
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    let target = "/qudrat";
    if (typeof window !== "undefined") {
      const last = window.localStorage.getItem("lastDashboardRoute");
      if (last === "/qudrat" || last === "/tahsili") target = last;
    }
    router.replace(target);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9] dark:bg-gray-900" dir="rtl">
      <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
        <div className="w-10 h-10 border-2 border-[#006C35] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <p className="text-sm">جاري التحويل...</p>
      </div>
    </div>
  );
}
