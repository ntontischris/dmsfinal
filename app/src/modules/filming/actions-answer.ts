"use server";

import { redirect } from "next/navigation";

import type { FormState } from "@/lib/form-state";

import {
  callRpc,
  finishWith,
  firstIssue,
  pick,
  revalidateAppLayout,
  type RpcOutcome,
} from "./action-support";
import { applyDefaultTemplates } from "./apply-templates";
import { getFilming } from "./queries";
import {
  answerReasonSchema,
  answerSchema,
  offerTimesSchema,
  pickOfferSchema,
} from "./schemas-answer";
import { filmingRefSchema } from "./schemas";
import {
  answerTargetOf,
  queueHref,
  waitHref,
  type RequestKind,
} from "./spaces/e2-guide-model";

// Ο οδηγός «Εγκρίνω αιτήματα γυρίσματος»: μία απάντηση ανά αίτημα, ανάλογα με το είδος του.
// Μετά την επιτυχία η οθόνη πηγαίνει στο επόμενο βήμα του οδηγού (το URL κρατά το βήμα).

const approveRpc = (id: string, kind: RequestKind): Promise<RpcOutcome> => {
  if (kind === "booking") return callRpc("filming_approve", { p_id: id });
  if (kind === "reschedule")
    return callRpc("filming_decide_reschedule", {
      p_id: id,
      p_accept: true,
      p_reason: null,
    });
  return callRpc("filming_decide_cancel_request", {
    p_id: id,
    p_accept: true,
    p_reason: null,
  });
};

const refuseRpc = (
  id: string,
  kind: RequestKind,
  reason: string,
): Promise<RpcOutcome> => {
  if (kind === "booking")
    return callRpc("filming_reject", { p_id: id, p_reason: reason });
  if (kind === "reschedule")
    return callRpc("filming_decide_reschedule", {
      p_id: id,
      p_accept: false,
      p_reason: reason,
    });
  return callRpc("filming_decide_cancel_request", {
    p_id: id,
    p_accept: false,
    p_reason: reason,
  });
};

// Μετά από εγκεκριμένη μετάθεση: έμεινε το Γύρισμα χωρίς Συνεργείο ή Εξοπλισμό;
async function lacksTeam(id: string): Promise<boolean> {
  const card = await getFilming(id);
  return (
    card.ok &&
    card.data !== null &&
    (card.data.crew.length === 0 || card.data.equipment.length === 0)
  );
}

// Βήμα 1: «Εγκρίνω» γράφεται εδώ· «Προτείνω άλλη ώρα» και «Απορρίπτω» ανοίγουν το βήμα τους (2β, 2γ).
export async function answerRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = answerSchema.safeParse(
    pick(form, ["filmingId", "kind", "answer", "kindLabel"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId: id, kind, answer, kindLabel } = parsed.data;
  if (answer !== "approve") redirect(answerTargetOf({ id, kind, answer }));
  const outcome = await approveRpc(id, kind);
  if (!outcome.ok) return outcome.state;
  if (kind === "booking") await applyDefaultTemplates(id, kindLabel);
  const missing = kind === "reschedule" ? await lacksTeam(id) : false;
  revalidateAppLayout();
  redirect(answerTargetOf({ id, kind, answer, lacksTeam: missing }));
}

// Βήμα 2γ: άρνηση με λόγο που βλέπει ο Πελάτης· μετά, το επόμενο αίτημα.
export async function answerWithReason(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = answerReasonSchema.safeParse(
    pick(form, ["filmingId", "kind", "reason"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId, kind, reason } = parsed.data;
  const outcome = await refuseRpc(filmingId, kind, reason);
  if (!outcome.ok) return outcome.state;
  revalidateAppLayout();
  redirect(queueHref());
}

// Βήμα 2β: οι ώρες πάνε στον Πελάτη· ο οδηγός περιμένει (⏳3).
export async function offerTimes(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = offerTimesSchema.safeParse({
    filmingId: String(form.get("filmingId") ?? ""),
    times: form.getAll("times").map(String),
    note: String(form.get("note") ?? ""),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const { filmingId, times, note } = parsed.data;
  const outcome = await callRpc("filming_offer_times", {
    p_id: filmingId,
    p_times: times,
    p_note: note,
  });
  if (!outcome.ok) return outcome.state;
  const card = await getFilming(filmingId);
  revalidateAppLayout();
  redirect(
    waitHref(times.length, card.ok ? (card.data?.client?.name ?? null) : null),
  );
}

// Ο Πελάτης πατά μία από τις ώρες: το Γύρισμα μετακινείται εκεί και κλείνει χωρίς νέα έγκριση.
export async function pickOfferedTime(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = pickOfferSchema.safeParse(
    pick(form, ["filmingId", "startsAt"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_pick_offer", {
    p_id: parsed.data.filmingId,
    p_starts: parsed.data.startsAt,
  });
  return finishWith(
    outcome,
    "Η ώρα κλείστηκε· το Γύρισμα είναι προγραμματισμένο.",
  );
}

export async function withdrawOffer(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = filmingRefSchema.safeParse(pick(form, ["filmingId"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("filming_offer_withdraw", {
    p_id: parsed.data.filmingId,
  });
  return finishWith(
    outcome,
    "Η πρόταση ανακλήθηκε· το αίτημα ξαναμπαίνει στα αιτήματα.",
  );
}
