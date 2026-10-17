"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/lib/form-state";
import { rpcMessage } from "@/lib/rpc-error";
import { createSupabase } from "@/lib/supabase/server";
import { signedInvoicePdfUrls } from "@/modules/finance";

import { EXPORT_FAILED, PDF_MISSING } from "./labels";
import {
  anonymizeInputSchema,
  completeInputSchema,
  exportInputSchema,
  exportSchema,
  requestInputSchema,
  type ExportRow,
} from "./schemas";
import type { GdprPayload, GdprPdf } from "./zip";

// Οι ενέργειες των Αιτημάτων GDPR. Κάθε κανόνας (μόνο ο Ιδιοκτήτης, προθεσμία, «δεν γίνεται», όνομα) τον επιβάλλει η
// βάση· εδώ μόνο η μορφή της φόρμας και η μετάφραση της άρνησης.

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
// Τα signed URLs ζουν όσο χρειάζεται για να κατέβουν τα PDF ενός Πελάτη.
const PDF_URL_SECONDS = 300;

const firstIssue = (error: {
  issues: readonly { message: string }[];
}): string => error.issues[0]?.message ?? "Κάτι λείπει από τη φόρμα.";

const revalidateGdpr = (): void => revalidatePath("/app", "layout");

export async function createGdprRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = requestInputSchema.safeParse({
    kind: form.get("kind"),
    subject: form.get("subject") ?? "",
    receivedOn: form.get("receivedOn") ?? "",
    note: form.get("note") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("gdpr_request_create", {
    p_kind: parsed.data.kind,
    p_subject_kind: parsed.data.subject.kind,
    p_subject_id: parsed.data.subject.id,
    p_received_on: parsed.data.receivedOn,
    p_note: parsed.data.note,
  });
  if (error) return { error: rpcMessage(error, "Το αίτημα δεν καταγράφηκε.") };
  revalidateGdpr();
  return { notice: "Το αίτημα καταγράφηκε. Η προθεσμία μετρά από τη λήψη." };
}

export async function completeGdprRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = completeInputSchema.safeParse({
    id: form.get("id"),
    completedOn: form.get("completedOn") ?? "",
    note: form.get("note") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("gdpr_request_complete", {
    p_id: parsed.data.id,
    p_completed_on: parsed.data.completedOn,
    p_note: parsed.data.note === "" ? null : parsed.data.note,
  });
  if (error) return { error: rpcMessage(error, "Το αίτημα δεν ολοκληρώθηκε.") };
  revalidateGdpr();
  return { notice: "Το αίτημα ολοκληρώθηκε." };
}

export async function anonymizeSubject(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = anonymizeInputSchema.safeParse({
    subjectKind: form.get("subjectKind"),
    subjectId: form.get("subjectId"),
    typedName: form.get("typedName") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data, error } = await supabase.rpc("gdpr_anonymize", {
    p_subject_kind: parsed.data.subjectKind,
    p_subject_id: parsed.data.subjectId,
    p_typed_name: parsed.data.typedName,
  });
  if (error) return { error: rpcMessage(error, "Η ανωνυμοποίηση δεν έγινε.") };
  revalidateGdpr();
  const name =
    typeof data === "object" && data && "name" in data ? String(data.name) : "";
  return { notice: `Ανωνυμοποιήθηκε. Από εδώ και πέρα φαίνεται ως «${name}».` };
}

export type ExportOutcome =
  { ok: true; payload: GdprPayload } | { ok: false; error: string };

const athensToday = (): string =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Athens" }).format(
    new Date(),
  );

const invoicePdfs = (
  rows: readonly ExportRow[],
  urls: ReadonlyMap<string, string>,
): GdprPdf[] =>
  rows.map((row) => {
    const path = typeof row.pdfPath === "string" ? row.pdfPath : null;
    const url = path ? (urls.get(path) ?? null) : null;
    return {
      number: String(row.number ?? ""),
      url,
      missing: url ? null : PDF_MISSING.notFound,
    };
  });

// Ν7: η βάση γράφει Ίχνος και δίνει τις ενότητες· signed URLs ΜΟΝΟ για τις διαδρομές PDF που έδωσε. Το ZIP το φτιάχνει
// ο browser, άρα τίποτα μεγάλο δεν περνά από εδώ.
export async function prepareGdprExport(input: {
  subjectKind: string;
  subjectId: string;
}): Promise<ExportOutcome> {
  const parsed = exportInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: EXPORT_FAILED };
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, error: EXPORT_FAILED };
  const { data, error } = await supabase.rpc("gdpr_export", {
    p_subject_kind: parsed.data.subjectKind,
    p_subject_id: parsed.data.subjectId,
  });
  if (error) return { ok: false, error: rpcMessage(error, EXPORT_FAILED) };
  const exported = exportSchema.safeParse(data);
  if (!exported.success) return { ok: false, error: EXPORT_FAILED };
  const invoices = exported.data.sections.invoices;
  const rows = Array.isArray(invoices) ? invoices : [];
  const paths = rows.flatMap((row) =>
    typeof row.pdfPath === "string" ? [row.pdfPath] : [],
  );
  const urls = await signedInvoicePdfUrls(paths, PDF_URL_SECONDS);
  return {
    ok: true,
    payload: {
      data: exported.data,
      exportedOn: athensToday(),
      pdfs: invoicePdfs(rows, urls),
    },
  };
}
