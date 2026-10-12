import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  automationDetailsSchema,
  detailParagraphs,
  type AutomationDetails,
} from "./automation-details";
import { attachmentName, downloadPdf, MISSING_PDF } from "./deliver-invoice";
import { toLocale } from "./locale";
import type { EmailAttachment } from "./send-email";
import type { EmailMessageBody } from "./templates/auth-messages";
import { automationMessage } from "./templates/automation-messages";

// Τα email των Αυτοματισμών (kind «automation», #170, #171). Το payload το γράφει ο επεξεργαστής της ουράς Γεγονότων,
// ήδη αποδομένο στη γλώσσα του παραλήπτη, μαζί με το μπλοκ λεπτομερειών του Γεγονότος και, σε μη απαραίτητο Αυτοματισμό,
// το token διακοπής. Ό,τι δεν ταιριάζει δεν στέλνεται και η γραμμή κλείνει ως αποτυχημένη. Το PDF του Τιμολογίου
// επισυνάπτεται από το ιδιωτικό bucket· αν λείπει, η γραμμή αποτυγχάνει όπως σήμερα.

export const AUTOMATION_KIND = "automation";
const INVALID_PAYLOAD = "Μη έγκυρο περιεχόμενο ειδοποίησης";

export const automationPayloadSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  body: z.string().max(2000),
  link: z
    .string()
    .regex(/^(\/app(\/|\?|$)|https:\/\/\S+$)/)
    .nullish(),
  automationId: z.string().min(1),
  details: automationDetailsSchema.nullish(),
  unsubscribeToken: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullish(),
});

export interface AutomationRow {
  to_name: string;
  locale: string;
  payload: Record<string, unknown>;
}

export type AutomationBody = EmailMessageBody & {
  attachments?: readonly EmailAttachment[];
  headers?: Readonly<Record<string, string>>;
};

// Η δημόσια σελίδα διακοπής, εκτός /app (χωρίς είσοδο).
export const unsubscribeUrl = (origin: string, token: string): string =>
  `${origin}/u/${token}`;

async function invoiceAttachment(
  admin: SupabaseClient,
  details: AutomationDetails | null | undefined,
): Promise<EmailAttachment[] | string> {
  if (details?.kind !== "invoice.registered") return [];
  const content = await downloadPdf(admin, details.pdfPath);
  if (content === null) return MISSING_PDF;
  return [
    { filename: attachmentName(details.docKind, details.number), content },
  ];
}

export async function automationMessageFor(
  admin: SupabaseClient,
  row: AutomationRow,
  origin: string,
): Promise<AutomationBody | string> {
  const parsed = automationPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  const { data } = parsed;
  const locale = toLocale(row.locale);
  const attachments = await invoiceAttachment(admin, data.details);
  if (typeof attachments === "string") return attachments;
  const stopUrl = data.unsubscribeToken
    ? unsubscribeUrl(origin, data.unsubscribeToken)
    : null;
  const message = automationMessage({
    locale,
    origin,
    subject: data.subject,
    body: data.body,
    link: data.link ?? null,
    details: data.details
      ? detailParagraphs(data.details, { locale, origin, name: row.to_name })
      : [],
    unsubscribeUrl: stopUrl,
  });
  return {
    ...message,
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(stopUrl ? { headers: { "List-Unsubscribe": `<${stopUrl}>` } } : {}),
  };
}
