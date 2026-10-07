"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabase } from "@/lib/supabase/server";

import { emailSchema, loginSchema, newPasswordSchema, safeNext, type FormState } from "./schemas";

// Οι ενέργειες εισόδου (R9, R10). Κανένα μήνυμα δεν αποκαλύπτει αν υπάρχει λογαριασμός (κεφ. 9).

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα. Δοκίμασε ξανά αργότερα." };
const LINK_SENT = "Αν το email έχει λογαριασμό, σου στείλαμε σύνδεσμο. Ισχύει 1 ώρα.";

async function origin(): Promise<string> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const callbackUrl = async (next: string): Promise<string> =>
  `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`;

const firstError = (issues: readonly { message: string }[]): FormState => ({ error: issues[0]?.message });

export async function signInWithPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return firstError(parsed.error.issues);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Λάθος email ή κωδικός." };
  const { error: claimError } = await supabase.rpc("claim_first_owner");
  if (claimError) console.error("claim_first_owner", claimError.message);
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function sendMagicLink(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return firstError(parsed.error.issues);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: false, emailRedirectTo: await callbackUrl(safeNext(String(form.get("next") ?? ""))) },
  });
  if (error) console.error("signInWithOtp", error.message);
  return { notice: LINK_SENT };
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  const supabase = await createSupabase();
  if (!supabase) redirect("/login");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(safeNext(String(form.get("next") ?? ""))) },
  });
  if (error || !data.url) {
    console.error("signInWithOAuth", error?.message);
    redirect("/login?error=google");
  }
  redirect(data.url);
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return firstError(parsed.error.issues);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: await callbackUrl("/auth/set-password"),
  });
  if (error) console.error("resetPasswordForEmail", error.message);
  return { notice: LINK_SENT };
}

export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return firstError(parsed.error.issues);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("updateUser", error.message);
    return { error: "Ο σύνδεσμος έληξε ή ο κωδικός δεν έγινε δεκτός. Ζήτησε νέο σύνδεσμο." };
  }
  const { error: claimError } = await supabase.rpc("claim_first_owner");
  if (claimError) console.error("claim_first_owner", claimError.message);
  redirect("/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
