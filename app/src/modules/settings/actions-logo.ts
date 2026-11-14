"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import {
  LOGO_FILE_MESSAGE,
  hasLogoSignature,
  isLogoFileOk,
  logoExtension,
} from "./logo-file";
import { removeLogoFile, uploadLogoFile } from "./logo-storage";

// Λογότυπο εταιρείας (e1): η βάση δίνει θέση (με έλεγχο Δικαιώματος) → ανέβασμα με service role → καταχώριση.
// Αν η καταχώριση αποτύχει, σβήνεται το νέο αρχείο· αν πέτυχε αντικατάσταση ή αφαίρεση, σβήνεται το παλιό.

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
type RpcOutcome = { ok: true; data: unknown } | { ok: false; state: FormState };

const messageOf = (error: { code?: string; message: string }): string => {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "Δεν έχεις Δικαίωμα για αυτή την αλλαγή.";
  console.error("logo", error.message);
  return "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
};

async function callRpc(
  supabase: Supabase,
  name: string,
  args: Record<string, unknown> = {},
): Promise<RpcOutcome> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { ok: false, state: { error: messageOf(error) } };
  return { ok: true, data };
}

// Το λογότυπο φαίνεται σε κάθε σελίδα (κέλυφος), άρα ανανεώνεται όλο το layout.
const refreshEverywhere = (): void => revalidatePath("/app", "layout");

async function readChecked(value: unknown) {
  if (!isLogoFileOk(value)) return null;
  const ext = logoExtension(value.type);
  const bytes = new Uint8Array(await value.arrayBuffer());
  if (ext === null || !hasLogoSignature(bytes, ext)) return null;
  return { bytes, ext, type: value.type };
}

export async function uploadLogo(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const checked = await readChecked(form.get("logo"));
  if (checked === null) return { error: LOGO_FILE_MESSAGE };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const slot = await callRpc(supabase, "company_logo_slot", { p_ext: checked.ext });
  if (!slot.ok) return slot.state;
  const path = String(slot.data);
  const stored = await uploadLogoFile(path, checked);
  if (!stored.ok) return { error: stored.error };
  const attached = await callRpc(supabase, "company_logo_attach", {
    p_path: path,
    p_type: checked.type,
  });
  if (!attached.ok) {
    await removeLogoFile(path);
    return attached.state;
  }
  if (typeof attached.data === "string") await removeLogoFile(attached.data);
  refreshEverywhere();
  return { notice: "Το λογότυπο αποθηκεύτηκε· φαίνεται πια στην εφαρμογή και στα email." };
}

export async function removeLogo(): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const removed = await callRpc(supabase, "company_logo_remove");
  if (!removed.ok) return removed.state;
  if (typeof removed.data === "string") await removeLogoFile(removed.data);
  refreshEverywhere();
  return { notice: "Το λογότυπο αφαιρέθηκε· φαίνεται ξανά το προεπιλεγμένο." };
}
