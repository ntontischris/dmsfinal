import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import {
  parseSalesPipeline,
  parseSalesResults,
  parseSalesSources,
  type SalesPipeline,
  type SalesResults,
  type SalesSources,
} from "./sales-schema";
import type { PeriodCode } from "./url";

// Ανάγνωση των Αναφορών πωλήσεων (Ρβ). Η βάση αποφασίζει Εύρος, Πωλητή και ποσά (Ρ1, Ρ4).

const sellerArg = (sellerId?: string) =>
  sellerId ? { p_seller: sellerId } : {};

export async function getSalesPipeline(
  sellerId?: string,
): Promise<ReadResult<SalesPipeline>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getSalesPipeline",
    supabase.rpc("report_sales_pipeline", sellerArg(sellerId)),
    parseSalesPipeline,
  );
}

export async function getSalesResults(
  period: PeriodCode,
  sellerId?: string,
): Promise<ReadResult<SalesResults>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getSalesResults",
    supabase.rpc("report_sales_results", {
      p_period: period,
      ...sellerArg(sellerId),
    }),
    parseSalesResults,
  );
}

export async function getSalesSources(
  period: PeriodCode,
  sellerId?: string,
): Promise<ReadResult<SalesSources>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getSalesSources",
    supabase.rpc("report_sales_sources", {
      p_period: period,
      ...sellerArg(sellerId),
    }),
    parseSalesSources,
  );
}
