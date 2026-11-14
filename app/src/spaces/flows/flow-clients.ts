"use server";

import { listBookingOptions } from "@/modules/filming";

import { clientRowsOf, type FlowClient } from "./flows";

// Βήμα 1 του «Στήνω γύρισμα»: οι Πελάτες με Συμφωνία σε ανοιχτή Περίοδο, από την ίδια ανάγνωση με το E4 (η βάση ελέγχει
// Δικαίωμα και Περίοδο). Μόνο ανάγνωση.
export async function listFlowClients(): Promise<
  { ok: true; data: FlowClient[] } | { ok: false }
> {
  const options = await listBookingOptions();
  return options.ok ? { ok: true, data: clientRowsOf(options.data) } : { ok: false };
}
