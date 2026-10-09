"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";

import {
  callRpc,
  firstIssue,
  perform,
  pick,
  pickPresent,
  refreshAgreements,
} from "./action-support";
import {
  addCatalogueLineSchema,
  addFreeLineSchema,
  agreementRefSchema,
  basicsSchema,
  createAgreementSchema,
  lineRefSchema,
  milestonesFieldSchema,
  moneyTermsSchema,
  provisionsFieldSchema,
  recipientsFieldSchema,
  revisionLimitsFieldSchema,
  termsSchema,
  updateLineSchema,
} from "./schemas";
import {
  BASICS_KEYS,
  LINE_KEYS,
  MONEY_TERMS_KEYS,
  TERMS_KEYS,
  limitArgs,
  milestoneArgs,
  provisionArgs,
  recipientArgs,
  totalPercent,
} from "./actions-draft-parts";

// Οι ενέργειες σύνταξης της πρότασης (D2 και B4). Κάθε μία: έλεγχος φόρμας → μία κλήση RPC → μήνυμα.
// Την άδεια και τους κανόνες (π.χ. «η πρόταση έχει σταλεί») τους αποφασίζει η βάση.

const SAVED = "Αποθηκεύτηκε.";

export async function createAgreement(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = createAgreementSchema.safeParse(
    pick(form, ["opportunityId", "kind", "title"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("agreement_create", {
    p_opportunity: parsed.data.opportunityId,
    p_kind: parsed.data.kind,
    p_title: parsed.data.title === "" ? null : parsed.data.title,
  });
  if (!outcome.ok) return outcome.state;
  const id = z.uuid().safeParse(outcome.data);
  if (!id.success)
    return { error: "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά." };
  refreshAgreements();
  redirect(`/app/agreements/${id.data}`);
}

export async function updateBasics(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  // Η Διάρκεια υπάρχει μόνο στη φόρμα της μηνιαίας· η εφάπαξ δεν τη στέλνει.
  const parsed = basicsSchema.safeParse({
    ...pick(form, BASICS_KEYS),
    ...pickPresent(form, ["durationMonths"]),
  });
  return perform(
    parsed,
    (d) => ({
      name: "agreement_update_basics",
      args: {
        p_agreement: d.agreementId,
        p_title: d.title,
        p_language: d.language,
        p_valid_until: d.validUntil,
        p_start_on: d.startOn,
        p_duration_months: d.durationMonths,
      },
    }),
    SAVED,
  );
}

export async function updateTerms(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    termsSchema.safeParse(pick(form, TERMS_KEYS)),
    (d) => ({
      name: "agreement_update_terms",
      args: {
        p_agreement: d.agreementId,
        p_payment_days: d.paymentDays,
        p_unused_provisions: d.unusedProvisions,
        p_grace_days: d.graceDays,
        p_renewal: d.renewal,
        p_dissolution_notice_days: d.dissolutionNoticeDays,
        p_filming_notice_hours: d.filmingNoticeHours,
        p_filming_cancel_hours: d.filmingCancelHours,
        p_late_cancel_burns: d.lateCancelBurns,
        p_no_show_burns: d.noShowBurns,
      },
    }),
    SAVED,
  );
}

export async function setMoneyTerms(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    moneyTermsSchema.safeParse(pick(form, MONEY_TERMS_KEYS)),
    (d) => ({
      name: "agreement_set_money_terms",
      args: {
        p_agreement: d.agreementId,
        p_discount_percent: d.discountPercent,
        p_discount_months: d.discountMonths,
        p_dissolution_fee: d.dissolutionFee,
      },
    }),
    SAVED,
  );
}

export async function setMilestones(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = agreementRefSchema
    .extend({ milestones: milestonesFieldSchema })
    .safeParse(pick(form, ["agreementId", "milestones"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const { agreementId, milestones } = parsed.data;
  const outcome = await callRpc("agreement_set_milestones", {
    p_agreement: agreementId,
    p_milestones: milestoneArgs(milestones),
  });
  if (!outcome.ok) return outcome.state;
  refreshAgreements();
  const total = totalPercent(milestones.map((m) => m.percent));
  return {
    notice:
      total === 100 ? SAVED : `${SAVED} Οι δόσεις κάνουν ${total}%, όχι 100%.`,
  };
}

export async function setRevisionLimits(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = agreementRefSchema
    .extend({ limits: revisionLimitsFieldSchema })
    .safeParse(pick(form, ["agreementId", "limits"]));
  return perform(
    parsed,
    (d) => ({
      name: "agreement_set_revision_limits",
      args: {
        p_agreement: d.agreementId,
        p_limits: limitArgs(d.limits),
      },
    }),
    SAVED,
  );
}

export async function setRecipients(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = agreementRefSchema
    .extend({ recipients: recipientsFieldSchema })
    .safeParse(pick(form, ["agreementId", "recipients"]));
  return perform(
    parsed,
    (d) => ({
      name: "agreement_set_recipients",
      args: {
        p_agreement: d.agreementId,
        p_recipients: recipientArgs(d.recipients),
      },
    }),
    SAVED,
  );
}

export async function addCatalogueLine(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    addCatalogueLineSchema.safeParse(
      pick(form, ["agreementId", "itemId", "quantity"]),
    ),
    (d) => ({
      name: "agreement_add_catalogue_line",
      args: {
        p_agreement: d.agreementId,
        p_item: d.itemId,
        p_quantity: d.quantity,
      },
    }),
    "Η γραμμή προστέθηκε.",
  );
}

export async function addFreeLine(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    addFreeLineSchema.safeParse(
      pick(form, ["agreementId", "description", "descriptionEn", "price"]),
    ),
    (d) => ({
      name: "agreement_add_free_line",
      args: {
        p_agreement: d.agreementId,
        p_description: d.description,
        p_description_en: d.descriptionEn,
        p_price: d.price,
      },
    }),
    "Η ελεύθερη γραμμή προστέθηκε· είναι Παρέκκλιση.",
  );
}

// Απουσία πεδίου = δεν αλλάζει (null στο RPC): η D2 δείχνει κάθε πεδίο μόνο σε όποιον μπορεί να το γράψει.
export async function updateLine(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = updateLineSchema.safeParse({
    ...pick(form, ["lineId"]),
    ...pickPresent(form, LINE_KEYS),
  });
  return perform(
    parsed,
    (d) => ({
      name: "agreement_update_line",
      args: {
        p_line: d.lineId,
        p_quantity: d.quantity ?? null,
        p_description: d.description ?? null,
        p_description_en: d.descriptionEn ?? null,
        p_unit_price: d.unitPrice ?? null,
        p_hours_shoot: d.hoursShoot ?? null,
        p_hours_edit: d.hoursEdit ?? null,
        p_direct_cost: d.directCost ?? null,
      },
    }),
    SAVED,
  );
}

export async function setLineProvisions(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = lineRefSchema
    .extend({ provisions: provisionsFieldSchema })
    .safeParse(pick(form, ["lineId", "provisions"]));
  return perform(
    parsed,
    (d) => ({
      name: "agreement_set_line_provisions",
      args: {
        p_line: d.lineId,
        p_provisions: provisionArgs(d.provisions),
      },
    }),
    SAVED,
  );
}

export async function removeLine(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    lineRefSchema.safeParse(pick(form, ["lineId"])),
    (d) => ({ name: "agreement_remove_line", args: { p_line: d.lineId } }),
    "Η γραμμή αφαιρέθηκε.",
  );
}
