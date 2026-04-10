import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    console.error("[Auth Callback] No code provided in callback URL");
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Auth Callback] Exchange code failed:", error.message);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(error.message)}`
      );
    }

    // Successful auth — redirect to intended destination
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error("[Auth Callback] Unexpected error:", err);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(err instanceof Error ? err.message : "Unknown error")}`
    );
  }
}
