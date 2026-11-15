import { z } from "zod";

import { ANSWERS, REQUEST_KINDS } from "./spaces/e2-guide-model";
import { optionalText, REASON_LIMIT, uuid } from "./schemas";

// Οι φόρμες του οδηγού «Εγκρίνω αιτήματα γυρίσματος» (E2 βήματα 1 και 2γ, E3 βήμα 2β, και η επιλογή του Πελάτη).

const KIND_MESSAGE = "Κάτι δεν βρέθηκε. Δοκίμασε από την αρχή.";

export const answerSchema = z.object({
  filmingId: uuid,
  kind: z.enum(REQUEST_KINDS, KIND_MESSAGE),
  answer: z.enum(ANSWERS, "Διάλεξε τι απαντάς."),
  kindLabel: z.string().max(200).catch(""),
});

export const answerReasonSchema = z.object({
  filmingId: uuid,
  kind: z.enum(REQUEST_KINDS, KIND_MESSAGE),
  reason: z
    .string()
    .trim()
    .min(1, "Γράψε στον Πελάτη έναν λόγο.")
    .max(REASON_LIMIT, "Ο λόγος είναι μέχρι 500 χαρακτήρες."),
});

const instant = z.iso.datetime({ offset: true, message: "Μια ώρα δεν είναι έγκυρη." });

export const offerTimesSchema = z.object({
  filmingId: uuid,
  times: z.array(instant).min(1, "Διάλεξε τουλάχιστον μία ώρα.").max(6, "Μέχρι 6 ώρες."),
  note: optionalText(REASON_LIMIT),
});

export const pickOfferSchema = z.object({
  filmingId: uuid,
  startsAt: instant,
});
