import { z } from "zod";

import { toLocale } from "./locale";
import type { EmailMessageBody } from "./templates/auth-messages";
import { automationMessage } from "./templates/automation-messages";

// Τα email των Αυτοματισμών (kind «automation», #170). Το payload το γράφει ο επεξεργαστής της ουράς Γεγονότων,
// ήδη αποδομένο στη γλώσσα του παραλήπτη· ό,τι δεν ταιριάζει δεν στέλνεται και η γραμμή κλείνει ως αποτυχημένη.

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
});

export interface AutomationRow {
  locale: string;
  payload: Record<string, unknown>;
}

export function automationMessageFor(
  row: AutomationRow,
  origin: string,
): EmailMessageBody | string {
  const parsed = automationPayloadSchema.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  return automationMessage({
    locale: toLocale(row.locale),
    origin,
    subject: parsed.data.subject,
    body: parsed.data.body,
    link: parsed.data.link ?? null,
  });
}
