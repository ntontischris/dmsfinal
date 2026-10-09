import { z } from "zod";

import { athensToIso } from "./helpers-time";
import { FILMING_TABS } from "./types";

// Έλεγχος των φορμών και των φίλτρων του module στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.
// Η βάση ελέγχει ξανά· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα. Οι ώρες έρχονται ως κείμενο (με κόμμα ή τελεία).

const text = z.string().trim();
const uuid = z.uuid("Κάτι δεν βρέθηκε. Δοκίμασε από την αρχή.");
const REASON_LIMIT = 500;
const LOCATION_LIMIT = 200;

const reason = text.max(REASON_LIMIT, "Ο λόγος είναι μέχρι 500 χαρακτήρες.");
const requiredReason = (message: string) => reason.min(1, message);
const optionalText = (limit: number) =>
  text
    .max(limit, `Το κείμενο είναι μέχρι ${limit} χαρακτήρες.`)
    .transform((value) => value || null);

const DATE_MESSAGE = "Διάλεξε ημερομηνία.";
const TIME_MESSAGE = "Βάλε ώρα σε μορφή ΩΩ:ΛΛ.";

// Ημερομηνία «ΕΕΕΕ-ΜΜ-ΗΗ» που υπάρχει πραγματικά (η Date δέχεται και 31 Φεβρουαρίου, γι' αυτό ξαναγράφεται).
const isRealDay = (value: string): boolean => {
  const instant = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === value
  );
};

export const dateSchema = text
  .regex(/^\d{4}-\d{2}-\d{2}$/, DATE_MESSAGE)
  .refine(
    (value) =>
      isRealDay(value),
    DATE_MESSAGE,
  );

export const timeSchema = text.regex(/^([01]\d|2[0-3]):[0-5]\d$/, TIME_MESSAGE);

// Διάρκεια σε ώρες: από 0,5 έως 12, βήμα 0,5. Δέχεται κόμμα ή τελεία.
export const HOURS_MESSAGE =
  "Η διάρκεια είναι από 0,5 έως 12 ώρες, ανά μισή ώρα.";
export const hoursSchema = text
  .transform((value) => Number(value.replace(",", ".")))
  .pipe(
    z
      .number(HOURS_MESSAGE)
      .min(0.5, HOURS_MESSAGE)
      .max(12, HOURS_MESSAGE)
      .refine((value) => Number.isInteger(value * 2), HOURS_MESSAGE),
  );

// Πραγματικές ώρες (στο «έγινε»): από 0,5 έως 24.
export const actualHoursSchema = text
  .transform((value) => Number(value.replace(",", ".")))
  .pipe(
    z
      .number("Βάλε τις πραγματικές ώρες.")
      .min(0.5, "Οι πραγματικές ώρες είναι από 0,5 έως 24.")
      .max(24, "Οι πραγματικές ώρες είναι από 0,5 έως 24.")
      .refine(
        (value) => Number.isInteger(value * 2),
        "Οι πραγματικές ώρες ανά μισή ώρα.",
      ),
  );

// Η ημερομηνία και η ώρα του Γυρίσματος γίνονται στιγμή της Αθήνας (timestamptz).
const startsAtFields = z.object({ date: dateSchema, time: timeSchema });

export const listFilterSchema = z.object({
  tab: z.enum(FILMING_TABS).catch("open"),
});

const optionalUuid = z
  .union([z.literal(""), uuid])
  .transform((value) => (value === "" ? null : value));

export const bookSchema = startsAtFields
  .extend({
    agreementId: uuid,
    hours: hoursSchema,
    kindId: optionalUuid,
    location: optionalText(LOCATION_LIMIT),
    note: optionalText(REASON_LIMIT),
  })
  .transform(({ date, time, ...rest }) => ({
    ...rest,
    startsAt: athensToIso(date, time),
  }));

export const internalBookSchema = startsAtFields
  .extend({
    productionId: uuid,
    hours: hoursSchema,
    location: optionalText(LOCATION_LIMIT),
    note: optionalText(REASON_LIMIT),
  })
  .transform(({ date, time, ...rest }) => ({
    ...rest,
    startsAt: athensToIso(date, time),
  }));

export const filmingRefSchema = z.object({ filmingId: uuid });

export const rejectSchema = z.object({
  filmingId: uuid,
  reason: requiredReason("Η απόρριψη θέλει λόγο."),
});

export const cancelSchema = z.object({
  filmingId: uuid,
  reason: requiredReason("Η ακύρωση θέλει λόγο."),
});

export const undoSchema = z.object({
  filmingId: uuid,
  reason: requiredReason("Η αναίρεση θέλει λόγο."),
});

export const rescheduleSchema = startsAtFields
  .extend({ filmingId: uuid, hours: hoursSchema })
  .transform(({ date, time, ...rest }) => ({
    ...rest,
    startsAt: athensToIso(date, time),
  }));

export const doneSchema = z.object({
  filmingId: uuid,
  actualHours: actualHoursSchema,
});

export const decideCancelSchema = z.object({
  filmingId: uuid,
  accept: z.enum(["accept", "refuse"]),
  reason: optionalText(REASON_LIMIT),
});

export const crewSetSchema = z.object({
  filmingId: uuid,
  userIds: z.array(uuid),
});

export const crewRespondSchema = z
  .object({
    filmingId: uuid,
    response: z.enum(["confirmed", "declined"]),
    reason: optionalText(REASON_LIMIT),
  })
  .refine((value) => value.response === "confirmed" || value.reason !== null, {
    message: "Το «δεν μπορώ» θέλει λόγο.",
    path: ["reason"],
  });

export const crewTemplateSchema = z.object({
  templateId: z
    .union([z.literal(""), uuid])
    .transform((value) => value || null),
  name: text
    .min(1, "Γράψε όνομα για το Πρότυπο.")
    .max(100, "Το όνομα είναι μέχρι 100 χαρακτήρες."),
  note: optionalText(REASON_LIMIT),
  userIds: z.array(uuid).min(1, "Το Πρότυπο θέλει τουλάχιστον ένα μέλος."),
});

export const crewTemplateRefSchema = z.object({ templateId: uuid });

export const equipmentSetSchema = z.object({
  filmingId: uuid,
  itemIds: z.array(uuid),
});

export const equipmentTemplateApplySchema = z.object({
  filmingId: uuid,
  templateId: uuid,
});

export const reservationSchema = z.object({
  itemId: uuid,
  filmingId: uuid,
});

export const settingsSchema = z.object({
  bookingNeedsApproval: z.boolean(),
  noAnswerAction: z.enum(["none", "approve", "reject"]),
  noAnswerHours: z.number().int().min(1).max(720),
  horizonDays: z.number().int().min(1).max(365),
  allowOutsidePeriod: z.boolean(),
  rescheduleNeedsApproval: z.boolean(),
  equipmentConflict: z.enum(["warn", "block"]),
  clientSeesEquipment: z.boolean(),
  sheetSending: z.enum(["manual", "auto"]),
  changeResetsConfirmations: z.boolean(),
  doneMarking: z.enum(["manual", "auto"]),
});
