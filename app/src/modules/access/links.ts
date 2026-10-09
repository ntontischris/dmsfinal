import { NextResponse, type NextRequest } from "next/server";

import { createSupabase } from "@/lib/supabase/server";

import { claimOnEntry } from "./claim";
import { safeNext } from "./schemas";

// Πού πηγαίνει ο Χρήστης αφού ανοίξει έναν σύνδεσμο από email (πρόσκληση, είσοδο, επαναφορά, Google).
const SET_PASSWORD = "/auth/set-password";

const targetOf = (next: string | null, mustSetPassword: boolean): string =>
  mustSetPassword || next === SET_PASSWORD ? SET_PASSWORD : safeNext(next);

const expired = (request: NextRequest): NextResponse =>
  NextResponse.redirect(new URL("/login?error=link", request.url));

// PKCE: ο σύνδεσμος φέρνει ?code= (είσοδος με email, Google, επαναφορά κωδικού).
export async function handleCodeLink(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const supabase = await createSupabase();
  if (!supabase || !code) return expired(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return expired(request);
  await claimOnEntry(supabase);
  return NextResponse.redirect(new URL(targetOf(request.nextUrl.searchParams.get("next"), false), request.url));
}

// Πρότυπα email του Supabase με token_hash (πρόσκληση και επαναφορά): /auth/confirm?token_hash=…&type=…
const OTP_TYPES = ["invite", "recovery", "magiclink", "email", "signup", "email_change"] as const;
type OtpType = (typeof OTP_TYPES)[number];
const isOtpType = (value: string | null): value is OtpType => OTP_TYPES.some((type) => type === value);

export async function handleTokenLink(request: NextRequest): Promise<NextResponse> {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const supabase = await createSupabase();
  if (!supabase || !tokenHash || !isOtpType(type)) return expired(request);
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return expired(request);
  await claimOnEntry(supabase);
  const mustSetPassword = type === "invite" || type === "recovery";
  return NextResponse.redirect(new URL(targetOf(request.nextUrl.searchParams.get("next"), mustSetPassword), request.url));
}
