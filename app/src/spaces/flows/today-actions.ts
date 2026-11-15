"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { dbKeyOf, isDbKey } from "./today-later";

// Οι κινήσεις της λίστας «Τι πρέπει να κάνω τώρα» στη βάση: «Αργότερα» (today_snoozes) και άνοιγμα γραμμής
// Ειδοποίησης. Η βάση αποφασίζει τι επιτρέπεται· εδώ ελέγχεται μόνο η είσοδος.

const TODAY_PATH = "/app";
const MAX_DAYS = 60 * 86_400_000;
const NOT_SAVED = "Το «Αργότερα» δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
// Η συνάρτηση δεν υπάρχει ακόμα στη βάση (το migration δεν έχει περάσει).
const MISSING_FUNCTION = new Set(["PGRST202", "42883"]);

export interface LaterResult {
  error: string | null;
}

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;

const dbKey = z.string().refine(isDbKey);

const postponeSchema = z.object({
  rowKeys: z.array(z.string().min(1).max(200)).min(1).max(200),
  until: z.number().int(),
  stale: z.array(dbKey).max(400),
});

// Πρώτα με τη δική του ώρα (today_snooze_until)· χωρίς το migration, ως το επόμενο 08:00 (today_snooze).
async function snooze(supabase: Supabase, key: string, until: number) {
  const exact = await supabase.rpc("today_snooze_until", {
    p_key: key,
    p_until: new Date(until).toISOString(),
  });
  if (!exact.error || !MISSING_FUNCTION.has(exact.error.code)) return exact;
  return supabase.rpc("today_snooze", { p_key: key });
}

async function unsnooze(supabase: Supabase, keys: readonly string[]) {
  const results = await Promise.all(
    keys.map((key) => supabase.rpc("today_unsnooze", { p_key: key })),
  );
  return results.find((result) => result.error)?.error ?? null;
}

const failure = (where: string, message: string): LaterResult => {
  console.error(`flows.later.${where}:`, message);
  return { error: NOT_SAVED };
};

export async function postponeRows(input: unknown): Promise<LaterResult> {
  const parsed = postponeSchema.safeParse(input);
  const now = Date.now();
  if (
    !parsed.success ||
    parsed.data.until <= now ||
    parsed.data.until > now + MAX_DAYS
  )
    return { error: "Άγνωστη ώρα για αργότερα." };
  const keys = parsed.data.rowKeys.map((key) =>
    dbKeyOf(key, parsed.data.until),
  );
  if (!keys.every(isDbKey)) return { error: "Άγνωστη γραμμή." };
  const supabase = await createSupabase();
  if (!supabase) return { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
  const stale = parsed.data.stale.filter((key) => !keys.includes(key));
  const removed = await unsnooze(supabase, stale);
  if (removed) return failure("unsnooze", removed.message);
  const results = await Promise.all(
    keys.map((key) => snooze(supabase, key, parsed.data.until)),
  );
  const error = results.find((result) => result.error)?.error;
  if (error) return failure("snooze", error.message);
  revalidatePath(TODAY_PATH);
  return { error: null };
}

export async function restoreRows(input: unknown): Promise<LaterResult> {
  const parsed = z.array(dbKey).min(1).max(400).safeParse(input);
  if (!parsed.success) return { error: "Άγνωστη γραμμή." };
  const supabase = await createSupabase();
  if (!supabase) return { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
  const error = await unsnooze(supabase, parsed.data);
  if (error) return failure("restore", error.message);
  revalidatePath(TODAY_PATH);
  return { error: null };
}

const openSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(50),
  href: z.string().regex(/^\/app(\/|\?|$)/),
});

// Γραμμή Ειδοποίησης: «Άνοιγμα» = όλες οι Ειδοποιήσεις της γραμμής διαβασμένες, μετά στο σχετικό.
export async function openNoticeRow(form: FormData): Promise<void> {
  const parsed = openSchema.safeParse({
    ids: form.getAll("id").map(String),
    href: form.get("href"),
  });
  const supabase = await createSupabase();
  if (!parsed.success || !supabase) redirect("/app/notifications");
  const results = await Promise.all(
    parsed.data.ids.map((id) =>
      supabase.rpc("notification_open", { p_id: id }),
    ),
  );
  const error = results.find((result) => result.error)?.error;
  if (error) console.error("flows.notice.open:", error.message);
  revalidatePath("/app", "layout");
  redirect(
    parsed.data.href.startsWith("//") ? "/app/notifications" : parsed.data.href,
  );
}
