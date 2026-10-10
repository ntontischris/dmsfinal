"use server";

import { z } from "zod";

import { appOrigin } from "@/lib/app-origin";

import { callRpc, revalidateAppLayout } from "./action-support";

// Σύνδεσμος ημερολογίου (Λ3): δημιουργία ή ανανέωση (ίδια κλήση στη βάση) και κατάργηση.
// Το token γυρίζει μία φορά, στη δημιουργία ή την ανανέωση· η βάση κρατά μόνο το hash του.

export interface LinkState {
  url?: string;
  error?: string;
}

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{16,}$/);

export async function renewCalendarLink(): Promise<LinkState> {
  const outcome = await callRpc("calendar_link_renew", {});
  if (!outcome.ok) return { error: outcome.error };
  const token = tokenSchema.safeParse(outcome.data);
  if (!token.success)
    return { error: "Ο σύνδεσμος δεν δημιουργήθηκε. Δοκίμασε ξανά." };
  revalidateAppLayout();
  return { url: `${appOrigin()}/api/calendar/${token.data}.ics` };
}

export async function revokeCalendarLink(): Promise<LinkState> {
  const outcome = await callRpc("calendar_link_revoke", {});
  if (!outcome.ok) return { error: outcome.error };
  revalidateAppLayout();
  return {};
}
