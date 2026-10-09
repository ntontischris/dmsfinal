import { z } from "zod";

import {
  CREW_RESPONSES,
  FILMING_STATES,
  type BookingAgreement,
  type CancelRequestEntry,
  type CrewTemplate,
  type EquipmentCandidate,
  type FilmingQueue,
  type FilmingSettings,
  type MineEntry,
  type PendingEntry,
} from "./types";
import { provisionSchema } from "./view-schema-card";

// Σχήμα των JSON των υπόλοιπων RPC του module: ουρά έγκρισης, «Τα Γυρίσματά μου», επιλογές κράτησης,
// Πρότυπα Συνεργείου, υποψήφιοι, Κανόνες. Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά.

const named = z.object({ id: z.string(), name: z.string() });
const namedOrNull = named.nullable();
const production = z.object({ id: z.string(), title: z.string() });

const pendingSchema: z.ZodType<PendingEntry> = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  createdAt: z.string(),
  waitingHours: z.number(),
  waitingLong: z.boolean(),
  client: namedOrNull,
  production,
  provision: provisionSchema.nullable(),
});

const cancelRequestSchema: z.ZodType<CancelRequestEntry> = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  requestedAt: z.string(),
  reason: z.string(),
  client: namedOrNull,
  production,
  willBurn: z.boolean(),
});

export const queueSchema = z
  .object({
    pending: z.array(pendingSchema),
    cancelRequests: z.array(cancelRequestSchema),
  })
  .transform((queue): FilmingQueue => queue);

const mineSchema: z.ZodType<MineEntry> = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  location: z.string().nullable(),
  state: z.enum(FILMING_STATES),
  note: z.string().nullable(),
  myResponse: z.enum(CREW_RESPONSES),
  myReason: z.string().nullable(),
  production,
  client: namedOrNull,
});

export const mineViewSchema = z.array(mineSchema);

const bookingKindSchema = z.object({
  id: z.string(),
  label: z.string(),
  measure: z.enum(["per_filming", "per_hour", "per_day"]),
  defaultHours: z.number().nullable(),
  balance: z.number().nullable(),
});

const bookingAgreementSchema: z.ZodType<BookingAgreement> = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  client: named,
  noticeHours: z.number(),
  cancelHours: z.number(),
  horizonDays: z.number(),
  bookingNeedsApproval: z.boolean(),
  period: z
    .object({
      id: z.string(),
      n: z.number(),
      starts: z.string(),
      ends: z.string(),
    })
    .nullable(),
  kinds: z.array(bookingKindSchema),
});

export const bookingOptionsSchema = z.array(bookingAgreementSchema);

// Η βάση στέλνει τα μέλη του Προτύπου ως userId· η εφαρμογή τα κρατά ως NamedRef.
const templateMember = z
  .object({ userId: z.string(), name: z.string() })
  .transform((member) => ({ id: member.userId, name: member.name }));

const crewTemplateSchema: z.ZodType<CrewTemplate> = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string().nullable(),
  members: z.array(templateMember),
});

export const crewTemplatesSchema = z.array(crewTemplateSchema);

export const candidatesSchema = z.array(named);

const equipmentCandidateSchema: z.ZodType<EquipmentCandidate> = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  status: z.string(),
  categoryName: z.string(),
});

export const equipmentCandidatesSchema = z.array(equipmentCandidateSchema);

const settingsShape: z.ZodType<FilmingSettings> = z.object({
  bookingNeedsApproval: z.boolean(),
  noAnswerAction: z.enum(["none", "approve", "reject"]),
  noAnswerHours: z.number(),
  horizonDays: z.number(),
  allowOutsidePeriod: z.boolean(),
  rescheduleNeedsApproval: z.boolean(),
  equipmentConflict: z.enum(["warn", "block"]),
  clientSeesEquipment: z.boolean(),
  sheetSending: z.enum(["manual", "auto"]),
  changeResetsConfirmations: z.boolean(),
  doneMarking: z.enum(["manual", "auto"]),
});

export const settingsViewSchema = settingsShape;
