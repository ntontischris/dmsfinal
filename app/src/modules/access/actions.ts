"use server";

import { isAuthWeakPasswordError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createSupabase } from "@/lib/supabase/server";

import { claimOnEntry } from "./claim";
import { readDemoLogins } from "./demo";
import { appOrigin as origin } from "@/lib/app-origin";
import { contextFromAmr, LINK_EXPIRED, passwordChangeError } from "./password-change";
import { changePasswordSchema, emailSchema, loginSchema, newPasswordSchema, safeNext, type FormState } from "./schemas";

// Οι ενέργειες εισόδου (R9, R10). Κανένα μήνυμα δεν αποκαλύπτει αν υπάρχει λογαριασμός (κεφ. 9).

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα. Δοκίμασε ξανά αργότερα." };
const LINK_SENT = "Αν το email έχει λογαριασμό, σου στείλαμε σύνδεσμο. Ισχύει 24 ώρες.";

const callbackUrl = async (next: string): Promise<string> =>
  `${origin()}/auth/callback?next=${encodeURIComponent(next)}`;

const firstError = (issues: readonly { message: string }[]): FormState => ({ error: issues[0]?.message });

export async function signInWithPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return firstError(parsed.error.issues);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Μόνο ο κωδικός του σφάλματος στα logs, ποτέ το email.
    console.error("signInWithPassword", error.status, error.code);
    return { error: "Λάθος email ή κωδικός." };
  }
  await claimOnEntry(supabase);
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

// «Δες ως…» (demo.ts): ο κωδικός και το email δεν φτάνουν ποτέ στον browser.
export async function signInAsDemo(form: FormData): Promise<void> {
  const login = readDemoLogins()[Number(form.get("demo"))];
  const password = process.env.DEMO_LOGIN_PASSWORD;
  const supabase = await createSupabase();
  if (!login || !password || !supabase) redirect("/login?error=demo");

  const { error } = await supabase.auth.signInWithPassword({ email: login.email, password });
  if (error) {
    console.error("signInAsDemo", error.status, error.code);
    redirect("/login?error=demo");
  }
  await claimOnEntry(supabase);
  redirect("/app");
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

// Το πλαίσιο (σύνδεσμος ή Προφίλ) βγαίνει από το επαληθευμένο token, ποτέ από τη φόρμα.
export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return { error: LINK_EXPIRED };
  const context = contextFromAmr(claims.amr);

  const fields = { password: form.get("password"), confirm: form.get("confirm"), current: form.get("current") };
  const parsed = (context === "profile" ? changePasswordSchema : newPasswordSchema).safeParse(fields);
  if (!parsed.success) return firstError(parsed.error.issues);

  const { password } = parsed.data;
  const current = context === "profile" ? String(fields.current) : undefined;
  const { error } = await supabase.auth.updateUser(current ? { password, current_password: current } : { password });
  if (error) {
    // Μόνο κωδικός και status του σφάλματος στα logs, ποτέ ο κωδικός.
    console.error("updateUser", error.status, error.code);
    const reasons = isAuthWeakPasswordError(error) ? error.reasons : [];
    return passwordChangeError({ code: error.code, name: error.name, reasons });
  }
  if (context === "profile") return { notice: "Ο κωδικός άλλαξε." };
  await claimOnEntry(supabase);
  redirect("/app");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
