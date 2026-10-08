import { z } from "zod";

import {
  PERCENT_RULE,
  int,
  nullableInt,
  numberField,
  optionalMoney,
  text,
} from "./schemas-parts";

// Έλεγχος των τεσσάρων φορμών Ρυθμίσεων › Συμφωνίες (O3) στο όριο του server.
// Αριθμοί φτάνουν ως κείμενο (ελληνικό πληκτρολόγιο: «12,5»). Κενό πεδίο = «δεν αλλάζει» όπου η βάση το επιτρέπει.

const SET_MESSAGE = "Διάλεξε μηνιαίες ή εφάπαξ Συμφωνίες.";
const UNUSED_MESSAGE = "Διάλεξε τι γίνεται με τις αχρησιμοποίητες Παροχές.";
const RENEWAL_MESSAGE = "Διάλεξε τι γίνεται στη λήξη.";
const YES_NO_MESSAGE = "Διάλεξε ναι ή όχι.";
const DURATION_MESSAGE = "Η Διάρκεια είναι από 1 έως 60 μήνες.";
const ROUNDS_MESSAGE = "Το Όριο αλλαγών είναι από 1 έως 20 γύροι, ή κενό.";
const UNREADABLE = "Τα στοιχεία δεν διαβάστηκαν· δοκίμασε ξανά.";

// «» = δεν αλλάζει (null): η βάση κρατά την τρέχουσα τιμή.
const optionalChoice = <T extends readonly [string, ...string[]]>(
  values: T,
  message: string,
) =>
  z
    .enum(values, message)
    .or(z.literal(""))
    .transform((value) => (value === "" ? null : value));

const yesNo = z
  .enum(["yes", "no"], YES_NO_MESSAGE)
  .transform((value) => value === "yes");

const durationMonths = text.transform((value, ctx): number | null => {
  if (value === "") return null;
  const parsed = /^\d{1,3}$/.test(value) ? Number(value) : Number.NaN;
  if (parsed >= 1 && parsed <= 60) return parsed;
  ctx.addIssue({ code: "custom", message: DURATION_MESSAGE });
  return z.NEVER;
});

export const saveTermsSchema = z.object({
  set: z.enum(["monthly", "one_off"], SET_MESSAGE),
  paymentDays: int(0, 365),
  unusedProvisions: optionalChoice(
    ["lost", "next_period", "accumulate"],
    UNUSED_MESSAGE,
  ),
  graceDays: nullableInt(0, 365),
  durationMonths,
  renewal: optionalChoice(["new_opportunity", "auto"], RENEWAL_MESSAGE),
  dissolutionNoticeDays: nullableInt(0, 365),
  // Απουσία = ο θεατής δεν «Βλέπει ποσά»: δεν στέλνεται, άρα δεν αλλάζει.
  dissolutionFee: optionalMoney.transform((value) => value ?? null),
});

export const savePolicySchema = z.object({
  filmingNoticeHours: int(0, 720),
  filmingCancelHours: int(0, 720),
  lateCancelBurns: yesNo,
  noShowBurns: yesNo,
});

export const savePricingSchema = z
  .object({
    proposalValidityDays: int(1, 365),
    advancePercent: numberField(PERCENT_RULE),
    standardDiscountPercent: numberField(PERCENT_RULE),
    standardDiscountMonths: int(0, 60),
  })
  .refine(
    (v) => v.standardDiscountPercent > 0 === v.standardDiscountMonths > 0,
    {
      message: "Η έκπτωση θέλει και ποσοστό και μήνες.",
      path: ["standardDiscountMonths"],
    },
  );

const roundsItem = z.object(
  {
    kindId: z.uuid(UNREADABLE),
    rounds: z
      .number(ROUNDS_MESSAGE)
      .int(ROUNDS_MESSAGE)
      .min(1, ROUNDS_MESSAGE)
      .max(20, ROUNDS_MESSAGE)
      .nullable(),
  },
  UNREADABLE,
);

// [{kindId, rounds|null}]: το null σημαίνει «χωρίς γύρους αλλαγών» και στέλνεται ως έχει στη βάση.
export const revisionLimitsInputSchema = z
  .string()
  .transform((value, ctx): unknown => {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed;
    } catch {
      ctx.addIssue({ code: "custom", message: UNREADABLE });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(roundsItem, UNREADABLE)
      .refine(
        (list) => new Set(list.map((l) => l.kindId)).size === list.length,
        "Κάθε είδος Παροχής μπαίνει μία φορά.",
      ),
  );
