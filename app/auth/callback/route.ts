import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSafeNextPath } from "@/lib/supabase/auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { origin, searchParams } = requestUrl;
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("OAuth error from provider:", errorDescription);

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "oauth_provider_error");
    if (errorDescription) {
      loginUrl.searchParams.set("description", errorDescription);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (!sessionError && data?.session) {
        return NextResponse.redirect(new URL(next, origin));
      }

      if (sessionError) {
        console.error("Session exchange error:", sessionError.message, sessionError.cause);

        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "auth_callback_error");
        loginUrl.searchParams.set("description", sessionError.message);
        return NextResponse.redirect(loginUrl);
      }
    } catch (err) {
      console.error("Unexpected error in auth callback:", err);

      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "auth_callback_error");
      loginUrl.searchParams.set("description", "Unexpected OAuth callback failure");
      return NextResponse.redirect(loginUrl);
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth_callback_error");
  return NextResponse.redirect(loginUrl);
}
