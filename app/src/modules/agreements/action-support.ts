import { revalidatePath } from "next/cache";
import type { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

// Κοινά βοηθητικά των actions-*.ts. Δεν είναι αρχείο "use server": εξάγει και σταθερές.
// Δικό μας αντίγραφο (ένα module δεν εισάγει εσωτερικά ένα άλλο).

export const UNCONFIGURED: FormState = {
  error: "Η βάση δεν έχει συνδεθεί ακόμα.",
};

const UNIQUE_MESSAGES: readonly (readonly [string, string])[] = [
  ["agreements_opportunity_id_key", "Η Ευκαιρία έχει ήδη Συμφωνία."],
  ["agreement_recipients_email", "Ο ίδιος παραλήπτης μπαίνει μία φορά."],
];

const uniqueMessage = (message: string): string =>
  UNIQUE_MESSAGES.find(([needle]) => message.includes(needle))?.[1] ??
  "Υπάρχει ήδη αυτή η τιμή.";

// Ο κανόνας της βάσης (P0001) γράφεται ήδη στα ελληνικά και δείχνεται όπως είναι· τα υπόλοιπα μεταφράζονται εδώ.
export const messageOf = (error: {
  code?: string;
  message: string;
}): string => {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501")
    return "Δεν έχεις Δικαίωμα για αυτή την ενέργεια.";
  if (error.code === "23514")
    return "Μια τιμή δεν είναι έγκυρη. Έλεγξε τα πεδία.";
  if (error.code === "23505") return uniqueMessage(error.message);
  console.error("agreements", error.message);
  return "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
};

export const firstIssue = (error: z.ZodError): FormState => ({
  error: error.issues[0]?.message,
});

// Κενό κείμενο όταν το πεδίο λείπει: για πεδία που η φόρμα στέλνει πάντα.
export const pick = (
  form: FormData,
  keys: readonly string[],
): Record<string, string> =>
  Object.fromEntries(keys.map((key) => [key, String(form.get(key) ?? "")]));

// Μόνο τα πεδία που υπάρχουν στη φόρμα: η D2 δείχνει ένα πεδίο μόνο σε όποιον μπορεί να το αλλάξει,
// άρα απουσία σημαίνει «μην το αγγίξεις», ενώ το κενό κείμενο είναι πραγματική τιμή.
export const pickPresent = (
  form: FormData,
  keys: readonly string[],
): Record<string, string> =>
  Object.fromEntries(
    keys
      .filter((key) => form.has(key))
      .map((key) => [key, String(form.get(key))]),
  );

export const refreshAgreements = (): void => revalidatePath("/app", "layout");

export type RpcOutcome =
  { ok: true; data: unknown } | { ok: false; state: FormState };

// Μία κλήση RPC: όλες οι εγγραφές του module περνούν από εδώ (η βάση αποφασίζει, εδώ μεταφράζεται η άρνηση).
export async function callRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<RpcOutcome> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, state: UNCONFIGURED };
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { ok: false, state: { error: messageOf(error) } };
  return { ok: true, data };
}

// Επιτυχία: φρεσκάρει τις οθόνες και δίνει το μήνυμα· αποτυχία: το μήνυμα λάθους όπως ήρθε.
export const finishWith = (outcome: RpcOutcome, notice: string): FormState => {
  if (!outcome.ok) return outcome.state;
  refreshAgreements();
  return { notice };
};

export interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

// Το κοινό σχήμα κάθε ενέργειας: έλεγχος φόρμας → μία κλήση RPC → μήνυμα. Λάθος φόρμας δεν φτάνει ποτέ στη βάση.
export async function perform<T>(
  parsed: z.ZodSafeParseResult<T>,
  build: (data: T) => RpcCall,
  notice: string | ((data: T) => string),
): Promise<FormState> {
  if (!parsed.success) return firstIssue(parsed.error);
  const call = build(parsed.data);
  const text = typeof notice === "string" ? notice : notice(parsed.data);
  return finishWith(await callRpc(call.name, call.args), text);
}
