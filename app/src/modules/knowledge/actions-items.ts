"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import { audienceFromForm, editHref, MANAGE_PATH } from "./helpers";
import { removeFiles } from "./knowledge-storage";
import {
  audienceSchema,
  createdSchema,
  idSchema,
  itemSchema,
  newItemSchema,
  removedSchema,
} from "./schemas";

// Στοιχεία Γνώσης (L1): κάθε ενέργεια είναι ένα RPC· η βάση ελέγχει Δικαίωμα, Περίληψη, Κοινό και κατάσταση.

// Νέο πρόχειρο (Άρθρο ή Αρχείο) με Ενότητα και τίτλο· μετά ανοίγει ο επεξεργαστής του.
export async function createItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = newItemSchema.safeParse(
    pick(form, ["sectionId", "kind", "title"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("knowledge_item_save", {
    p: { ...parsed.data, summary: "", body: "" },
  });
  if (!outcome.ok) return outcome.state;
  const created = createdSchema.safeParse(outcome.data);
  if (!created.success)
    return { error: "Το στοιχείο δεν δημιουργήθηκε. Δοκίμασε ξανά." };
  redirect(editHref(created.data.id));
}

export async function saveItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = itemSchema.safeParse(
    pick(form, ["id", "sectionId", "title", "summary", "body"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("knowledge_item_save", { p: parsed.data });
  return finishWith(outcome, "Αποθηκεύτηκε.");
}

export async function saveAudience(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = audienceSchema.safeParse({
    id: form.get("id"),
    ...audienceFromForm(form),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("knowledge_item_set_audience", {
    p_id: parsed.data.id,
    p_roles: parsed.data.roles,
    p_public: parsed.data.isPublic,
  });
  return finishWith(outcome, "Το Κοινό αποθηκεύτηκε.");
}

export async function publishItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = idSchema.safeParse(form.get("id"));
  if (!parsed.success) return firstIssue(parsed.error);
  return finishWith(
    await callRpc("knowledge_item_publish", { p_id: parsed.data }),
    "Δημοσιεύτηκε.",
  );
}

export async function unpublishItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = idSchema.safeParse(form.get("id"));
  if (!parsed.success) return firstIssue(parsed.error);
  return finishWith(
    await callRpc("knowledge_item_unpublish", { p_id: parsed.data }),
    "Αποσύρθηκε· είναι πάλι πρόχειρο.",
  );
}

// Οριστική διαγραφή πρόχειρου. Τα αρχεία σβήνονται μόνο αφού πετύχει το RPC.
export async function deleteItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = idSchema.safeParse(form.get("id"));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("knowledge_item_delete", { p_id: parsed.data });
  if (!outcome.ok) return outcome.state;
  const removed = removedSchema.safeParse(outcome.data);
  await removeFiles(removed.success ? removed.data.removedPaths : []);
  redirect(MANAGE_PATH);
}
