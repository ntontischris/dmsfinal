import { z } from "zod";

// Σχήματα των κλήσεων προς το Google (μόνο τα πεδία που χρειαζόμαστε) και της ουράς της βάσης.
// Ό,τι δεν ταιριάζει δεν περνά: ένα γεγονός με λάθος σχήμα παραλείπεται, δεν σπάει τη σελίδα.

export const calendarCreatedSchema = z.object({ id: z.string().min(1) });

export const eventWriteSchema = z.object({
  id: z.string().min(1),
  etag: z.string().min(1),
});
export type GoogleEventWrite = z.infer<typeof eventWriteSchema>;

export const watchSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  expiration: z.string().min(1),
});
export type GoogleWatch = z.infer<typeof watchSchema>;

const googleEventSchema = z.object({
  id: z.string().min(1),
  etag: z.string().optional(),
  status: z.string().optional(),
  start: z.object({ dateTime: z.string().optional(), date: z.string().optional() }).optional(),
  end: z.object({ dateTime: z.string().optional(), date: z.string().optional() }).optional(),
  organizer: z.object({ email: z.string().optional() }).optional(),
  attendees: z.array(z.object({ email: z.string().optional() })).optional(),
  recurringEventId: z.string().optional(),
  recurrence: z.array(z.string()).optional(),
});
export type GoogleEvent = z.infer<typeof googleEventSchema>;

export const listPageSchema = z.object({
  items: z.array(z.unknown()).default([]),
  nextPageToken: z.string().optional(),
  nextSyncToken: z.string().optional(),
});
export type GoogleListPage = z.infer<typeof listPageSchema>;

// Ένα γεγονός της σελίδας· όποιο δεν ταιριάζει παραλείπεται (επιστρέφεται null).
export const parseGoogleEvent = (raw: unknown): GoogleEvent | null => {
  const parsed = googleEventSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

// Το σώμα που στέλνουμε για εισαγωγή ή ενημέρωση. Ο τίτλος δεν έχει θέση εδώ όταν δεν χρειάζεται.
export interface GoogleEventBody {
  id?: string;
  status: "confirmed";
  summary: string;
  description: string;
  location: string;
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  transparency: "opaque";
}

// Η ουρά: το γεγονός όπως το ετοιμάζει η βάση (ώρα με offset Ώρας Ελλάδας ή ημερομηνία).
const queuedEventSchema = z.object({
  summary: z.string(),
  description: z.string(),
  location: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean(),
});
export type QueuedEvent = z.infer<typeof queuedEventSchema>;

export const claimItemSchema = z.object({
  id: z.number(),
  entity: z.enum(["filming", "blocked"]),
  entityId: z.string(),
  op: z.enum(["upsert", "delete"]),
  eventId: z.string().nullable(),
  event: queuedEventSchema.nullable(),
});
export type ClaimItem = z.infer<typeof claimItemSchema>;

export const claimListSchema = z.array(claimItemSchema);

// Η κατάσταση του worker (google_state): ό,τι χρειάζεται για να αποφασίσει τι κάνει.
export const googleStateSchema = z.object({
  calendarId: z.string().nullable(),
  sharedWith: z.string().nullable(),
  syncToken: z.string().nullable(),
  channelId: z.string().nullable(),
  channelResourceId: z.string().nullable(),
  channelExpiresAt: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
  lastErrorAt: z.string().nullable(),
  newEvent: z.enum(["blocked", "none"]),
  deleteHours: z.number(),
  writePending: z.boolean(),
  pullRequested: z.boolean(),
});
export type GoogleState = z.infer<typeof googleStateSchema>;
