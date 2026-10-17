import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "../read";
import type { PeriodCode } from "../url";
import {
  parseHistory,
  parseOverview,
  type ExportHistory,
  type ExportOverview,
} from "./view-schema";

// Ανάγνωση της M2. Η βάση αποφασίζει ποια σύνολα βλέπει ο Χρήστης, πόσες γραμμές έχουν και ποιες εξαγωγές του φαίνονται.

export async function getExportOverview(
  period: PeriodCode,
): Promise<ReadResult<ExportOverview>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getExportOverview",
    supabase.rpc("export_datasets", { p_period: period }),
    parseOverview,
  );
}

export async function getExportHistory(): Promise<ReadResult<ExportHistory>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getExportHistory",
    supabase.rpc("export_history", { p_limit: 50 }),
    parseHistory,
  );
}
