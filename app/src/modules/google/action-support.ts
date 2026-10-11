import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

// Κοινά των actions του Google. Δεν είναι αρχείο "use server": εξάγει και σταθερές.

const UNCONFIGURED_MESSAGE = "Η βάση δεν έχει συνδεθεί ακόμα.";

// Ο κανόνας της βάσης (P0001) γράφεται ήδη στα ελληνικά και δείχνεται όπως είναι· τα υπόλοιπα μεταφράζονται εδώ.
export const messageOf = (error: { code?: string; message: string }): string => {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "Δεν έχεις Δικαίωμα για αυτή την ενέργεια.";
  if (error.code === "23514") return "Μια τιμή δεν είναι έγκυρη. Έλεγξε τα πεδία.";
  console.error("google", error.message);
  return "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
};

export type RpcOutcome = { ok: true; data: unknown } | { ok: false; state: FormState };

// Μία κλήση RPC με τη συνεδρία του Χρήστη: η βάση ελέγχει το Δικαίωμα.
export async function callRpc(name: string, args: Record<string, unknown>): Promise<RpcOutcome> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, state: { error: UNCONFIGURED_MESSAGE } };
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { ok: false, state: { error: messageOf(error) } };
  return { ok: true, data };
}

export const revalidateAppLayout = (): void => revalidatePath("/app", "layout");

// Επιτυχία: φρεσκάρει τις οθόνες και δίνει το μήνυμα· αποτυχία: το μήνυμα λάθους όπως ήρθε.
export const finishWith = (outcome: RpcOutcome, notice: string): FormState => {
  if (!outcome.ok) return outcome.state;
  revalidateAppLayout();
  return { notice };
};

export const textOf = (form: FormData, key: string): string => String(form.get(key) ?? "").trim();
