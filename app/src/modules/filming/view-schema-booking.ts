import { z } from "zod";

import {
  BOOKING_DAY_STATUSES,
  type BookingDay,
  type BookingHoursView,
  type BookingOptions,
  type SlotCheck,
} from "./booking-types";
import { bookingOptionsSchema } from "./view-schema";

// Σχήμα των JSON των RPC των Κρατήσεων: Ωράριο, επιλογές, μέρες, ώρες και έλεγχος ώρας.
// Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά, πριν φτάσει στην οθόνη.

const clock = z.string().nullable();

const weekDaySchema = z.object({
  dow: z.number(),
  isOpen: z.boolean(),
  opens: clock,
  closes: clock,
});

const exceptionSchema = z.object({
  day: z.string(),
  isClosed: z.boolean(),
  opens: clock,
  closes: clock,
  capacity: z.number().nullable(),
  note: z.string().nullable(),
});

const holidaySchema = z.object({
  day: z.string(),
  name: z.string(),
  movable: z.boolean(),
  isOpen: z.boolean(),
});

export const bookingHoursViewSchema: z.ZodType<BookingHoursView> = z.object({
  isSet: z.boolean(),
  week: z.array(weekDaySchema),
  capacity: z.number(),
  durations: z.array(z.number()),
  stepMinutes: z.number(),
  exceptions: z.array(exceptionSchema),
  holidays: z.array(holidaySchema),
});

export const bookingOptionsViewSchema: z.ZodType<BookingOptions> = z.object({
  isSet: z.boolean(),
  durations: z.array(z.number()),
  stepMinutes: z.number(),
  horizonDays: z.number(),
  agreements: bookingOptionsSchema,
});

export const bookingDaysSchema: z.ZodType<BookingDay[]> = z.array(
  z.object({
    day: z.string(),
    status: z.enum(BOOKING_DAY_STATUSES),
    label: z.string(),
  }),
);

export const bookingSlotsSchema = z.array(z.string());

export const slotCheckSchema: z.ZodType<SlotCheck> = z.object({
  problem: z.string().nullable(),
  load: z.number(),
  capacity: z.number(),
});
