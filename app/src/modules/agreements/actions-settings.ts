"use server";

import type { FormState } from "@/lib/form-state";

import { perform, pick } from "./action-support";
import {
  revisionLimitsInputSchema,
  savePolicySchema,
  savePricingSchema,
  saveTermsSchema,
} from "./settings-schemas";

// Ενέργειες Ρυθμίσεων › Συμφωνίες (O3). Κάθε μία είναι ένα RPC με «Διαχειρίζεται Ρυθμίσεις»·
// ισχύουν μόνο για νέες προτάσεις (οι ανοιχτές κρατούν το baseline τους).

const SAVED_NOTICE =
  "Αποθηκεύτηκε. Ισχύει από εδώ και πέρα· ό,τι έχει ήδη γίνει δεν αλλάζει.";

const TERMS_KEYS = [
  "set",
  "paymentDays",
  "unusedProvisions",
  "graceDays",
  "durationMonths",
  "renewal",
  "dissolutionNoticeDays",
  "dissolutionFee",
] as const;

// Η εφάπαξ στέλνει μόνο Μέρες πληρωμής· τα υπόλοιπα φτάνουν κενά (null) και η βάση τα αγνοεί εκεί.
export async function saveTerms(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    saveTermsSchema.safeParse(pick(form, TERMS_KEYS)),
    (v) => ({
      name: "agreements_save_terms",
      args: {
        p_set: v.set,
        p_payment_days: v.paymentDays,
        p_unused_provisions: v.unusedProvisions,
        p_grace_days: v.graceDays,
        p_duration_months: v.durationMonths,
        p_renewal: v.renewal,
        p_dissolution_notice_days: v.dissolutionNoticeDays,
        p_dissolution_fee: v.dissolutionFee,
      },
    }),
    SAVED_NOTICE,
  );
}

export async function savePolicy(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    savePolicySchema.safeParse(
      pick(form, [
        "filmingNoticeHours",
        "filmingCancelHours",
        "lateCancelBurns",
        "noShowBurns",
      ]),
    ),
    (v) => ({
      name: "agreements_save_policy",
      args: {
        p_filming_notice_hours: v.filmingNoticeHours,
        p_filming_cancel_hours: v.filmingCancelHours,
        p_late_cancel_burns: v.lateCancelBurns,
        p_no_show_burns: v.noShowBurns,
      },
    }),
    SAVED_NOTICE,
  );
}

export async function savePricing(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    savePricingSchema.safeParse(
      pick(form, [
        "proposalValidityDays",
        "advancePercent",
        "standardDiscountPercent",
        "standardDiscountMonths",
      ]),
    ),
    (v) => ({
      name: "agreements_save_pricing",
      args: {
        p_proposal_validity_days: v.proposalValidityDays,
        p_advance_percent: v.advancePercent,
        p_standard_discount_percent: v.standardDiscountPercent,
        p_standard_discount_months: v.standardDiscountMonths,
      },
    }),
    SAVED_NOTICE,
  );
}

export async function saveRevisionLimits(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    revisionLimitsInputSchema.safeParse(String(form.get("limits") ?? "")),
    (limits) => ({
      name: "agreements_save_revision_limits",
      args: {
        p_limits: limits.map((l) => ({ kind_id: l.kindId, rounds: l.rounds })),
      },
    }),
    SAVED_NOTICE,
  );
}
