import { z } from "zod";

import { isAmbiguousGrouping, parseDecimal } from "./helpers";

// Έλεγχος των φορμών του Καταλόγου στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.
// Ποσά και ώρες φτάνουν ως κείμενο (ελληνικό πληκτρολόγιο: «1300,50») και περνούν από το parseDecimal.

const text = z.string().trim();
const MAX_MONEY = 10_000_000; // numeric(12,2) < 10.000.000 στη βάση (price, direct_cost)
const MAX_HOURS = 999; // numeric(6,1) 0–999 στη βάση
const MONEY_MESSAGE = "Γράψε ποσό, π.χ. 1300 ή 1300,50.";
const MONEY_AMBIGUOUS_MESSAGE =
  "Γράψε το ποσό χωρίς τελεία χιλιάδων, π.χ. 1300 ή 1300,50.";
const MONEY_INVALID_MESSAGE = "Το ποσό δεν είναι έγκυρο.";
const MONEY_MAX_MESSAGE = "Το ποσό πρέπει να είναι μικρότερο από 10.000.000 €.";
const MONEY_DECIMALS_MESSAGE = "Το ποσό έχει το πολύ 2 δεκαδικά.";
const HOURS_MESSAGE = "Γράψε ώρες, π.χ. 6 ή 6,5.";
const HOURS_AMBIGUOUS_MESSAGE =
  "Γράψε τις ώρες χωρίς τελεία χιλιάδων, π.χ. 1500 ή 6,5.";
const HOURS_INVALID_MESSAGE =
  "Οι ώρες είναι από 0 έως 999, με ένα δεκαδικό το πολύ.";

