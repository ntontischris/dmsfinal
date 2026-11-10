"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import { itemKeySchema, itemKeysSchema, prefsSchema } from "./schemas";

const UNCONFIGURED_TEXT = "Η βάση δεν έχει συνδεθεί ακόμα.";
const TODAY_PATH = "/app";

// Ο κανόνας της βάσης (P0001) γράφεται ήδη στα ελληνικά· τα υπόλοιπα μεταφράζονται εδώ.
const messageOf = (error: { code?: string; message: string }): string => {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "Δεν έχεις Δικαίωμα για αυτή την ενέργεια.";
  console.error("today", error.message);
  return "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
};

async function callRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<FormState | null> {
  const supabase = await createSupabase();
  if (!supabase) return { error: UNCONFIGURED_TEXT };
  const { error } = await supabase.rpc(name, args);
  return error ? { error: messageOf(error) } : null;
}

// «Αποθήκευση» της Προσαρμογής: σειρά και κρυφές. Μετά η σελίδα κλείνει την Προσαρμογή.
export async function saveTodayPrefs(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = prefsSchema.safeParse({
    order: form.getAll("order").map(String),
    hidden: form.getAll("hidden").map(String),
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Έλεγξε τις κάρτες." };
  const failure = await callRpc("today_prefs_set", {
    p_order: parsed.data.order,
    p_hidden: parsed.data.hidden,
  });
  if (failure) return failure;
  revalidatePath(TODAY_PATH);
  redirect(TODAY_PATH);
}

// «Επαναφορά προεπιλογής»: η κοινή σειρά, καμία κρυφή.
export async function resetTodayPrefs(): Promise<FormState> {
  const failure = await callRpc("today_prefs_reset", {});
  if (failure) return failure;
  revalidatePath(TODAY_PATH);
  redirect(TODAY_PATH);
}

// «Αργότερα» μιας απόφασης (#241 Σ8): κρύβεται ως αύριο το πρωί (08:00 Αθήνας) μόνο για τον ίδιο τον Χρήστη.
export async function snoozeTodayItem(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const key = itemKeySchema.safeParse(form.get("key"));
  if (!key.success) return { error: "Άγνωστη απόφαση." };
  const failure = await callRpc("today_snooze", { p_key: key.data });
  if (failure) return failure;
  revalidatePath(TODAY_PATH);
  return { notice: "Για αργότερα." };
}

// «Αναίρεση»: οι αποφάσεις που κρύφτηκαν ξαναφαίνονται αμέσως.
export async function unsnoozeTodayItems(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const keys = itemKeysSchema.safeParse(form.getAll("key").map(String));
  if (!keys.success) return { error: "Άγνωστη απόφαση." };
  const failures = await Promise.all(
    keys.data.map((key) => callRpc("today_unsnooze", { p_key: key })),
  );
  const failure = failures.find((item) => item !== null);
  if (failure) return failure;
  revalidatePath(TODAY_PATH);
  return { notice: "Ξαναφαίνονται." };
}
