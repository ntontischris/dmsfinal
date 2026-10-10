import { z } from "zod";

import type { BlockedTime, CalendarData, CalendarLinkStatus } from "./types";

// Τα JSON των RPC του Ημερολογίου, όπως έρχονται από τη βάση. Ό,τι δεν ταιριάζει δεν φτάνει στην οθόνη.

const filmingSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  state: z.string(),
  title: z.string().nullable(),
  isMine: z.boolean(),
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

const teamViewSchema = z
  .object({
    filmings: z.array(filmingSchema),
    blocked: z.array(blockedSchema),
    busy: z.array(busySchema),
    days: z.array(teamDaySchema),
    canBlockOthers: z.boolean(),
    canBook: z.boolean(),
    team: z.array(memberSchema),
  })
  .transform((view): CalendarData => ({ ...view, isTeam: true }));

const clientViewSchema = z
  .object({
    filmings: z.array(filmingSchema),
    days: z.array(clientDaySchema),
    canBook: z.boolean(),
  })
  .transform(
    (view): CalendarData => ({
      isTeam: false,
      filmings: view.filmings,
      blocked: [],
      busy: [],
      days: view.days.map((day) => ({ ...day, holidayName: null })),
      canBlockOthers: false,
      canBook: view.canBook,
      team: [],
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
  canEdit: z.boolean(),
  canConvert: z.boolean(),
});

export const blockedTimeViewSchema = blockedTimeSchema.nullable();

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
});

export const feedSchema = z
  .object({ name: z.string().nullable(), events: z.array(feedEventSchema) })
  .nullable();
