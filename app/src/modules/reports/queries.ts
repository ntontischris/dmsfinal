import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { PeriodCode } from "./url";
import {
  parsePeriods,
  parseReceivablesAging,
  parseTurnoverByClient,
  parseTurnoverMonthly,
  type ReceivablesAging,
  type ReportPeriods,
  type TurnoverByClient,
  type TurnoverMonthly,
} from "./view-schema";

// Ανάγνωση των Αναφορών. Όλα περνούν από RPC· η βάση αποφασίζει ποιος βλέπει τι και αν φαίνονται τα ποσά (Ρ1).

export async function getPeriods(): Promise<ReadResult<ReportPeriods>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getPeriods", supabase.rpc("report_periods"), parsePeriods);
}

export async function getTurnoverMonthly(
  period: PeriodCode,
  clientId?: string,
): Promise<ReadResult<TurnoverMonthly>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getTurnoverMonthly",
    supabase.rpc("report_turnover_monthly", {
      p_period: period,
      ...(clientId ? { p_client: clientId } : {}),
    }),
    parseTurnoverMonthly,
  );
}

export async function getTurnoverByClient(
  period: PeriodCode,
): Promise<ReadResult<TurnoverByClient>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getTurnoverByClient",
    supabase.rpc("report_turnover_by_client", { p_period: period }),
    parseTurnoverByClient,
  );
}

export async function getReceivablesAging(): Promise<
  ReadResult<ReceivablesAging>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getReceivablesAging",
    supabase.rpc("report_receivables_aging"),
    parseReceivablesAging,
  );
}
