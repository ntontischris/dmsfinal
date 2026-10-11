import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import { parseBillablesView, type BillablesView } from "./view-schema";

// Το «Προς τιμολόγηση» έρχεται από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή.
export async function getBillables(): Promise<ReadResult<BillablesView>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getBillables",
    supabase.rpc("billables_view"),
    parseBillablesView,
  );
}
