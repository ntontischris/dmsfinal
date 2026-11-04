import { z } from "zod";

import { DEFAULT_KIND_COLOR } from "./kind-style";
import type {
  BlockedConflict,
  BlockedKind,
  BlockedTime,
  CalendarData,
  CalendarGoogle,
  CalendarLinkStatus,
} from "./types";

// Τα JSON των RPC του Ημερολογίου, όπως έρχονται από τη βάση. Ό,τι δεν ταιριάζει δεν φτάνει στην οθόνη.

// Το ύφος του Είδους (20261104150000). Με προεπιλογή, ώστε μια βάση χωρίς τη μετάβαση να δίνει ουδέτερο ύφος.
const kindStyleFields = {
  kindColor: z.string().nullable().default(null),
  kindIcon: z.string().nullable().default(null),
};

const filmingSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  state: z.string(),
  title: z.string().nullable(),
  isMine: z.boolean(),
  // Τα Γυρίσματα του Πελάτη δεν έχουν Συνεργείο.
  crewIds: z.array(z.string()).default([]),
});

const blockedSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  allDay: z.boolean(),
  title: z.string().nullable(),
  isMine: z.boolean(),
  kindId: z.string().nullable(),
  kindLabel: z.string().nullable(),
  ...kindStyleFields,
});

const nextStepSchema = z.object({
  id: z.string(),
  day: z.string(),
  step: z.string(),
  opportunityTitle: z.string(),
  clientName: z.string(),
  managerId: z.string().nullable(),
  managerName: z.string().nullable(),
  isMine: z.boolean(),
});

const deadlineSchema = z.object({
  id: z.string(),
  day: z.string(),
  title: z.string(),
  clientName: z.string().nullable(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  isMine: z.boolean(),
});

const busySchema = z.object({
  userId: z.string(),
  userName: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
});

const teamDaySchema = z.object({
  day: z.string(),
  status: z.string(),
  holidayName: z.string().nullable(),
});

const clientDaySchema = z.object({ day: z.string(), status: z.string() });

const memberSchema = z.object({ userId: z.string(), name: z.string() });

const googleSchema: z.ZodType<CalendarGoogle | null> = z
  .object({
    connected: z.boolean(),
    pendingWrites: z.number(),
    lastSyncAt: z.string().nullable(),
    stale: z.boolean(),
  })
  .nullable();

const teamViewSchema = z
  .object({
    filmings: z.array(filmingSchema),
    blocked: z.array(blockedSchema),
    busy: z.array(busySchema),
    nextSteps: z.array(nextStepSchema),
    deadlines: z.array(deadlineSchema),
    days: z.array(teamDaySchema),
    canBlockOthers: z.boolean(),
    canBook: z.boolean(),
    team: z.array(memberSchema),
    people: z.array(memberSchema),
    me: z.string().nullable(),
    google: googleSchema,
  })
  .transform((view): CalendarData => ({ ...view, isTeam: true }));

const clientViewSchema = z
  .object({
    filmings: z.array(filmingSchema),
    days: z.array(clientDaySchema),
    canBook: z.boolean(),
    google: googleSchema,
  })
  .transform(
    (view): CalendarData => ({
      isTeam: false,
      filmings: view.filmings,
      blocked: [],
      busy: [],
      nextSteps: [],
      deadlines: [],
      days: view.days.map((day) => ({ ...day, holidayName: null })),
      canBlockOthers: false,
      canBook: view.canBook,
      team: [],
      people: [],
      me: null,
      google: view.google,
    }),
  );

// Η ομάδα πρώτα: το JSON της ομάδας έχει πάντα `blocked`, το του Πελάτη όχι.
export const calendarViewSchema = z.union([teamViewSchema, clientViewSchema]);

const blockedTimeSchema: z.ZodType<BlockedTime> = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  startsAt: z.string(),
  endsAt: z.string(),
  allDay: z.boolean(),
  title: z.string().nullable(),
  kindId: z.string().nullable(),
  kindLabel: z.string().nullable(),
  ...kindStyleFields,
  canEdit: z.boolean(),
  canConvert: z.boolean(),
});

export const blockedTimeViewSchema = blockedTimeSchema.nullable();

export const blockedKindsSchema: z.ZodType<BlockedKind[]> = z.array(
  z.object({
    id: z.string(),
    label: z.string(),
    retired: z.boolean(),
    color: z.string().default(DEFAULT_KIND_COLOR),
    icon: z.string().nullable().default(null),
    becomesFilming: z.boolean().default(false),
  }),
);

export const blockedConflictsSchema: z.ZodType<BlockedConflict[]> = z.array(
  z.object({
    id: z.string(),
    title: z.string().nullable(),
    startsAt: z.string(),
    endsAt: z.string(),
    state: z.string(),
  }),
);

export const linkStatusSchema: z.ZodType<CalendarLinkStatus> = z.object({
  exists: z.boolean(),
  createdAt: z.string().nullable(),
});

const feedEventSchema = z.object({
  uid: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  summary: z.string(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  allDay: z.boolean(),
});

export const feedSchema = z
  .object({ name: z.string().nullable(), events: z.array(feedEventSchema) })
  .nullable();
