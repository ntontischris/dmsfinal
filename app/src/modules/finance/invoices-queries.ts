import { createSupabase } from "@/lib/supabase/server";

import { signedInvoicePdfUrl } from "./invoice-storage";
import { read, type ReadResult } from "./read";
import {
  parseInvoiceContext,
  parseInvoicesView,
  type InvoiceContext,
  type InvoiceFilter,
  type InvoicesView,
} from "./invoices-view-schema";

// Ανάγνωση των Τιμολογίων. Όλα περνούν από RPC: ο πίνακας είναι κλειστός στην εφαρμογή.

export async function getInvoices(
  filter: InvoiceFilter,
): Promise<ReadResult<InvoicesView>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getInvoices",
    supabase.rpc("invoices_view", { p_filter: filter }),
    parseInvoicesView,
  );
}

// Το υπόδειγμα της φόρμας Καταχώρησης: ΑΦΜ, ΦΠΑ, μέρες πληρωμής, «Προς τιμολόγηση» και υπάρχοντα Τιμολόγια του Πελάτη.
export async function getInvoiceContext(
  clientId: string,
): Promise<ReadResult<InvoiceContext>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getInvoiceContext",
    supabase.rpc("invoice_draft_context", { p_client: clientId }),
    parseInvoiceContext,
  );
}

export type PdfLinkResult =
  { ok: true; url: string } | { ok: false; status: 403 | 404 | 500 };

// Η βάση αποφασίζει ποιος παίρνει το PDF (invoice_pdf_path)· ο server φτιάχνει σύνδεσμο που λήγει σε 60″.
export async function getInvoicePdfLink(
  invoiceId: string,
): Promise<PdfLinkResult> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, status: 500 };
  const { data, error } = await supabase.rpc("invoice_pdf_path", {
    p_id: invoiceId,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, status: 403 };
    return { ok: false, status: error.code === "P0001" ? 404 : 500 };
  }
  if (typeof data !== "string") return { ok: false, status: 404 };
  const url = await signedInvoicePdfUrl(data);
  return url ? { ok: true, url } : { ok: false, status: 404 };
}
