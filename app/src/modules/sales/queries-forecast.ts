import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { ForecastRow, OpportunityForecast, PipelineValue } from "./types";

// Πρόβλεψη πωλήσεων (b3): Αξία × Πιθανότητα ανά ανοιχτή Ευκαιρία και το σύνολο. Τι βλέπει ποιος το αποφασίζει η βάση
// (Ευκαιρίες που βλέπει, ποσά μόνο με «Βλέπει ποσά»).

const rowsSchema = z.array(
  z.object({
    opportunity_id: z.string(),
    value: z.number().nullable(),
    value_source: z.enum(["estimate", "proposal"]).nullable(),
    probability: z.number(),
    probability_source: z.enum(["opportunity", "stage"]).nullable(),
    weighted: z.number().nullable(),
    expected_close: z.string().nullable(),
    is_late: z.boolean(),
  }),
);

const parseRows = (data: unknown): ForecastRow[] =>
  rowsSchema.parse(data).map((row) => ({
    opportunityId: row.opportunity_id,
    value: row.value,
    valueSource: row.value_source,
    probability: row.probability,
    probabilitySource: row.probability_source,
    weighted: row.weighted,
    expectedClose: row.expected_close,
    isLate: row.is_late,
  }));

const valueSchema = z.object({
  amounts: z.boolean(),
  open: z.number(),
  valued: z.number(),
  total: z.number().nullable(),
  weighted: z.number().nullable(),
  thisMonth: z.object({ count: z.number(), weighted: z.number().nullable() }),
  late: z.number(),
});

export const parsePipelineValue = (data: unknown): PipelineValue => {
  const { amounts, ...rest } = valueSchema.parse(data);
  return { hasAmounts: amounts, ...rest };
};

// Η πρόβλεψη κάθε ανοιχτής Ευκαιρίας που βλέπει ο Χρήστης, ανά id (κάρτες Pipeline).
export async function listForecastRows(
  today?: string,
): Promise<ReadResult<Record<string, ForecastRow>>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listForecastRows",
    supabase.rpc("sales_pipeline_rows", { p_today: today ?? null }),
    (data) =>
      Object.fromEntries(
        parseRows(data).map((row) => [row.opportunityId, row]),
      ),
  );
}

// ΤΟ σύνολο της ανοιχτής πρόβλεψης για όποιον το ζητά (π.χ. KPIs στο Σήμερα): ανοιχτές, Αξία, σταθμισμένη Αξία,
// όσες κλείνουν αυτόν τον μήνα και όσες άργησαν. Χωρίς «Διαχειρίζεται Πελάτες και Ευκαιρίες» → { ok: false }.
export async function getPipelineValue(
  today?: string,
): Promise<ReadResult<PipelineValue>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getPipelineValue",
    supabase.rpc("sales_pipeline_value", { p_today: today ?? null }),
    parsePipelineValue,
  );
}

const ownSchema = z.object({
  probability: z.number().nullable(),
  expected_close: z.string().nullable(),
});
const estimateSchema = z.object({ estimated_value: z.number() }).nullable();

// Η πρόβλεψη μίας Ευκαιρίας για την καρτέλα της (B4): το υπολογισμένο και ό,τι έγραψε ο Υπεύθυνος.
export async function getOpportunityForecast(
  opportunityId: string,
): Promise<ReadResult<OpportunityForecast>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const [rows, own, estimate] = await Promise.all([
    read(
      "getOpportunityForecast.row",
      supabase
        .rpc("sales_pipeline_rows", { p_today: null })
        .eq("opportunity_id", opportunityId),
      parseRows,
    ),
    read(
      "getOpportunityForecast.own",
      supabase
        .from("opportunities")
        .select("probability, expected_close")
        .eq("id", opportunityId)
        .single(),
      (data) => ownSchema.parse(data),
    ),
    // Χωρίς «Βλέπει ποσά» η RLS δεν δίνει γραμμή: τότε δεν υπάρχει εκτίμηση για αυτόν που κοιτά.
    read(
      "getOpportunityForecast.estimate",
      supabase
        .from("opportunity_amounts")
        .select("estimated_value")
        .eq("opportunity_id", opportunityId)
        .maybeSingle(),
      (data) => estimateSchema.parse(data),
    ),
  ]);
  if (!rows.ok || !own.ok) return { ok: false };
  return {
    ok: true,
    data: {
      row: rows.data[0] ?? null,
      estimate: estimate.ok ? (estimate.data?.estimated_value ?? null) : null,
      probability: own.data.probability,
      expectedClose: own.data.expected_close,
    },
  };
}
