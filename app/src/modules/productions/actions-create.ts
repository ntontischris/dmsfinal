"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick, refreshProductions } from "./action-support";
import { createInternalSchema } from "./schemas";

// Νέα Εσωτερική Παραγωγή (Π9). Μετά τη δημιουργία ανοίγει η σελίδα της.

export async function createInternalProduction(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = createInternalSchema.safeParse(pick(form, ["title", "ownerId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("production_create_internal", {
    p_title: parsed.data.title,
    p_owner_id: parsed.data.ownerId,
  });
  if (!outcome.ok) return outcome.state;
  if (typeof outcome.data !== "string") return finishWith(outcome, "Η Παραγωγή δημιουργήθηκε.");
  refreshProductions();
  redirect(`/app/productions/${outcome.data}`);
}
