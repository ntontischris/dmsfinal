import { z } from "zod";

import { parseDecimal } from "./helpers";
import { moneySchema } from "./schemas";

// Έλεγχος των φορμών Ρυθμίσεων › Συμφωνίες (O3) και Οικονομικά (O6) στο όριο του server.
// Τα μηνύματα είναι αυτά που βλέπει ο χρήστης· αριθμοί φτάνουν ως κείμενο (ελληνικό πληκτρολόγιο: «1,3»).

const MIN_DEFAULT_HOURS = 0.5;
const MAX_DEFAULT_HOURS = 24;
const MAX_PRODUCTIVE_HOURS = 10_000;
const MAX_MULTIPLIER = 20;
const MULTIPLIER_ORDER =
  "Οι πολλαπλασιαστές ξεκινούν από 1 και ανεβαίνουν: ελάχιστη, στόχος, μέγιστη.";
const MULTIPLIER_NUMBER = "Γράψε πολλαπλασιαστή, π.χ. 1,3.";

// Δεκαδικά με ανοχή στο σφάλμα κινητής υποδιαστολής (4,1 * 10 = 41,00000000000001)· ίδιος κανόνας με το schemas.ts.
// Οι στήλες της βάσης (default_hours numeric(4,1), productive_hours numeric(7,1)) κρατούν 1 δεκαδικό και
// θα στρογγύλευαν σιωπηλά το «2,25», οπότε ο server το λέει στον χρήστη αντί να αλλάξει την τιμή του.
const hasAtMostDecimals = (value: number, places: number): boolean => {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

const required = (message: string) => z.string().trim().min(1, message);
const ENGLISH_NEEDED = "Γράψε και τα αγγλικά: το είδος φαίνεται στον πελάτη.";

const MEASURE_MESSAGE = "Διάλεξε Τρόπο μέτρησης.";
const MEASURES = ["per_filming", "per_hour", "per_day"] as const;
type MeasureValue = (typeof MEASURES)[number];

const isMeasure = (value: string): value is MeasureValue =>
  MEASURES.some((measure) => measure === value);

// Όχι z.union([literal(""), enum]): το union καταπίνει το μήνυμα του enum και βγαίνει «Invalid input».
// Ένα string με έναν έλεγχο δίνει πάντα το ελληνικό μήνυμα· «» = μέτρηση σε πλήθος (null).
const measure = z
  .string(MEASURE_MESSAGE)
  .transform((value, ctx): MeasureValue | null => {
    if (value === "") return null;
    if (isMeasure(value)) return value;
    ctx.addIssue({ code: "custom", message: MEASURE_MESSAGE });
    return z.NEVER;
  });

// Κενό = δεν υπάρχει προεπιλεγμένη διάρκεια· αλλιώς ώρες από 0,5 έως 24 με το πολύ 1 δεκαδικό.
const defaultHours = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const hours = parseDecimal(value);
    const isInRange =
      hours !== null &&
      hours >= MIN_DEFAULT_HOURS &&
      hours <= MAX_DEFAULT_HOURS;
    if (isInRange && !hasAtMostDecimals(hours, 1)) {
      ctx.addIssue({
        code: "custom",
        message: "Η προεπιλεγμένη διάρκεια έχει το πολύ 1 δεκαδικό.",
      });
      return z.NEVER;
    }
    if (isInRange) return hours;
    ctx.addIssue({
      code: "custom",
      message: "Η προεπιλεγμένη διάρκεια είναι από 0,5 έως 24 ώρες.",
    });
    return z.NEVER;
  });

export const kindFieldsSchema = z
  .object({
    label: required("Γράψε την ετικέτα."),
    labelEn: required(ENGLISH_NEEDED),
    unit: required("Γράψε τη μονάδα, π.χ. reels."),
    unitEn: required(ENGLISH_NEEDED),
    measure,
    defaultHours,
  })
  .refine((v) => v.defaultHours === null || v.measure !== null, {
    message: "Η προεπιλεγμένη διάρκεια θέλει Τρόπο μέτρησης.",
    path: ["defaultHours"],
  });

export const updateKindSchema = kindFieldsSchema.safeExtend({
  id: z.uuid("Το είδος Παροχής δεν βρέθηκε."),
});
export const kindRefSchema = z.object({
  id: z.uuid("Το είδος Παροχής δεν βρέθηκε."),
});
export const moveKindSchema = z.object({
  id: z.uuid("Το είδος Παροχής δεν βρέθηκε."),
  direction: z.enum(["up", "down"], "Άγνωστη κατεύθυνση."),
});

const number = (message: string) =>
  z
    .string()
    .trim()
    .transform((value) => parseDecimal(value))
    .refine((value): value is number => value !== null, message);

export const saveCostMonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Διάλεξε μήνα."),
  expensesTotal: moneySchema,
  productiveHours: number("Γράψε ώρες, π.χ. 220.")
    .refine(
      (value) => hasAtMostDecimals(value, 1),
      "Οι παραγωγικές ώρες έχουν το πολύ 1 δεκαδικό.",
    )
    .refine(
      (value) => value > 0 && value <= MAX_PRODUCTIVE_HOURS,
      "Οι παραγωγικές ώρες είναι πάνω από 0 και έως 10.000.",
    ),
});

const multiplier = number(MULTIPLIER_NUMBER).refine(
  (value) => value > 0,
  MULTIPLIER_ORDER,
);

export const saveMultipliersSchema = z
  .object({ min: multiplier, target: multiplier, max: multiplier })
  .refine(
    (v) =>
      v.min >= 1 &&
      v.min <= v.target &&
      v.target <= v.max &&
      v.max <= MAX_MULTIPLIER,
    { message: MULTIPLIER_ORDER },
  );
