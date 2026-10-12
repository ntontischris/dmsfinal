import { z } from "zod";

import { toLocale } from "./locale";
import type { EmailMessageBody } from "./templates/auth-messages";
import {
  deliverableReminderMessage,
  productionDeliveredMessage,
} from "./templates/completion-messages";

// Τα email ολοκλήρωσης Παραγωγής (#143). Τα payloads γράφονται από τη ΒΔ (camelCase)·
// ό,τι δεν ταιριάζει δεν στέλνεται και η γραμμή κλείνει ως αποτυχημένη.

export const PRODUCTION_DELIVERED_KIND = "production_delivered";
export const DELIVERABLE_REMINDER_KIND = "deliverable_reminder";
const INVALID_PAYLOAD = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const deliveredItemSchema = z.object({
  title: z.string(),
  finalFilesUrl: z.string().nullish(),
  url: z.string().nullish(),
});

const productionDeliveredPayload = z.object({
  productionId: z.string().min(1),
  title: z.string(),
  deliverables: z.array(deliveredItemSchema),
});

const reminderPayload = z.object({
  deliverableId: z.string().min(1),
  title: z.string(),
  production: z.string(),
  version: z.number().int().positive(),
  days: z.number().int().positive(),
});

export interface CompletionRow {
  to_name: string;
  locale: string;
  payload: Record<string, unknown>;
}

// Το link του Παραδοτέου στο email: τα τελικά αρχεία αν υπάρχουν, αλλιώς το link της Έκδοσης.
export const itemUrl = (item: {
  finalFilesUrl?: string | null;
  url?: string | null;
}): string | null =>
  item.finalFilesUrl || item.url || null;

export function productionDeliveredFor(
  row: CompletionRow,
  origin: string,
): EmailMessageBody | string {
  const parsed = productionDeliveredPayload.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  return productionDeliveredMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    productionId: parsed.data.productionId,
    productionTitle: parsed.data.title,
    deliverables: parsed.data.deliverables.map((item) => ({
      title: item.title,
      url: itemUrl(item),
    })),
  });
}

export function deliverableReminderFor(
  row: CompletionRow,
  origin: string,
): EmailMessageBody | string {
  const parsed = reminderPayload.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  return deliverableReminderMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    deliverableId: parsed.data.deliverableId,
    title: parsed.data.title,
    production: parsed.data.production,
    version: parsed.data.version,
    days: parsed.data.days,
  });
}
