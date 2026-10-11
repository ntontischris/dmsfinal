import { z } from "zod";

import { COST_GROUPS, type CostGroup } from "./types";

// Έλεγχος των φορμών και των φίλτρων του module στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.
// Οι αριθμοί φτάνουν ως κείμενο (ελληνικό πληκτρολόγιο: «6,5»). Η βάση ελέγχει ξανά.

const HOURS_MAX = 999;
const MONEY_MAX = 9_999_999.99;
const HOURS_MESSAGE = "Γράψε ώρες από 0 έως 999, με το πολύ 1 δεκαδικό (π.χ. 6,5).";
const MONEY_MESSAGE = "Γράψε ποσό σε ευρώ, π.χ. 150 ή 150,50.";
const CONFIRM_SHOOT = "Γράψε τις ώρες γυρίσματος πριν την επιβεβαίωση.";
const CONFIRM_EDIT = "Γράψε τις ώρες μοντάζ πριν την επιβεβαίωση.";
const ESTIMATE_HOURS = "Γράψε τις ώρες της εκτίμησης (π.χ. 6 ή 6,5).";
const ESTIMATE_MONEY = "Γράψε το άμεσο κόστος της εκτίμησης (π.χ. 0).";

// Αριθμός με το πολύ `places` δεκαδικά· κενό = null. Αλλιώς null, και ο καλών βγάζει το μήνυμα.
export const parseAmount = (text: string, places: number): number | null | undefined => {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "") return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return undefined;
  const [, fraction = ""] = normalized.split(".");
  if (fraction.length > places) return undefined;
  return Number(normalized);
};

const rejectAmount = (ctx: z.RefinementCtx, message: string): never => {
  ctx.addIssue({ code: "custom", message });
  return z.NEVER;
};

const optionalAmount = (places: number, max: number, message: string) =>
  z.string().transform((value, ctx) => {
    const amount = parseAmount(value, places);
    if (amount === undefined || (amount !== null && amount > max)) return rejectAmount(ctx, message);
    return amount;
  });

const requiredAmount = (places: number, max: number, message: string) =>
  z.string().transform((value, ctx) => {
    const amount = parseAmount(value, places);
    if (amount === null || amount === undefined || amount > max) return rejectAmount(ctx, message);
    return amount;
  });

const optionalHours = optionalAmount(1, HOURS_MAX, HOURS_MESSAGE);
const optionalMoney = optionalAmount(2, MONEY_MAX, MONEY_MESSAGE);
const checkbox = z.string().transform((value) => value === "on");
const productionId = z.uuid("Η Παραγωγή δεν βρέθηκε.");

export const costGroupSchema = z.enum(COST_GROUPS).catch("needs_hours");

export const hoursFormSchema = z
  .object({
    productionId,
    shootHours: optionalHours,
    editHours: optionalHours,
    directCost: optionalMoney,
    confirmShoot: checkbox,
    confirmEdit: checkbox,
  })
  .refine((v) => !v.confirmShoot || v.shootHours !== null, {
    message: CONFIRM_SHOOT,
    path: ["confirmShoot"],
  })
  .refine((v) => !v.confirmEdit || v.editHours !== null, {
    message: CONFIRM_EDIT,
    path: ["confirmEdit"],
  });

export const estimateFormSchema = z.object({
  productionId,
  shootHours: requiredAmount(1, HOURS_MAX, ESTIMATE_HOURS),
  editHours: requiredAmount(1, HOURS_MAX, ESTIMATE_HOURS),
  directCost: requiredAmount(2, MONEY_MAX, ESTIMATE_MONEY),
});

// Η καρτέλα της G3 από τη διεύθυνση· άγνωστη ή κενή = «Θέλουν πραγματικές ώρες».
export const parseCostGroup = (value: unknown): CostGroup => costGroupSchema.parse(value);