// Δεκαδικά με ανοχή στο σφάλμα κινητής υποδιαστολής (1300,55 * 100 = 130055,00000000001).
const hasDecimals = (value: number, places: number): boolean => {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

type NumberIssues = (value: number) => string | null;

// Ένα βήμα: το κείμενο γίνεται αριθμός ή δίνει ΕΝΑ ελληνικό μήνυμα (ποτέ δεύτερο από refine πάνω στο z.NEVER).
const readNumber = (
  value: string,
  messages: { unreadable: string; ambiguous: string },
  rangeIssue: NumberIssues,
  ctx: z.RefinementCtx,
): number => {
  const fail = (message: string): never => {
    ctx.addIssue({ code: "custom", message });
    return z.NEVER;
  };
  if (isAmbiguousGrouping(value)) return fail(messages.ambiguous);
  const parsed = parseDecimal(value);
  if (parsed === null) return fail(messages.unreadable);
  const issue = rangeIssue(parsed);
  return issue === null ? parsed : fail(issue);
};

const moneyIssue: NumberIssues = (value) => {
  if (value < 0) return MONEY_INVALID_MESSAGE;
  if (value >= MAX_MONEY) return MONEY_MAX_MESSAGE;
  return hasDecimals(value, 2) ? null : MONEY_DECIMALS_MESSAGE;
};
const hoursIssue: NumberIssues = (value) =>
  value >= 0 && value <= MAX_HOURS && hasDecimals(value, 1)
    ? null
    : HOURS_INVALID_MESSAGE;

const readMoney = (value: string, ctx: z.RefinementCtx): number =>
  readNumber(
    value,
    { unreadable: MONEY_MESSAGE, ambiguous: MONEY_AMBIGUOUS_MESSAGE },
    moneyIssue,
    ctx,
  );
const readHours = (value: string, ctx: z.RefinementCtx): number =>
  readNumber(
    value,
    { unreadable: HOURS_MESSAGE, ambiguous: HOURS_AMBIGUOUS_MESSAGE },
    hoursIssue,
    ctx,
  );

// Απουσία ή «» = δεν αλλάζει (undefined)· κάτι που δεν διαβάζεται ως αριθμός = λάθος.
const optionalNumber = (
  read: (value: string, ctx: z.RefinementCtx) => number,
) =>
  text
    .optional()
    .transform((value, ctx): number | undefined =>
      value === undefined || value === "" ? undefined : read(value, ctx),
    );

const optionalMoney = optionalNumber(readMoney);
const optionalHours = optionalNumber(readHours);

export const moneySchema = text.transform(readMoney);

const QUANTITY_MESSAGE =
  "Η ποσότητα κάθε Παροχής είναι ακέραιος από 1 έως 999.";
const UNREADABLE_PROVISIONS = "Οι Παροχές δεν διαβάστηκαν· δοκίμασε ξανά.";

// Οι Παροχές ταξιδεύουν ως JSON σε κρυφό πεδίο· το κενό πεδίο σημαίνει «καμία».
export const provisionsFieldSchema = z
  .string()
  .transform((value, ctx): unknown => {
    if (value.trim() === "") return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed;
    } catch {
      ctx.addIssue({ code: "custom", message: UNREADABLE_PROVISIONS });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(
        z.object(
          {
            kindId: z.uuid(UNREADABLE_PROVISIONS),
            quantity: z
              .number(QUANTITY_MESSAGE)
              .int(QUANTITY_MESSAGE)
              .min(1, QUANTITY_MESSAGE)
              .max(999, QUANTITY_MESSAGE),
          },
          UNREADABLE_PROVISIONS,
        ),
        UNREADABLE_PROVISIONS, // όχι λίστα (π.χ. «{}», «5», «null») → ελληνικό μήνυμα, όχι το αγγλικό του zod
      )
      .refine(
        (list) => new Set(list.map((p) => p.kindId)).size === list.length,
        "Κάθε είδος Παροχής μπαίνει μία φορά.",
      ),
  );

export const createItemSchema = z
  .object({
    type: z.enum(
      ["package_monthly", "package_one_off", "service"],
      "Διάλεξε είδος.",
    ),
    name: text.min(1, "Γράψε το όνομα."),
    description: text,
    unit: text,
    price: optionalMoney, // απουσία = ο δημιουργός δεν βλέπει τιμές
    provisions: provisionsFieldSchema,
  })
  .superRefine((value, ctx) => {
    if (value.type === "service" && value.unit === "")
      ctx.addIssue({
        code: "custom",
        path: ["unit"],
        message: "Η Υπηρεσία θέλει μονάδα, π.χ. ανά reel.",
      });
    if (value.type !== "service" && value.provisions.length === 0)
      ctx.addIssue({
        code: "custom",
        path: ["provisions"],
        message: "Ένα Πακέτο έχει τουλάχιστον μία Παροχή.",
      });
  });

export const updateItemSchema = z.object({
  itemId: z.uuid(),
  name: text.min(1, "Γράψε το όνομα."),
  description: text,
  unit: text, // η μονάδα της Υπηρεσίας ελέγχεται από τη βάση (P0001)
  price: optionalMoney,
});

export const setProvisionsSchema = z.object({
  itemId: z.uuid(),
  provisions: provisionsFieldSchema,
});

export const setCostSchema = z.object({
  itemId: z.uuid(),
  hoursShoot: optionalHours,
  hoursEdit: optionalHours,
  directCost: optionalMoney,
  directCostNote: text.optional(), // απουσία = δεν αλλάζει· «» = καθαρίζει τη σημείωση
});

// Τα checkbox φτάνουν ως "on" όταν είναι τσεκαρισμένα και λείπουν όταν δεν είναι.
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

export const setPublicSchema = z
  .object({
    itemId: z.uuid(),
    isPublic: checkbox,
    showsPrice: checkbox,
    nameEn: text,
    descriptionPublic: text,
    descriptionPublicEn: text,
  })
  .refine((value) => !value.isPublic || value.descriptionPublic !== "", {
    message: "Ένα δημόσιο Πακέτο θέλει σύντομη περιγραφή στα ελληνικά.",
    path: ["descriptionPublic"],
  });

export const itemRefSchema = z.object({ itemId: z.uuid() }); // αρχειοθέτηση, επαναφορά
