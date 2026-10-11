"use server";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "./action-support";
import {
  assignRequestSchema,
  closeDoneSchema,
  closeRejectedSchema,
  deliverableFromRequestSchema,
  markRequestSchema,
} from "./request-schemas";

// Αιτήματα (Jδ): κάθε ενέργεια είναι ένα RPC της βάσης. Η βάση ελέγχει Δικαίωμα, ορατότητα, υπεύθυνο και κατάσταση.

const MARKED = "Το Μήνυμα σημειώθηκε ως Αίτημα.";
const ASSIGNED = "Ο υπεύθυνος άλλαξε.";
const DONE = "Το Αίτημα ολοκληρώθηκε.";
const REJECTED = "Το Αίτημα απορρίφθηκε.";
const DELIVERABLE_CREATED = "Το Παραδοτέο δημιουργήθηκε και το Αίτημα έκλεισε.";

export async function markRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = markRequestSchema.safeParse(pick(form, ["id", "kind"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("message_mark_request", {
    p_message: parsed.data.id,
    p_kind: parsed.data.kind,
  });
  return finishWith(outcome, MARKED);
}

export async function assignRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = assignRequestSchema.safeParse(pick(form, ["id", "userId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("message_request_assign", {
    p_message: parsed.data.id,
    p_user: parsed.data.userId,
  });
  return finishWith(outcome, ASSIGNED);
}

export async function completeRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = closeDoneSchema.safeParse(
    pick(form, ["id", "link", "comment"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, link, comment } = parsed.data;
  const outcome = await callRpc("message_request_close", {
    p_message: id,
    p: { outcome: "done", link, comment },
  });
  return finishWith(outcome, DONE);
}

export async function rejectRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = closeRejectedSchema.safeParse(pick(form, ["id", "reply"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("message_request_close", {
    p_message: parsed.data.id,
    p: { outcome: "rejected", reply: parsed.data.reply },
  });
  return finishWith(outcome, REJECTED);
}

// Μ11: το Παραδοτέο δημιουργείται και το Αίτημα κλείνει σε μία συναλλαγή της βάσης.
export async function createDeliverableFromRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = deliverableFromRequestSchema.safeParse(
    pick(form, [
      "id",
      "productionId",
      "kindId",
      "title",
      "assigneeId",
      "filmingId",
      "charge",
      "chargeReason",
    ]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const value = parsed.data;
  const outcome = await callRpc("message_request_create_deliverable", {
    p_message: value.id,
    p: {
      productionId: value.productionId,
      kindId: value.kindId,
      title: value.title,
      assigneeId: value.assigneeId,
      filmingId: value.filmingId,
      charge: value.charge,
      chargeReason: value.chargeReason,
    },
  });
  return finishWith(outcome, DELIVERABLE_CREATED);
}
