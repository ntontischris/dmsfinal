"use server";

import type { FormState } from "@/lib/form-state";

import { firstIssue, perform, pick } from "./action-support";
import { continuationSchema, dissolveSchema } from "./lifecycle-schema";
import { agreementRefSchema } from "./schemas";
import { storeSignedFile } from "./signed-file-store";

// Λύση, «Χωρίς συνέχιση», ανανέωση τώρα και υπογεγραμμένο αρχείο (b8, b9, b12). Κάθε μία: έλεγχος φόρμας → RPC → μήνυμα.
// Τι επιτρέπεται (Δικαίωμα, κατάσταση, ημερομηνίες) το αποφασίζει η βάση.

export async function dissolveAgreement(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    dissolveSchema.safeParse(pick(form, ["agreementId", "on", "reason"])),
    (d) => ({
      name: "agreement_dissolve",
      args: { p_agreement: d.agreementId, p_on: d.on, p_reason: d.reason },
    }),
    "Η Λύση καταχωρίστηκε.",
  );
}

export async function cancelDissolution(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    agreementRefSchema.safeParse(pick(form, ["agreementId"])),
    (d) => ({
      name: "agreement_cancel_dissolution",
      args: { p_agreement: d.agreementId },
    }),
    "Η Λύση ακυρώθηκε· η Συμφωνία συνεχίζει κανονικά.",
  );
}

export async function setContinuation(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    continuationSchema.safeParse(
      pick(form, ["agreementId", "continue", "note"]),
    ),
    (d) => ({
      name: "agreement_set_continuation",
      args: {
        p_agreement: d.agreementId,
        p_continue: d.continue,
        p_note: d.note,
      },
    }),
    (d) =>
      d.continue
        ? "Η Συμφωνία συνεχίζει ξανά μετά τη Λήξη."
        : "Σημειώθηκε: η Συμφωνία δεν συνεχίζει μετά τη Λήξη.",
  );
}

export async function renewAgreement(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  return perform(
    agreementRefSchema.safeParse(pick(form, ["agreementId"])),
    (d) => ({ name: "agreement_renew", args: { p_agreement: d.agreementId } }),
    "Άνοιξε Ευκαιρία ανανέωσης με νέα πρόταση στις τρέχουσες τιμές.",
  );
}

export async function attachSignedFile(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = agreementRefSchema.safeParse(pick(form, ["agreementId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  return storeSignedFile(parsed.data.agreementId, form.get("signedFile"));
}
