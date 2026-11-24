import { createSupabase } from "@/lib/supabase/server";

import {
  parseInvoiceDetail,
  parseInvoicePayments,
  parseVoidedInvoices,
  type InvoiceDetail,
  type InvoicePayments,
  type VoidedItem,
} from "./invoice-detail-schema";
import {
  parseReminderPreview,
  parseReminders,
  type Reminder,
  type ReminderPreview,
} from "./invoice-reminder-schema";
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

// Η βάση φιλτράρει all/unpaid/overdue/credit· τα «εξοφλημένα» βγαίνουν στη σελίδα από το «all».
export async function getInvoices(
  filter: Exclude<InvoiceFilter, "paid">,
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

// Η σελίδα διόρθωσης (I3 με ?invoice=): στοιχεία, Ίχνος (όποιος το δικαιούται) και τι επιτρέπεται.
export async function getInvoiceDetail(
  invoiceId: string,
): Promise<ReadResult<InvoiceDetail>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getInvoiceDetail",
    supabase.rpc("invoice_detail", { p_id: invoiceId }),
    parseInvoiceDetail,
  );
}

// Η σελίδα Τιμολογίου (I8, d3): πληρωμές, υπόλοιπο, Συμφωνίες και Παραγωγές. Η μέρα έρχεται από τον server (p_today).
export async function getInvoicePayments(
  invoiceId: string,
  today: string,
): Promise<ReadResult<InvoicePayments>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getInvoicePayments",
    supabase.rpc("invoice_payments", { p_id: invoiceId, p_today: today }),
    parseInvoicePayments,
  );
}

// Τ4: το email υπενθύμισης όπως θα φύγει (παραλήπτες, θέμα, κείμενο) και πότε έφυγε η τελευταία.
export async function getReminderPreview(
  invoiceId: string,
): Promise<ReadResult<ReminderPreview>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getReminderPreview",
    supabase.rpc("invoice_reminder_preview", { p_id: invoiceId }),
    parseReminderPreview,
  );
}

// Τ4: οι υπενθυμίσεις του Τιμολογίου (αυτόματες και με το χέρι), νεότερη πρώτα.
export async function getInvoiceReminders(
  invoiceId: string,
): Promise<ReadResult<Reminder[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getInvoiceReminders",
    supabase.rpc("invoice_reminders", { p_id: invoiceId }),
    parseReminders,
  );
}

// Η κάρτα «Ακυρωμένες καταχωρίσεις» του I2.
export async function getVoidedInvoices(): Promise<ReadResult<VoidedItem[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getVoidedInvoices",
    supabase.rpc("invoices_voided_view"),
    parseVoidedInvoices,
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
