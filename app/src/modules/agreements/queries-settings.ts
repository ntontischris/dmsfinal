import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import type { ReadResult } from "./read";
import type { AgreementDefaults } from "./types";
import {
  fromDatabase,
  nullableNumber,
  renewalSchema,
  unusedSchema,
} from "./view-schema-parts";

// Ανάγνωση των προεπιλογών της O3. Το RPC δίνει γραμμή μόνο σε όποιον «Διαχειρίζεται Ρυθμίσεις»,
// και το ποσό της ρήτρας λύσης μόνο σε όποιον «Βλέπει ποσά» (αλλιώς null, όχι μηδέν).

const count = z.coerce.number();

const defaultsRowSchema = z.object({
  proposalValidityDays: count,
  standardDiscountPercent: count,
  standardDiscountMonths: count,
  advancePercent: count,
  paymentDaysMonthly: count,
  paymentDaysOneOff: count,
  unusedProvisions: unusedSchema,
  graceDays: count,
  durationMonths: count,
  renewal: renewalSchema,
  dissolutionNoticeDays: count,
  dissolutionFee: nullableNumber,
  filmingNoticeHours: count,
  filmingCancelHours: count,
  lateCancelBurns: z.boolean(),
  noShowBurns: z.boolean(),
  emailSenderConnected: z.boolean(),
  openProposals: count,
  liveAgreements: count,
  updatedAt: z.string(),
});

const defaultsRowsSchema: z.ZodType<AgreementDefaults[], unknown> =
  fromDatabase(z.array(defaultsRowSchema));

// {ok:false} και όταν δεν υπάρχει γραμμή: χωρίς Δικαίωμα η βάση δεν επιστρέφει τίποτα.
export async function getDefaults(): Promise<ReadResult<AgreementDefaults>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("agreements_defaults_view");
  if (error) {
    console.error("getDefaults:", error.message);
    return { ok: false };
  }
  const parsed = defaultsRowsSchema.safeParse(data);
  const first = parsed.success ? parsed.data[0] : undefined;
  return first === undefined ? { ok: false } : { ok: true, data: first };
}
