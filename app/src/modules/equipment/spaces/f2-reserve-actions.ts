"use server";

import { z } from "zod";

import type { FormState } from "@/lib/form-state";

import { callRpc, finishWith, firstIssue, pick } from "../action-support";

// Δέσμευση/αποδέσμευση από τη σελίδα αντικειμένου (F2) στη νέα εμφάνιση. Ίδια RPC με τα reserveItem/releaseItem
// του module «Γυρίσματα» (εκεί μένουν εσωτερικά)· η βάση αποφασίζει σύγκρουση, εύρος και διαθεσιμότητα.
// Μεταβατικό: φεύγει μόλις τα δύο actions εξαχθούν από το `@/modules/filming`.

const reservationSchema = z.object({
  itemId: z.uuid(),
  filmingId: z.uuid("Διάλεξε Γύρισμα."),
});

const FIELDS = ["itemId", "filmingId"] as const;

export async function reserveFromItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = reservationSchema.safeParse(pick(form, FIELDS));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_item_reserve", {
    p_item: parsed.data.itemId,
    p_filming: parsed.data.filmingId,
  });
  if (!outcome.ok) return outcome.state;
  return finishWith(
    outcome,
    outcome.data === true
      ? "Το αντικείμενο δεσμεύτηκε, με προειδοποίηση σύγκρουσης."
      : "Το αντικείμενο δεσμεύτηκε.",
  );
}

export async function releaseFromItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = reservationSchema.safeParse(pick(form, FIELDS));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("equipment_item_release", {
    p_item: parsed.data.itemId,
    p_filming: parsed.data.filmingId,
  });
  return finishWith(outcome, "Η δέσμευση αφαιρέθηκε.");
}
