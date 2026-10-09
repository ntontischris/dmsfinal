"use server";

import type { FormState } from "@/lib/form-state";

import { perform, pick, pickPresent } from "./action-support";
import {
  agreementRefSchema,
  closeLostSchema,
  decideSchema,
  extendSchema,
  linkRefSchema,
  newRevisionSchema,
  outboxMarkSchema,
  signOutsideSchema,
} from "./schemas";

// Οι ενέργειες ροής της πρότασης: αποστολή, Έγκριση, νέα αναθεώρηση, Παράταση, απώλεια, Σύνδεσμοι, υπογραφή εκτός συστήματος.
// Κάθε μία: έλεγχος φόρμας → μία κλήση RPC → μήνυμα. Τι επιτρέπεται σε κάθε βήμα το αποφασίζει η βάση.

const REF_KEYS = ["agreementId"] as const;

// Ενέργειες που θέλουν μόνο το id της Συμφωνίας και καλούν ένα RPC χωρίς άλλα ορίσματα.
const refAction =
  (rpc: string, notice: string) =>
  async (_: FormState, form: FormData): Promise<FormState> =>
    perform(
      agreementRefSchema.safeParse(pick(form, REF_KEYS)),
      (d) => ({ name: rpc, args: { p_agreement: d.agreementId } }),
      notice,
    );

export async function sendProposal(
  state: FormState,
  form: FormData,
): Promise<FormState> {
  return refAction(
    "agreement_send",
    "Η πρόταση στάλθηκε: αντίγραψε τους Συνδέσμους από τα εξερχόμενα.",
  )(state, form);
}

export async function requestApproval(
  state: FormState,
  form: FormData,
): Promise<FormState> {
  return refAction("agreement_request_approval", "Ζητήθηκε Έγκριση.")(
    state,
    form,
  );
}

export async function withdrawApproval(
  state: FormState,
  form: FormData,
): Promise<FormState> {
  return refAction("agreement_withdraw_approval", "Το αίτημα αποσύρθηκε.")(
    state,
    form,
  );
}

export async function decideApproval(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = decideSchema.safeParse(
    pick(form, ["agreementId", "decision", "comment"]),
  );
  return perform(
    parsed,
    (d) => ({
      name: "agreement_decide",
      args: {
        p_agreement: d.agreementId,
        p_approve: d.decision === "approve",
        p_comment: d.comment,
      },
    }),
    (d) =>
      d.decision === "approve"
        ? "Εγκρίθηκε και στάλθηκε σε όλους τους παραλήπτες."
        : "Απορρίφθηκε. Γύρισε στη Σύνταξη με το σχόλιό σου.",
  );
}

export async function newRevision(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = newRevisionSchema.safeParse({
    ...pick(form, REF_KEYS),
    ...pickPresent(form, ["summary"]),
  });
  return perform(
    parsed,
    (d) => ({
      name: "agreement_new_revision",
      args: {
        p_agreement: d.agreementId,
        p_summary: d.summary ? d.summary : null,
      },
    }),
    "Νέα αναθεώρηση: οι παλιοί Σύνδεσμοι ακυρώθηκαν.",
  );
}

// Κενές μέρες = η προεπιλογή του O3 (null).
export async function extendProposal(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = extendSchema.safeParse(pick(form, ["agreementId", "days"]));
  return perform(
    parsed,
    (d) => ({
      name: "agreement_extend",
      args: { p_agreement: d.agreementId, p_days: d.days },
    }),
    "Παράταση: νέοι Σύνδεσμοι, ίδιες τιμές, χωρίς Έγκριση.",
  );
}

export async function closeLost(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = closeLostSchema.safeParse(
    pick(form, ["agreementId", "lossReasonId"]),
  );
  return perform(
    parsed,
    (d) => ({
      name: "agreement_close_lost",
      args: { p_agreement: d.agreementId, p_loss_reason: d.lossReasonId },
    }),
    "Κλείστηκε ως χαμένη. Η Ευκαιρία έκλεισε ως Χαμένη.",
  );
}

export async function revokeLink(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    linkRefSchema.safeParse(pick(form, ["linkId"])),
    (d) => ({ name: "agreement_revoke_link", args: { p_link: d.linkId } }),
    "Ο Σύνδεσμος ανακλήθηκε. Οι υπόλοιποι μένουν ενεργοί.",
  );
}

export async function reissueLink(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    linkRefSchema.safeParse(pick(form, ["linkId"])),
    (d) => ({ name: "agreement_reissue_link", args: { p_link: d.linkId } }),
    "Νέος Σύνδεσμος: αντίγραψέ τον από τα εξερχόμενα.",
  );
}

const SIGN_OUTSIDE_KEYS = [
  "agreementId",
  "signedOn",
  "signedBy",
  "start",
  "reference",
  "invoiced",
] as const;

// Τα «καταναλωμένα» υπάρχουν στη φόρμα μόνο όταν η Έναρξη είναι σε προηγούμενο μήνα· αλλιώς η βάση τα αγνοεί.
export async function signOutside(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = signOutsideSchema.safeParse({
    ...pick(form, SIGN_OUTSIDE_KEYS),
    used: String(form.get("used") ?? ""),
  });
  return perform(
    parsed,
    (d) => ({
      name: "agreement_sign_outside",
      args: {
        p_agreement: d.agreementId,
        p_signed_on: d.signedOn,
        p_signed_by: d.signedBy,
        p_start: d.start,
        p_reference: d.reference,
        p_used: d.used.map((u) => ({ kind_id: u.kindId, used: u.used })),
        p_invoiced: d.invoiced,
      },
    }),
    "Καταχωρίστηκε η υπογραφή εκτός συστήματος. Η Ευκαιρία έγινε κερδισμένη.",
  );
}

export async function markOutbox(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    outboxMarkSchema.safeParse(pick(form, ["outboxId", "status"])),
    (d) => ({
      name: "agreement_outbox_mark",
      args: { p_outbox: d.outboxId, p_status: d.status },
    }),
    "Σημειώθηκε.",
  );
}
