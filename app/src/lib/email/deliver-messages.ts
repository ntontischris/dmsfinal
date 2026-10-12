import { z } from "zod";

import { toLocale } from "./locale";
import type { EmailMessageBody } from "./templates/auth-messages";
import {
  messageDigestMessage,
  requestClosedMessage,
} from "./templates/message-messages";

// Τα email των Μηνυμάτων (#164): σύνοψη αδιάβαστων και κλείσιμο Αιτήματος. Τα payloads γράφονται από τη ΒΔ (camelCase)·
// ό,τι δεν ταιριάζει δεν στέλνεται και η γραμμή κλείνει ως αποτυχημένη.

export const DIGEST_KIND = "message_digest";
export const REQUEST_CLOSED_KIND = "request_closed";
const INVALID_PAYLOAD = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const digestPayload = z.object({
  clientName: z.string(),
  count: z.number().int().positive(),
});

const closedPayload = z.object({
  clientName: z.string(),
  kind: z.enum(["deliverable", "filming", "other"]),
  outcome: z.enum(["done", "rejected"]),
  reply: z.string().nullish(),
  comment: z.string().nullish(),
  link: z
    .string()
    .regex(/^https:\/\/\S+$/)
    .nullish(),
  deliverableId: z.string().min(1).nullish(),
});

export interface MessageRow {
  to_name: string;
  locale: string;
  payload: Record<string, unknown>;
}

export function digestMessageFor(
  row: MessageRow,
  origin: string,
): EmailMessageBody | string {
  const parsed = digestPayload.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  return messageDigestMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    clientName: parsed.data.clientName,
    count: parsed.data.count,
  });
}

export function requestClosedFor(
  row: MessageRow,
  origin: string,
): EmailMessageBody | string {
  const parsed = closedPayload.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  const { data } = parsed;
  return requestClosedMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    clientName: data.clientName,
    kind: data.kind,
    outcome: data.outcome,
    reply: data.reply ?? null,
    comment: data.comment ?? null,
    link: data.link ?? null,
    deliverableId: data.deliverableId ?? null,
  });
}
