import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { CostMonth, KindUsage } from "./types";

// Ανάγνωση Ρυθμίσεων › Συμφωνίες και Οικονομικά. Και τα δύο περνούν από RPC που δίνει γραμμές
// μόνο σε όποιον δικαιούται («Διαχειρίζεται Ρυθμίσεις», «Βλέπει κόστος και κερδοφορία»).

const usageSchema = z.array(
  z.object({ kind_id: z.string(), uses: z.coerce.number() }),
);

// Πόσες φορές χρησιμοποιείται κάθε είδος Παροχής (το id είναι το κλειδί).
export async function getKindUsage(): Promise<ReadResult<KindUsage>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getKindUsage", supabase.rpc("catalogue_kind_usage"), (data) =>
    Object.fromEntries(
      usageSchema.parse(data).map((row) => [row.kind_id, row.uses]),
    ),
  );
}

const monthsSchema = z.array(
  z.object({
    month: z.string(),
    expenses_total: z.coerce.number(),
    productive_hours: z.coerce.number(),
    hour_cost: z.coerce.number(),
    is_closed: z.boolean(),
    updated_at: z.string(),
    updated_by_name: z.string().nullable(),
  }),
);

// Οι μήνες του Κόστους ώρας, ο νεότερος πρώτος.
export async function listCostMonths(): Promise<ReadResult<CostMonth[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("listCostMonths", supabase.rpc("cost_months_view"), (data) =>
    monthsSchema.parse(data).map((row) => ({
      month: row.month,
      expensesTotal: row.expenses_total,
      productiveHours: row.productive_hours,
      hourCost: row.hour_cost,
      isClosed: row.is_closed,
      updatedAt: row.updated_at,
      updatedByName: row.updated_by_name,
    })),
  );
}
