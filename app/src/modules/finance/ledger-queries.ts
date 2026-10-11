import { createSupabase } from "@/lib/supabase/server";

import {
  parseClientInvoices,
  parseLedger,
  parseLedgerClients,
  type ClientInvoicesView,
  type LedgerClient,
  type LedgerView,
} from "./ledger-view-schema";
import { read, type ReadResult } from "./read";

// Ανάγνωση της Καρτέλας και της όψης πελάτη. Όλα περνούν από RPC· η βάση αποφασίζει ποιος βλέπει τι.

// Χωρίς clientId: ο Χρήστης πελάτη παίρνει τη δική του Καρτέλα (η ομάδα πρέπει να διαλέξει Πελάτη).
export async function getLedger(
  clientId?: string,
): Promise<ReadResult<LedgerView>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getLedger",
    supabase.rpc("client_ledger_view", clientId ? { p_client: clientId } : {}),
    parseLedger,
  );
}

export async function getClientInvoices(): Promise<
  ReadResult<ClientInvoicesView>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getClientInvoices",
    supabase.rpc("client_invoices_view"),
    parseClientInvoices,
  );
}

export async function listLedgerClients(): Promise<ReadResult<LedgerClient[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listLedgerClients",
    supabase.rpc("clients_with_finance"),
    parseLedgerClients,
  );
}
