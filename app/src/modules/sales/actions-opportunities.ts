"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";

import {
  callRpc,
  finishWith,
  firstIssue,
  pick,
  refreshSales,
} from "./action-support";
import { takenMessage } from "./helpers";
import {
  clientFieldsSchema,
  closeLostSchema,
  createOpportunitySchema,
  followUpSchema,
  logActivitySchema,
  moveStageSchema,
  updateOpportunitySchema,
} from "./schemas";

// Ενέργειες Ευκαιριών: κάθε μία είναι ένα RPC της βάσης (sales_*) που αποφασίζει ποιος μπορεί.

const CLIENT_KEYS = [
  "name",
  "legalName",
  "city",
  "afm",
  "contactName",
  "contactEmail",
  "contactPhone",
] as const;
const CREATE_KEYS = [
  "clientId",
  "title",
  "sourceId",
  "referredBy",
  "nextStep",
  "nextStepDue",
];

const createResultSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created"), opportunity_id: z.string() }),
  z.object({
    status: z.literal("blocked"),
    manager_name: z.string().nullable(),
  }),
]);

const toClientJson = (
  c: z.infer<typeof clientFieldsSchema>,
): Record<string, string> => ({
  name: c.name,
  legal_name: c.legalName,
  city: c.city,
  afm: c.afm,
  contact_name: c.contactName,
  contact_email: c.contactEmail,
  contact_phone: c.contactPhone,
});

export async function createOpportunity(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = createOpportunitySchema.safeParse(pick(form, CREATE_KEYS));
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  const isNewClient = input.clientId === "";
  const client = clientFieldsSchema.safeParse(pick(form, CLIENT_KEYS));
  if (isNewClient && !client.success) return firstIssue(client.error);

  const outcome = await callRpc("sales_create_opportunity", {
    p_client_id: isNewClient ? null : input.clientId,
    p_client: isNewClient && client.success ? toClientJson(client.data) : null,
    p_title: input.title,
    p_source_id: input.sourceId,
    p_referred_by: input.referredBy,
    p_next_step: input.nextStep,
    p_next_step_due: input.nextStepDue,
  });
  if (!outcome.ok) return outcome.state;

  const result = createResultSchema.safeParse(outcome.data);
  if (!result.success)
    return { error: "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά." };
  if (result.data.status === "blocked") {
    return {
      error: `${takenMessage(result.data.manager_name)} Διάλεξέ τον από τη λίστα για να ζητήσεις πρόσβαση.`,
    };
  }
  refreshSales();
  redirect(`/app/pipeline/${result.data.opportunity_id}`);
}

export async function updateOpportunity(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = updateOpportunitySchema.safeParse(
    pick(form, [
      "opportunityId",
      "title",
      "stageId",
      "nextStep",
      "nextStepDue",
    ]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  const outcome = await callRpc("sales_update_opportunity", {
    p_opportunity: input.opportunityId,
    p_title: input.title,
    p_stage_id: input.stageId,
    p_next_step: input.nextStep,
    p_next_step_due: input.nextStepDue,
  });
  return finishWith(outcome, "Αποθηκεύτηκε.");
}

export async function moveOpportunityStage(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = moveStageSchema.safeParse(
    pick(form, ["opportunityId", "stageId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_move_stage", {
    p_opportunity: parsed.data.opportunityId,
    p_stage_id: parsed.data.stageId,
  });
  return finishWith(outcome, "Μετακινήθηκε.");
}

export async function logActivity(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = logActivitySchema.safeParse(
    pick(form, ["opportunityId", "kindId", "body"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_log_activity", {
    p_opportunity: parsed.data.opportunityId,
    p_kind_id: parsed.data.kindId,
    p_body: parsed.data.body,
  });
  return finishWith(outcome, "Καταγράφηκε.");
}

export async function closeOpportunityLost(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = closeLostSchema.safeParse(
    pick(form, ["opportunityId", "lossReasonId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_close_lost", {
    p_opportunity: parsed.data.opportunityId,
    p_loss_reason_id: parsed.data.lossReasonId,
  });
  return finishWith(outcome, "Η Ευκαιρία έκλεισε ως χαμένη.");
}

export async function followUpOpportunity(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = followUpSchema.safeParse(
    pick(form, ["lostId", "title", "sourceId", "nextStep", "nextStepDue"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const input = parsed.data;
  const outcome = await callRpc("sales_follow_up", {
    p_lost: input.lostId,
    p_title: input.title,
    p_source_id: input.sourceId,
    p_next_step: input.nextStep,
    p_next_step_due: input.nextStepDue,
  });
  if (!outcome.ok) return outcome.state;

  const id = z.uuid().safeParse(outcome.data);
  if (!id.success)
    return { error: "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά." };
  refreshSales();
  redirect(`/app/pipeline/${id.data}`);
}
