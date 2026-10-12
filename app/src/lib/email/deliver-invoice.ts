import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { toLocale } from "./locale";
import type { EmailAttachment } from "./send-email";
import type { EmailMessageBody } from "./templates/auth-messages";
import { invoiceRegisteredMessage } from "./templates/invoice-messages";

// Το email «Καταχωρήθηκε Τιμολόγιο» (#152, Π7). Το payload γράφεται από τη ΒΔ (camelCase)· ό,τι δεν ταιριάζει δεν στέλνεται.
// Το PDF κατεβαίνει από το ιδιωτικό bucket με τον admin client και επισυνάπτεται. Αν λείπει, η γραμμή κλείνει ως αποτυχημένη.

export const INVOICE_KIND = "invoice_registered";
export const INVOICE_BUCKET = "invoices";
const INVALID_PAYLOAD = "Μη έγκυρο περιεχόμενο ειδοποίησης";
export const MISSING_PDF = "Το PDF του Τιμολογίου δεν βρέθηκε";

export type InvoiceBody = EmailMessageBody & { attachments: readonly EmailAttachment[] };

const payloadSchema = z.object({
  invoiceId: z.string().min(1),
  kind: z.enum(["invoice", "receipt", "credit"]),
  number: z.string().min(1),
  issueDate: z.string().min(1),
  dueDate: z.string().nullable(),
  total: z.number(),
  pdfPath: z.string().regex(/^pending\/[0-9a-f-]{36}\.pdf$/),
});

export interface InvoiceRow {
  to_name: string;
  locale: string;
  payload: Record<string, unknown>;
}

// Όνομα αρχείου χωρίς χαρακτήρες που μπερδεύουν τους πελάτες email.
export const attachmentName = (kind: string, number: string): string =>
  `${kind}-${number.replace(/[^A-Za-z0-9._-]+/g, "_")}.pdf`;

export async function downloadPdf(admin: SupabaseClient, path: string): Promise<string | null> {
  const { data, error } = await admin.storage.from(INVOICE_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer()).toString("base64");
}

export async function invoiceMessageFor(
  admin: SupabaseClient,
  row: InvoiceRow,
  origin: string,
): Promise<InvoiceBody | string> {
  const parsed = payloadSchema.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  const { data } = parsed;
  const content = await downloadPdf(admin, data.pdfPath);
  if (content === null) return MISSING_PDF;
  const message = invoiceRegisteredMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    kind: data.kind,
    number: data.number,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    total: data.total,
  });
  return { ...message, attachments: [{ filename: attachmentName(data.kind, data.number), content }] };
}
