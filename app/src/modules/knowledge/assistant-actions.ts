"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";

import {
  CONVERSATIONS_PATH,
  listHref,
  UNANSWERED_PATH,
  type DoneCode,
} from "./assistant-helpers";
import {
  conversationIdSchema,
  coverSchema,
  ignoreSchema,
  reopenSchema,
} from "./assistant-schemas";
import { callRpc, firstIssue, pick } from "./action-support";

// Συζητήσεις (L2) και Αναπάντητες (L3): κάθε ενέργεια είναι ένα RPC· η βάση ελέγχει «Διαχειρίζεται Γνώση» και τους κανόνες.
// Μετά την επιτυχία γυρίζουν στη λίστα με ?done=…, γιατί η γραμμή φεύγει από την καρτέλα της μαζί με τη φόρμα της.

const coverResultSchema = z.object({
  warning: z.literal("not_public").nullable(),
});

function finishTo(path: string, done: DoneCode): never {
  revalidatePath("/app", "layout");
  redirect(listHref(path, { done }));
}

export async function coverUnanswered(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = coverSchema.safeParse(pick(form, ["id", "itemId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("assistant_unanswered_cover", {
    p_id: parsed.data.id,
    p_item: parsed.data.itemId,
  });
  if (!outcome.ok) return outcome.state;
  const result = coverResultSchema.safeParse(outcome.data);
  const isNotPublic = result.success && result.data.warning === "not_public";
  finishTo(UNANSWERED_PATH, isNotPublic ? "covered_not_public" : "covered");
}

export async function ignoreUnanswered(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = ignoreSchema.safeParse(pick(form, ["id", "reason"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("assistant_unanswered_ignore", {
    p_id: parsed.data.id,
    p_reason: parsed.data.reason,
  });
  if (!outcome.ok) return outcome.state;
  finishTo(UNANSWERED_PATH, "ignored");
}

export async function reopenUnanswered(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = reopenSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("assistant_unanswered_reopen", {
    p_id: parsed.data.id,
  });
  if (!outcome.ok) return outcome.state;
  finishTo(UNANSWERED_PATH, "reopened");
}

export async function deleteConversation(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = conversationIdSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("assistant_conversation_delete", {
    p_id: parsed.data.id,
  });
  if (!outcome.ok) return outcome.state;
  finishTo(CONVERSATIONS_PATH, "deleted");
}
