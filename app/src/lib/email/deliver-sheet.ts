import { z } from "zod";

import { toLocale } from "./locale";
import type { EmailMessageBody } from "./templates/auth-messages";
import { crewDeclinedMessage, sheetIssuedMessage } from "./templates/sheet-messages";

// Τα δύο email του Δελτίου γυρίσματος (#136). Το payload γράφεται από τις συναρτήσεις της ΒΔ (camelCase)·
// ό,τι δεν ταιριάζει δεν στέλνεται και η γραμμή κλείνει ως αποτυχημένη.

export type SheetKind = "sheet_issued" | "crew_declined";

export const isSheetKind = (kind: string): kind is SheetKind =>
  kind === "sheet_issued" || kind === "crew_declined";

const isIsoInstant = (value: string): boolean => !Number.isNaN(Date.parse(value));
const INVALID_PAYLOAD = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const sheetIssuedPayload = z.object({
  filmingId: z.string().min(1),
  version: z.number().int().positive(),
  startsAt: z.string().refine(isIsoInstant),
  hours: z.number().positive(),
  location: z.string().nullish(),
  production: z.string(),
  change: z.string().nullish(),
});

const crewDeclinedPayload = z.object({
  filmingId: z.string().min(1),
  member: z.string().nullish(),
  reason: z.string().nullish(),
  startsAt: z.string().refine(isIsoInstant),
  production: z.string(),
});

export interface SheetRow {
  kind: string;
  to_name: string;
  locale: string;
  payload: Record<string, unknown>;
}

function sheetIssuedFor(row: SheetRow, origin: string): EmailMessageBody | string {
  const parsed = sheetIssuedPayload.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  const data = parsed.data;
  return sheetIssuedMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    filmingId: data.filmingId,
    version: data.version,
    startsAt: data.startsAt,
    hours: data.hours,
    location: data.location ?? null,
    production: data.production,
    change: data.change ?? null,
  });
}

function crewDeclinedFor(row: SheetRow, origin: string): EmailMessageBody | string {
  const parsed = crewDeclinedPayload.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  const data = parsed.data;
  return crewDeclinedMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    filmingId: data.filmingId,
    member: data.member ?? "Ένα μέλος",
    reason: data.reason ?? null,
    startsAt: data.startsAt,
    production: data.production,
  });
}

// Το μήνυμα του είδους· άγνωστο είδος δεν φτάνει εδώ (το ελέγχει το deliver-outbox).
export function sheetMessageFor(row: SheetRow, origin: string): EmailMessageBody | string {
  return row.kind === "sheet_issued" ? sheetIssuedFor(row, origin) : crewDeclinedFor(row, origin);
}
