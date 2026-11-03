import { createSupabase } from "@/lib/supabase/server";

import {
  parseMonthExpenses,
  parseProfitRows,
  type MonthExpenses,
  type ProfitRow,
} from "./expenses-schema";
import { read, type ReadResult } from "./read";

// Ανάγνωση Εξόδων (I6) και Κερδοφορίας (I7). Μόνο από RPC, με «Βλέπει κόστος και κερδοφορία».

// Ο μήνας YYYY-MM-01: ό,τι έχει γραφτεί, ο προηγούμενος μήνας (για αντίγραφο) και αν αλλάζει.
export async function getMonthExpenses(
  month: string,
): Promise<ReadResult<MonthExpenses>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getMonthExpenses",
    supabase.rpc("cost_expenses_view", { p_month: month }),
    parseMonthExpenses,
  );
}

// Μία γραμμή ανά Παραγωγή με μήνα κόστους από `from` έως `to` (YYYY-MM-01, άκρα μέσα).
export async function listProfitability(
  from: string,
  to: string,
): Promise<ReadResult<ProfitRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listProfitability",
    supabase.rpc("profitability_view", { p_from: from, p_to: to }),
    parseProfitRows,
  );
}
