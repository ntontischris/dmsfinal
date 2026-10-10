import { revalidatePath } from "next/cache";

import { createSupabase } from "@/lib/supabase/server";

// Κοινά των actions του Ημερολογίου. Δεν είναι αρχείο "use server": εξάγει και σταθερές.

const UNCONFIGURED_MESSAGE = "Η βάση δεν έχει συνδεθεί ακόμα.";

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
  console.error("calendar", error.message);
  return "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
};

export type RpcOutcome =
  { ok: true; data: unknown } | { ok: false; error: string };

// Μία κλήση RPC. Το μήνυμα της βάσης φτάνει ως έχει· το token του συνδέσμου δεν μπαίνει ποτέ σε μήνυμα.
export async function callRpc(
  name: string,
  args: Record<string, unknown>,
): Promise<RpcOutcome> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, error: UNCONFIGURED_MESSAGE };
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { ok: false, error: messageOf(error) };
  return { ok: true, data };
}

export const revalidateAppLayout = (): void => revalidatePath("/app", "layout");
