"use client";

import { Suspense } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TrainingProvider } from "@/contexts/TrainingContext";
import { AuthCallback } from "@/components/AuthCallback";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TrainingProvider>
          <Suspense fallback={null}>
            <AuthCallback />
          </Suspense>
          {children}
        </TrainingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
