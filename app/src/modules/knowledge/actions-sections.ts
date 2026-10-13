"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { idSchema, moveSchema, sectionSchema } from "./schemas";

// Ενότητες της Γνώσης (L1): κάθε ενέργεια είναι ένα RPC· η βάση ελέγχει «Διαχειρίζεται Γνώση» και τους κανόνες.

export async function saveSection(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = sectionSchema.safeParse(
    pick(form, ["id", "name", "description"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, name, description } = parsed.data;
  const outcome = await callRpc("knowledge_section_save", {
    p: { id, name, description },
  });
  return finishWith(
    outcome,
    id ? "Η Ενότητα αποθηκεύτηκε." : "Η Ενότητα δημιουργήθηκε.",
  );
}

export async function deleteSection(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = idSchema.safeParse(form.get("id"));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("knowledge_section_delete", {
    p_id: parsed.data,
  });
  return finishWith(outcome, "Η Ενότητα διαγράφηκε.");
}

export async function moveSection(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = moveSchema.safeParse(pick(form, ["id", "direction"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("knowledge_section_reorder", {
    p_id: parsed.data.id,
    p_direction: parsed.data.direction,
  });
  return finishWith(outcome, "Η σειρά άλλαξε.");
}
