"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthCallback() {
  const router = useRouter();
  const pathname = usePathname();
  const isProcessing = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Only process on auth callback page or if there's a code in URL
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      // Skip if no code or already processing
      if (!code || isProcessing.current) {
        return;
      }

      // Skip if we're not on a page that should handle auth
      if (pathname !== "/auth/callback" && !url.searchParams.has("code")) {
        return;
      }

      isProcessing.current = true;
      console.log("AuthCallback: Processing OAuth code...");

      if (error) {
        console.error("AuthCallback: OAuth error:", error);
        isProcessing.current = false;
        return;
      }

      try {
        const supabase = createClient();

        // Exchange the code for a session using the full URL
        console.log("AuthCallback: Exchanging code for session...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("AuthCallback: Exchange error:", exchangeError.message);
          router.replace(`/login?error=${encodeURIComponent(exchangeError.message)}`);
          return;
        }

        if (data.session) {
          console.log("AuthCallback: Session established for:", data.session.user.email);

          // Clear the URL parameters and redirect to dashboard
          router.replace("/dashboard");
        } else {
          console.error("AuthCallback: No session returned");
          router.replace("/login?error=no_session");
        }
      } catch (err) {
        console.error("AuthCallback: Exception:", err);
        router.replace("/login?error=auth_callback_error");
      } finally {
        isProcessing.current = false;
      }
    };

    handleAuthCallback();
  }, [pathname, router]);

  return null;
}
