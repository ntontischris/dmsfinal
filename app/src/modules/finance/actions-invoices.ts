"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { kickOutbox } from "@/lib/email/outbox-trigger";
import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import {
  messageOf,
  firstIssue,
  pick,
  UNCONFIGURED_TEXT,
} from "./action-support";
import { removeInvoicePdf, uploadInvoicePdf } from "./invoice-storage";
import {
  PDF_FILE_MESSAGE,
  hasPdfHeader,
  invoiceFormKeys,
  invoiceFormSchema,
  pdfFileProblem,
  type InvoiceFormValues,
} from "./invoices-schemas";

// Καταχώρηση Τιμολογίου (I3, #152). Τρία βήματα: (1) η βάση δίνει θέση για το PDF και ελέγχει το Δικαίωμα, (2) ο server
// ανεβάζει το PDF στο ιδιωτικό bucket, (3) η βάση καταχωρεί (προειδοποιήσεις, πιστωτικά, email με PDF).

const REGISTER_FAILED_TEXT = "Η καταχώριση δεν ολοκληρώθηκε. Δοκίμασε ξανά.";

const slotSchema = z.object({ path: z.string().min(1) });
const registeredSchema = z.object({ id: z.string().min(1) });

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
type Step<T> = { ok: true; value: T } | { ok: false; state: FormState };

async function requestSlot(supabase: Supabase): Promise<Step<string>> {
  const { data, error } = await supabase.rpc("invoice_upload_slot");
  if (error) return { ok: false, state: { error: messageOf(error) } };
  const parsed = slotSchema.safeParse(data);
  if (!parsed.success) return { ok: false, state: { error: PDF_FILE_MESSAGE } };
  return { ok: true, value: parsed.data.path };
}

const payloadOf = (values: InvoiceFormValues, path: string) => ({
  clientId: values.clientId,
  kind: values.kind,
  number: values.number,
  issueDate: values.issueDate,
  dueDate: values.dueDate,
  net: values.net,
  vat: values.vat,
  total: values.total,
  mark: values.mark,
  pdfTaxId: values.pdfTaxId,
  creditFor: values.creditFor,
  pdfPath: path,
  taxIdConfirmed: values.taxIdConfirmed,
});

async function registerWithBase(
  supabase: Supabase,
  values: InvoiceFormValues,
  path: string,
): Promise<Step<string>> {
  const { data, error } = await supabase.rpc("invoice_register", {
    p: payloadOf(values, path),
  });
  if (error) {
    // Σβήνουμε το PDF μόνο όταν η βάση απέρριψε ρητά· σε χαμένη απάντηση το Τιμολόγιο ίσως καταχωρήθηκε.
    if (error.code === "P0001" || error.code === "42501") await removeInvoicePdf(path);
    return { ok: false, state: { error: messageOf(error) } };
  }
  const parsed = registeredSchema.safeParse(data);
  if (!parsed.success) return { ok: false, state: { error: REGISTER_FAILED_TEXT } };
  return { ok: true, value: parsed.data.id };
}

// Το αρχείο ως bytes, μόνο αν είναι πράγματι PDF (και όχι απλώς με όνομα .pdf).
async function readPdf(file: FormDataEntryValue | null): Promise<Step<Buffer>> {
  const problem = pdfFileProblem(file);
  if (problem !== null || !(file instanceof File))
    return { ok: false, state: { error: problem ?? PDF_FILE_MESSAGE } };
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasPdfHeader(bytes))
    return { ok: false, state: { error: PDF_FILE_MESSAGE } };
  return { ok: true, value: bytes };
}

export async function registerInvoice(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = invoiceFormSchema.safeParse(pick(form, invoiceFormKeys));
  if (!parsed.success) return firstIssue(parsed.error);
  const pdf = await readPdf(form.get("pdf"));
  if (!pdf.ok) return pdf.state;
  const supabase = await createSupabase();
  if (!supabase) return { error: UNCONFIGURED_TEXT };
  const slot = await requestSlot(supabase);
  if (!slot.ok) return slot.state;
  const stored = await uploadInvoicePdf(slot.value, pdf.value);
  if (!stored.ok) return { error: stored.error };
  const registered = await registerWithBase(supabase, parsed.data, slot.value);
  if (!registered.ok) return registered.state;
  revalidatePath("/app", "layout");
  after(() => kickOutbox());
  return { notice: `Καταχωρήθηκε το ${parsed.data.number}.` };
}
