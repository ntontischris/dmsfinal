import { revalidatePath } from "next/cache";
import type { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

// Κοινά βοηθητικά των actions-*.ts. Δεν είναι αρχείο "use server": εξάγει και σταθερές.

export const UNCONFIGURED: FormState = {
  error: "Η βάση δεν έχει συνδεθεί ακόμα.",
};

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
  console.error("filming", error.message);
  return "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
};

export const firstIssue = (error: z.ZodError): FormState => ({
  error: error.issues[0]?.message,
});

// Τα πεδία της φόρμας ως κείμενο· απουσία = κενό κείμενο.
export const pick = (
  form: FormData,
  keys: readonly string[],
): Record<string, string> =>
  Object.fromEntries(keys.map((key) => [key, String(form.get(key) ?? "")]));

export const refreshProductions = (): void =>
  revalidatePath("/app", "layout");

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
  refreshProductions();
  return { notice };
};
