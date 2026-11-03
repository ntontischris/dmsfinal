"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, revalidateAppLayout } from "./action-support";
import { kindFormSchema, kindIdSchema } from "./schemas";

// Είδη κλεισμένου χρόνου (Ρυθμίσεις › Γυρίσματα): προσθήκη, μετονομασία, απόσυρση, επαναφορά. Χωρίς διαγραφή,
// όπως οι Τρόποι είσπραξης: ό,τι χρησιμοποιήθηκε μένει στα παλιά.

const KIND_SAVED = "Το Είδος αποθηκεύτηκε.";
const KIND_RETIRED = "Το Είδος αποσύρθηκε. Ο παλιός κλεισμένος χρόνος το κρατά.";
const KIND_RESTORED = "Το Είδος επανήλθε.";

const fieldOf = (form: FormData, key: string): string => String(form.get(key) ?? "");

async function finish(name: string, args: Record<string, unknown>, notice: string): Promise<FormState> {
  const outcome = await callRpc(name, args);
  if (!outcome.ok) return { error: outcome.error };
  revalidateAppLayout();
  return { notice };
}

export async function saveBlockedKind(_: FormState, form: FormData): Promise<FormState> {
  const parsed = kindFormSchema.safeParse({ id: fieldOf(form, "id"), label: fieldOf(form, "label") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return finish("blocked_time_kind_save", { p_id: parsed.data.id, p_label: parsed.data.label }, KIND_SAVED);
}

export async function retireBlockedKind(_: FormState, form: FormData): Promise<FormState> {
  const parsed = kindIdSchema.safeParse({ id: fieldOf(form, "id") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return finish("blocked_time_kind_retire", { p_id: parsed.data.id }, KIND_RETIRED);
}

export async function restoreBlockedKind(_: FormState, form: FormData): Promise<FormState> {
  const parsed = kindIdSchema.safeParse({ id: fieldOf(form, "id") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  return finish("blocked_time_kind_restore", { p_id: parsed.data.id }, KIND_RESTORED);
}
