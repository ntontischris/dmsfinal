import { z } from "zod";

import { isAmbiguousGrouping, parseDecimal } from "./helpers-parts";

// Τα δομικά στοιχεία των schemas (αριθμοί, ημερομηνίες, πεδία JSON). Οι φόρμες ζουν στο schemas.ts.
// Έλεγχος στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.
// Ποσά και ώρες φτάνουν ως κείμενο (ελληνικό πληκτρολόγιο: «1300,50») και περνούν από το parseDecimal.

export const text = z.string().trim();
const MAX_MONEY = 10_000_000; // numeric(12,2) < 10.000.000 στη βάση
const MAX_HOURS = 999; // numeric(6,1) 0–999 στη βάση
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UNREADABLE = "Τα στοιχεία δεν διαβάστηκαν· δοκίμασε ξανά.";

// Τα checkbox φτάνουν ως "on" όταν είναι τσεκαρισμένα και λείπουν όταν δεν είναι.
export const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

// ───────────── Αριθμοί ─────────────

// Δεκαδικά με ανοχή στο σφάλμα κινητής υποδιαστολής (1300,55 * 100 = 130055,00000000001).
const hasDecimals = (value: number, places: number): boolean => {
  const scaled = value * 10 ** places;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

interface NumberRule {
  unreadable: string;
  ambiguous: string;
  rangeIssue: (value: number) => string | null;
}

// Ένα βήμα: το κείμενο γίνεται αριθμός ή δίνει ΕΝΑ ελληνικό μήνυμα.
const readNumber = (
  value: string,
  rule: NumberRule,
  ctx: z.RefinementCtx,
): number => {
  const fail = (message: string): never => {
    ctx.addIssue({ code: "custom", message });
    return z.NEVER;
  };
  if (isAmbiguousGrouping(value)) return fail(rule.ambiguous);
  const parsed = parseDecimal(value);
  if (parsed === null) return fail(rule.unreadable);
  const issue = rule.rangeIssue(parsed);
  return issue === null ? parsed : fail(issue);
};

const MONEY_RULE: NumberRule = {
  unreadable: "Γράψε ποσό, π.χ. 1300 ή 1300,50.",
  ambiguous: "Γράψε το ποσό χωρίς τελεία χιλιάδων, π.χ. 1300 ή 1300,50.",
  rangeIssue: (value) => {
    if (value < 0) return "Το ποσό δεν είναι έγκυρο.";
    if (value >= MAX_MONEY)
      return "Το ποσό πρέπει να είναι μικρότερο από 10.000.000 €.";
    return hasDecimals(value, 2) ? null : "Το ποσό έχει το πολύ 2 δεκαδικά.";
  },
};
const HOURS_RULE: NumberRule = {
  unreadable: "Γράψε ώρες, π.χ. 6 ή 6,5.",
  ambiguous: "Γράψε τις ώρες χωρίς τελεία χιλιάδων, π.χ. 1500 ή 6,5.",
  rangeIssue: (value) =>
    value >= 0 && value <= MAX_HOURS && hasDecimals(value, 1)
      ? null
      : "Οι ώρες είναι από 0 έως 999, με ένα δεκαδικό το πολύ.",
};
export const PERCENT_RULE: NumberRule = {
  unreadable: "Γράψε ποσοστό, π.χ. 10 ή 12,5.",
  ambiguous: "Γράψε το ποσοστό χωρίς τελεία χιλιάδων, π.χ. 10 ή 12,5.",
  rangeIssue: (value) =>
    value >= 0 && value <= 100 && hasDecimals(value, 2)
      ? null
      : "Το ποσοστό είναι από 0 έως 100, με το πολύ 2 δεκαδικά.",
};

export const numberField = (rule: NumberRule) =>
  text.transform((value, ctx): number => readNumber(value, rule, ctx));

// Απουσία ή «» = δεν αλλάζει (undefined)· κάτι που δεν διαβάζεται ως αριθμός = λάθος.
const optionalNumber = (rule: NumberRule) =>
  text
    .optional()
    .transform((value, ctx): number | undefined =>
      value === undefined || value === ""
        ? undefined
        : readNumber(value, rule, ctx),
    );

export const moneySchema = numberField(MONEY_RULE);
export const optionalMoney = optionalNumber(MONEY_RULE);
export const optionalHours = optionalNumber(HOURS_RULE);

const readInteger = (
  value: string,
  range: { min: number; max: number; message: string },
  ctx: z.RefinementCtx,
): number => {
  const parsed = /^\d{1,6}$/.test(value) ? Number(value) : Number.NaN;
  if (parsed >= range.min && parsed <= range.max) return parsed;
  ctx.addIssue({ code: "custom", message: range.message });
  return z.NEVER;
};

const defaultIntMessage = (min: number, max: number): string =>
  `Γράψε ακέραιο από ${min} έως ${max}.`;

export const int = (min: number, max: number, message = defaultIntMessage(min, max)) =>
  text.transform((value, ctx): number =>
    readInteger(value, { min, max, message }, ctx),
  );

export const optionalInt = (
  min: number,
  max: number,
  message = defaultIntMessage(min, max),
) =>
  text
    .optional()
    .transform((value, ctx): number | undefined =>
      value === undefined || value === ""
        ? undefined
        : readInteger(value, { min, max, message }, ctx),
    );

// «» = δεν υπάρχει τιμή (null)· τα πεδία μόνο της μηνιαίας δεν υπάρχουν στη φόρμα της εφάπαξ και η βάση τα αγνοεί εκεί.
export const nullableInt = (min: number, max: number) =>
  text.transform((value, ctx): number | null =>
    value === ""
      ? null
      : readInteger(
          value,
          { min, max, message: defaultIntMessage(min, max) },
          ctx,
        ),
  );

// ───────────── Ημερομηνίες ─────────────

export const isRealDate = (value: string): boolean => {
  if (!DATE_ONLY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

export const dateField = (message: string) => text.refine(isRealDate, { message });

// ───────────── Πεδία JSON (κρυφά πεδία φορμών) ─────────────

// Λίστες ταξιδεύουν ως JSON σε κρυφό πεδίο· το κενό πεδίο σημαίνει «καμία».
const jsonList = (unreadable: string) =>
  z.string().transform((value, ctx): unknown => {
    if (value.trim() === "") return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed;
    } catch {
      ctx.addIssue({ code: "custom", message: unreadable });
      return z.NEVER;
    }
  });

const QUANTITY_MESSAGE =
  "Η ποσότητα κάθε Παροχής είναι ακέραιος από 1 έως 999.";
const UNREADABLE_PROVISIONS = "Οι Παροχές δεν διαβάστηκαν· δοκίμασε ξανά.";

const intIn = (min: number, max: number, message: string) =>
  z.number(message).int(message).min(min, message).max(max, message);

const isUnique = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

export const provisionsFieldSchema = jsonList(UNREADABLE_PROVISIONS).pipe(
  z
    .array(
      z.object(
        {
          kindId: z.uuid(UNREADABLE_PROVISIONS),
          quantity: intIn(1, 999, QUANTITY_MESSAGE),
        },
        UNREADABLE_PROVISIONS,
      ),
      UNREADABLE_PROVISIONS,
    )
    .refine(
      (list) => isUnique(list.map((p) => p.kindId)),
      "Κάθε είδος Παροχής μπαίνει μία φορά.",
    ),
);

const ROUNDS_MESSAGE = "Το Όριο αλλαγών είναι από 1 έως 20 γύροι.";

export const revisionLimitsFieldSchema = jsonList(UNREADABLE).pipe(
  z
    .array(
      z.object(
        { kindId: z.uuid(UNREADABLE), rounds: intIn(1, 20, ROUNDS_MESSAGE) },
        UNREADABLE,
      ),
      UNREADABLE,
    )
    .refine(
      (list) => isUnique(list.map((l) => l.kindId)),
      "Κάθε είδος Παροχής μπαίνει μία φορά.",
    ),
);

const MILESTONES_COUNT = "Οι δόσεις είναι από 1 έως 6.";
const MILESTONE_DATE = "Η δόση «Ημερομηνία» θέλει ημερομηνία.";
const MILESTONE_PERCENT = "Το ποσοστό κάθε δόσης είναι πάνω από 0 και ως 100.";

const milestoneItem = z
  .object(
    {
      trigger: z.enum(
        ["signature", "date", "filming_done", "delivered"],
        UNREADABLE,
      ),
      percent: z
        .number(MILESTONE_PERCENT)
        .gt(0, MILESTONE_PERCENT)
        .max(100, MILESTONE_PERCENT)
        .refine((value) => hasDecimals(value, 2), MILESTONE_PERCENT),
      dueOn: z.string().nullish(),
    },
    UNREADABLE,
  )
  .refine(
    (m) => m.trigger !== "date" || (m.dueOn != null && isRealDate(m.dueOn)),
    {
      message: MILESTONE_DATE,
      path: ["dueOn"],
    },
  )
  .transform((m) => ({
    trigger: m.trigger,
    percent: m.percent,
    dueOn: m.trigger === "date" ? (m.dueOn ?? null) : null,
  }));

export const milestonesFieldSchema = jsonList(UNREADABLE).pipe(
  z
    .array(milestoneItem, UNREADABLE)
    .min(1, MILESTONES_COUNT)
    .max(6, MILESTONES_COUNT),
);

const recipientItem = z.object(
  {
    name: text.min(1, "Γράψε το όνομα του παραλήπτη."),
    email: text.refine(
      (value) => EMAIL.test(value),
      "Το email δεν είναι έγκυρο.",
    ),
    isSignatory: z.boolean(UNREADABLE),
  },
  UNREADABLE,
);

export const recipientsFieldSchema = jsonList(UNREADABLE).pipe(
  z
    .array(recipientItem, UNREADABLE)
    .min(1, "Χρειάζεται τουλάχιστον ένας παραλήπτης.")
    .max(10, "Οι παραλήπτες είναι το πολύ 10.")
    .refine(
      (list) => list.filter((r) => r.isSignatory).length === 1,
      "Χρειάζεται ακριβώς ένας Υπογράφων.",
    )
    .refine(
      (list) => isUnique(list.map((r) => r.email.toLowerCase())),
      "Ο ίδιος παραλήπτης μπαίνει μία φορά.",
    ),
);

const usedItem = z.object(
  {
    kindId: z.uuid(UNREADABLE),
    used: intIn(
      0,
      999,
      "Οι Παροχές που έχουν καταναλωθεί είναι από 0 έως 999.",
    ),
  },
  UNREADABLE,
);
export const usedFieldSchema = jsonList(UNREADABLE).pipe(
  z.array(usedItem, UNREADABLE),
);
