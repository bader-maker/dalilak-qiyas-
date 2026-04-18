import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Get the origin for redirects, honoring proxy headers so we don't leak
  // the internal host (e.g. 0.0.0.0:5000) when behind Replit's proxy.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const proto = forwardedProto ?? (host.includes("localhost") || host.includes("0.0.0.0") ? "http" : "https");
  const origin = `${proto}://${host}`;

  console.log("=== OAuth Callback ===");
  console.log("URL:", request.url);
  console.log("Code present:", !!code);
  console.log("Error:", error);
  console.log("Origin:", origin);

  // Handle OAuth errors from provider
  if (error) {
    console.error("OAuth Error:", error, error_description);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error_description || error)}`
    );
  }

  if (!code) {
    console.error("No code provided");
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set(name, value, options);
              }
            } catch (err) {
              console.error("Cookie set error:", err);
            }
          },
        },
      }
    );

    console.log("Exchanging code for session...");

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Exchange error:", exchangeError.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.session) {
      console.error("No session returned");
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    console.log("Session created for:", data.session.user.email);
    console.log("Redirecting to:", next);

    // Successful authentication - redirect to dashboard
    return NextResponse.redirect(`${origin}${next}`);

  } catch (err) {
    console.error("Callback exception:", err);
    return NextResponse.redirect(`${origin}/login?error=callback_error`);
  }
}
