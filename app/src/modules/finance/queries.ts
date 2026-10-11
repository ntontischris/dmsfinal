import { createSupabase } from "@/lib/supabase/server";
import { listClients } from "@/modules/sales";

import { read, type ReadResult } from "./read";
import type { ClientOption, PaymentMethod, ReceiptRow } from "./types";
import { parseMethods, parseReceipts } from "./view-schema";

const CLIENT_OPTIONS_LIMIT = 100;

// Ανάγνωση των Εισπράξεων και των Τρόπων. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή.

export async function listReceipts(clientId: string | null = null): Promise<ReadResult<ReceiptRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listReceipts",
    supabase.rpc("receipts_view", { p_client: clientId }),
    parseReceipts,
  );
}

export async function listPaymentMethods(): Promise<ReadResult<PaymentMethod[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("listPaymentMethods", supabase.rpc("payment_methods_view"), parseMethods);
}

// Πελάτες για τη φόρμα, από τη λίστα Πελατών του sales (το RPC κρίνει το Εύρος και τους ενεργούς).
export async function listClientOptions(): Promise<ReadResult<ClientOption[]>> {
  const result = await listClients({ limit: CLIENT_OPTIONS_LIMIT });
  if (!result.ok) return { ok: false };
  return { ok: true, data: result.data.map(({ id, name }) => ({ id, name })) };
}
