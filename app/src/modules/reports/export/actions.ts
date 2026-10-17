"use server";

import { z } from "zod";

import { fileName, periodPart } from "@/lib/export/file-name";
import { createSupabase } from "@/lib/supabase/server";
import { signedInvoicePdfUrls } from "@/modules/finance";

import { FINANCE_REPORTS } from "../catalog/finance";
import { SALES_REPORTS } from "../catalog/sales";
import { monthLabel } from "../format";
import { PERIOD_CODES } from "../url";
import { toSheet, type ExportSheet } from "./columns";
import { findDataset, INVOICE_COLUMNS, RECEIPT_COLUMNS } from "./datasets";
import {
  EXPORT_FAILED,
  PACK_SHEET_INVOICES,
  PACK_SHEET_RECEIPTS,
  PDF_MISSING,
} from "./labels";
import type { PackFile, PackPayload } from "./pack";
import {
  exportableReport,
  reportArgs,
  reportFileName,
  reportSheet,
} from "./report-export";
import { parseDatasetExport, parsePack, parsePackInvoice } from "./view-schema";

// Οι ενέργειες της Εξαγωγής. Κάθε μία καλεί ένα RPC που ελέγχει «Εξάγει δεδομένα» και την πηγή, γράφει Ίχνος ΚΑΙ ΜΕΤΑ
// δίνει γραμμές (Ρ7)· εδώ οι γραμμές γίνονται φύλλα (στήλες + κελιά) και το αρχείο το φτιάχνει ο browser (Ρ6).

export type ExportOutcome =
  | { ok: true; fileName: string; sheets: ExportSheet[] }
  | { ok: false; error: string };

export type PackOutcome =
  { ok: true; payload: PackPayload } | { ok: false; error: string };

// Τα signed URLs του Πακέτου ζουν όσο χρειάζεται για να κατέβουν τα PDF ενός μήνα.
const PACK_URL_SECONDS = 300;
const UUID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const formatSchema = z.enum(["xlsx", "csv"]);
const periodSchema = z.enum(PERIOD_CODES);

const datasetInput = z.object({
  dataset: z.string().max(40),
  period: periodSchema.optional(),
  format: formatSchema,
});
const reportInput = z.object({
  reportId: z.string().max(60),
  period: periodSchema.optional(),
  clientId: UUID.optional(),
  sellerId: UUID.optional(),
  format: formatSchema,
});
const packInput = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

const failure = (error: {
  code?: string;
  message: string;
}): { ok: false; error: string } => {
  if (error.code === "P0001") return { ok: false, error: error.message };
  if (error.code === "42501")
    return { ok: false, error: "Δεν έχεις Δικαίωμα για αυτή την εξαγωγή." };
  console.error("reports export", error.message);
  return { ok: false, error: EXPORT_FAILED };
};

async function callExport(name: string, args: Record<string, unknown>) {
  const supabase = await createSupabase();
  if (!supabase)
    return {
      data: null,
      error: { message: "Η βάση δεν έχει συνδεθεί ακόμα." },
    };
  return supabase.rpc(name, args);
}

export async function exportDataset(
  input: z.input<typeof datasetInput>,
): Promise<ExportOutcome> {
  const parsed = datasetInput.safeParse(input);
  const dataset = parsed.success ? findDataset(parsed.data.dataset) : undefined;
  if (!parsed.success || !dataset) return { ok: false, error: EXPORT_FAILED };
  const { data, error } = await callExport("export_dataset", {
    p_dataset: dataset.code,
    p_period: parsed.data.period ?? null,
    p_format: parsed.data.format,
  });
  if (error) return failure(error);
  const result = parseDatasetExport(data);
  return {
    ok: true,
    fileName: fileName(
      [dataset.title, periodPart(result.period)],
      parsed.data.format,
    ),
    sheets: [toSheet(dataset.title, dataset.columns, result.rows)],
  };
}

// Εξαγωγή μιας Αναφοράς της M1 όπως φαίνεται, με τα ίδια φίλτρα. Η Αναφορά βρίσκεται στο μητρώο (και οι Αναφορές του
// Ρβ) και εξάγεται μόνο αν έχει exportSpec· το RPC της το καλεί η βάση, που ελέγχει και τα Δικαιώματά της.
export async function exportReport(
  input: z.input<typeof reportInput>,
): Promise<ExportOutcome> {
  const parsed = reportInput.safeParse(input);
  const report = parsed.success
    ? exportableReport(
        [...FINANCE_REPORTS, ...SALES_REPORTS],
        parsed.data.reportId,
      )
    : undefined;
  if (!parsed.success || !report) return { ok: false, error: EXPORT_FAILED };
  const spec = report.exportSpec;
  const { data, error } = await callExport("export_report", {
    p_report: report.id,
    p_rpc: spec.rpc,
    p_args: reportArgs(spec, parsed.data),
    p_rows_key: spec.rowsKey,
    p_format: parsed.data.format,
  });
  if (error) return failure(error);
  return {
    ok: true,
    fileName: reportFileName(report.title, data, parsed.data.format),
    sheets: [reportSheet(report.title, spec, data)],
  };
}

const packFiles = (
  invoices: readonly unknown[],
  urls: ReadonlyMap<string, string>,
): PackFile[] =>
  invoices.map(parsePackInvoice).map((invoice) => {
    const url = invoice.pdfPath ? (urls.get(invoice.pdfPath) ?? null) : null;
    const missing = url
      ? null
      : invoice.pdfPath
        ? PDF_MISSING.notFound
        : PDF_MISSING.noAmounts;
    return {
      number: invoice.number,
      clientName: invoice.clientName,
      url,
      missing,
    };
  });

// Πακέτο λογιστή (Ρ8): οι γραμμές του μήνα από τη βάση, και signed URLs ΜΟΝΟ για τις διαδρομές PDF που έδωσε η βάση
// σε αυτόν τον Χρήστη. Τα PDF τα κατεβάζει ο browser κατευθείαν από την αποθήκευση· δεν περνούν από εδώ.
export async function prepareAccountantPack(
  input: z.input<typeof packInput>,
): Promise<PackOutcome> {
  const parsed = packInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: EXPORT_FAILED };
  const { data, error } = await callExport("export_accountant_pack", {
    p_month: parsed.data.month,
  });
  if (error) return failure(error);
  const pack = parsePack(data);
  const paths = pack.invoices
    .map(parsePackInvoice)
    .flatMap((invoice) => (invoice.pdfPath ? [invoice.pdfPath] : []));
  const urls = await signedInvoicePdfUrls(paths, PACK_URL_SECONDS);
  return {
    ok: true,
    payload: {
      month: pack.month,
      monthLabel: monthLabel(pack.month),
      isPartial: pack.isPartial,
      invoices: toSheet(PACK_SHEET_INVOICES, INVOICE_COLUMNS, pack.invoices),
      files: packFiles(pack.invoices, urls),
      receipts: toSheet(PACK_SHEET_RECEIPTS, RECEIPT_COLUMNS, pack.receipts),
    },
  };
}
