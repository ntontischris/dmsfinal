"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabase } from "@/lib/supabase/server";

import { rpcMessage } from "@/lib/rpc-error";

import { UNCONFIGURED } from "./provision";
import { removeResultSchema, uuidSchema } from "./invitation-schemas";
import type { FormState } from "./schemas";

// Χρήστες πελάτη (N2, N3): αφαίρεση μιας συμμετοχής και επιλογή του ενεργού Πελάτη. Η βάση κρίνει τα Δικαιώματα.

// Ο λογαριασμός που δεν μένει σε κανέναν Πελάτη κλείνει. Το «signOut» του SDK θέλει το JWT, όχι το id·
// το ban μπλοκάρει τις ανανεώσεις της συνεδρίας, και η βάση κόβει ήδη την πρόσβαση (η συμμετοχή λείπει).
const DEACTIVATE_BAN = "876000h";

const removalNotice = (deactivated: boolean, signatoryWarning: boolean): string =>
  [
    "Ο Χρήστης αφαιρέθηκε από τον Πελάτη.",
    deactivated ? "Ο λογαριασμός του κλείστηκε: δεν έχει πια πρόσβαση." : "",
    signatoryWarning ? "Είναι Υπογράφων σε πρόταση που περιμένει υπογραφή: βάλε νέο Υπογράφοντα." : "",
  ]
    .filter(Boolean)
    .join(" ");

async function deactivateAccount(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: DEACTIVATE_BAN });
  if (error) console.error("deactivateAccount", error.code ?? "άγνωστο");
}

export async function removeClientUser(_: FormState, form: FormData): Promise<FormState> {
  const clientId = uuidSchema.safeParse(form.get("clientId"));
  const userId = uuidSchema.safeParse(form.get("userId"));
  if (!clientId.success || !userId.success) return { error: "Ο Χρήστης δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  const { data, error } = await supabase.rpc("client_user_remove", {
    p_client: clientId.data,
    p_user_id: userId.data,
  });
  if (error) return { error: rpcMessage(error, "Ο Χρήστης δεν αφαιρέθηκε.") };
  const result = removeResultSchema.safeParse(data);
  if (!result.success) return { error: "Ο Χρήστης δεν αφαιρέθηκε." };
  if (result.data.deactivate) await deactivateAccount(userId.data);
  revalidatePath("/app", "layout");
  return { notice: removalNotice(result.data.deactivate, result.data.signatoryWarning) };
}

// Ο συνδεδεμένος Χρήστης πελάτη διαλέγει με ποιον Πελάτη δουλεύει (κεφαλίδα).
export async function selectClient(form: FormData): Promise<void> {
  const clientId = uuidSchema.safeParse(form.get("clientId"));
  if (!clientId.success) return;
  const supabase = await createSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc("client_user_select", { p_client: clientId.data });
  if (error) console.error("client_user_select", error.message);
  revalidatePath("/app", "layout");
}
