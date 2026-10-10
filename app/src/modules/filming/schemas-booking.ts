import { z } from "zod";

import {
  REASON_LIMIT,
  dateSchema,
  hoursSchema,
  optionalText,
  timeSchema,
  uuid,
} from "./schemas";

// Έλεγχος των φορμών των Κρατήσεων (Ρυθμίσεις, E2, E3, E5) στο όριο του server. Η βάση ελέγχει ξανά.

// Οι διάρκειες που προσφέρει η φόρμα του Ωραρίου (ώρες).
export const BOOKING_DURATION_CHOICES = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8] as const;
export const STEP_CHOICES = [15, 30, 60] as const;

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const HOURS_OPEN_MESSAGE = "Η ανοιχτή μέρα θέλει ώρα ανοίγματος και κλεισίματος, με κλείσιμο μετά το άνοιγμα.";

// Μία μέρα της εβδομάδας: κλειστή δεν έχει ώρες (null), ανοιχτή έχει και τις δύο.
export const weekDaySchema = z
  .object({
    dow: z.number().int().min(1).max(7),
    isOpen: z.boolean(),
    opens: z.string(),
    closes: z.string(),
  })
  .refine(
    (day) => !day.isOpen || (CLOCK.test(day.opens) && CLOCK.test(day.closes) && day.closes > day.opens),
    { message: HOURS_OPEN_MESSAGE, path: ["opens"] },
  )
  .transform((day) => ({
    dow: day.dow,
    isOpen: day.isOpen,
    opens: day.isOpen ? day.opens : null,
    closes: day.isOpen ? day.closes : null,
  }));

export const bookingHoursSchema = z.object({
  week: z.array(weekDaySchema).length(7, "Το Ωράριο θέλει και τις 7 μέρες της εβδομάδας."),
  capacity: z.number().int("Η Χωρητικότητα είναι ακέραιος αριθμός.").min(1, "Η Χωρητικότητα είναι από 1 έως 20.").max(20, "Η Χωρητικότητα είναι από 1 έως 20."),
  durations: z.array(z.number()).min(1, "Διάλεξε τουλάχιστον μία διάρκεια."),
  stepMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
});

const optionalClock = z.string().regex(CLOCK, "Βάλε ώρα σε μορφή ΩΩ:ΛΛ.").or(z.literal(""));

export const exceptionSchema = z
  .object({
    day: dateSchema,
    isClosed: z.boolean(),
    opens: optionalClock,
    closes: optionalClock,
    capacity: z.number().int().min(1, "Η Χωρητικότητα είναι από 1 έως 20.").max(20, "Η Χωρητικότητα είναι από 1 έως 20.").nullable(),
    note: optionalText(REASON_LIMIT),
  })
  .refine((value) => value.isClosed || (value.opens === "") === (value.closes === ""), {
    message: "Η εξαίρεση θέλει και τις δύο ώρες ή καμία.",
    path: ["opens"],
  });

export const dayRefSchema = z.object({ day: dateSchema });

export const holidayToggleSchema = z.object({
  day: dateSchema,
  open: z.boolean(),
});

export const decideRescheduleSchema = z
  .object({
    filmingId: uuid,
    accept: z.enum(["accept", "refuse"]),
    reason: optionalText(REASON_LIMIT),
  })
  .refine((value) => value.accept === "accept" || value.reason !== null, {
    message: "Η απόρριψη θέλει λόγο.",
    path: ["reason"],
  });

export const slotCheckSchema = z.object({
  date: dateSchema,
  time: timeSchema,
  hours: hoursSchema,
  filmingId: uuid.optional(),
});
