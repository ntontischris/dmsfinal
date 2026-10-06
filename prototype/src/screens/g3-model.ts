import { COST_SETTINGS } from "@/data/catalogue";
import type { ProductionStub } from "@/data/filming";
import {
  estimateOf,
  hourCostOfMonth,
  isInternal,
  monthOf,
  priceOf,
  recordOf,
  type Actual,
  type Estimate,
} from "@/data/productions-access";

// Τα πεδία της φόρμας «Πραγματικές ώρες» (κείμενο όπως γράφεται) και οι αποθηκευμένες τιμές.
export interface HoursForm {
  shoot: string;
  shootConfirmed: boolean;
  edit: string;
  directCost: string;
}

export interface HoursValue {
  shoot: number | null;
  shootConfirmed: boolean;
  edit: number | null;
  directCost: number | null;
}

export interface Figures {
  estimate: Estimate | null;
  actual: Actual | null;
  price: number | null;
  isOverrun: boolean;
  hoursOver: boolean;
  belowMinimum: boolean;
  hoursPercent: number;
  minimumPrice: number | null;
  missing: readonly string[];
}

export const parseNumber = (text: string): number | null => {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || !Number.isFinite(value) || value < 0
    ? null
    : value;
};

export const valueOf = (form: HoursForm): HoursValue => ({
  shoot: parseNumber(form.shoot),
  shootConfirmed: form.shootConfirmed,
  edit: parseNumber(form.edit),
  directCost: parseNumber(form.directCost),
});

export const formOf = (value: HoursValue, suggestedShoot: number): HoursForm => ({
  shoot: String(value.shoot ?? (suggestedShoot || "")),
  shootConfirmed: value.shootConfirmed,
  edit: value.edit === null ? "" : String(value.edit),
  directCost: value.directCost === null ? "" : String(value.directCost),
});

export const initialValueOf = (production: ProductionStub): HoursValue => {
  const { hours } = recordOf(production);
  return {
    shoot: hours.shoot,
    shootConfirmed: hours.shootConfirmed,
    edit: hours.edit,
    directCost: hours.directCost,
  };
};

// Μισές ώρες μετράνε ως λείπουσες: λέμε τι ακριβώς λείπει.
export const missingOf = (value: HoursValue): readonly string[] => [
  ...(value.shoot === null ? ["λείπουν οι ώρες γυρίσματος"] : []),
  ...(value.shoot !== null && !value.shootConfirmed
    ? ["οι ώρες γυρίσματος δεν επιβεβαιώθηκαν"]
    : []),
  ...(value.edit === null ? ["λείπει το μοντάζ"] : []),
];

// Εκτίμηση: της Παραγωγής, ή για Εσωτερική η προαιρετική εκτίμηση που γράφει ο Ιδιοκτήτης.
export const estimateWith = (
  production: ProductionStub,
  internalEstimate: { shoot: number; edit: number } | null,
): Estimate | null => {
  if (!isInternal(production)) return estimateOf(production);
  if (!internalEstimate) return null;
  const hourCost = hourCostOfMonth(monthOf(production));
  return {
    hours: internalEstimate,
    hourCost,
    directCost: 0,
    cost: (internalEstimate.shoot + internalEstimate.edit) * hourCost,
  };
};

export const figuresOf = (
  production: ProductionStub,
  value: HoursValue,
  internalEstimate: { shoot: number; edit: number } | null,
): Figures => {
  const estimate = estimateWith(production, internalEstimate);
  const missing = missingOf(value);
  const price = priceOf(production);
  const hourCost = hourCostOfMonth(monthOf(production));
  const actual: Actual | null =
    missing.length > 0
      ? null
      : (() => {
          const hours = { shoot: value.shoot ?? 0, edit: value.edit ?? 0 };
          const directCost = value.directCost ?? estimate?.directCost ?? 0;
          return {
            hours,
            hourCost,
            directCost,
            cost: (hours.shoot + hours.edit) * hourCost + directCost,
          };
        })();
  const estimated = estimate ? estimate.hours.shoot + estimate.hours.edit : 0;
  const real = actual ? actual.hours.shoot + actual.hours.edit : 0;
  const hoursPercent = estimated > 0 ? (real - estimated) / estimated : 0;
  const minimumPrice = actual
    ? actual.cost * COST_SETTINGS.multipliers.min
    : null;
  const hoursOver =
    !!actual &&
    !!estimate &&
    hoursPercent * 100 > COST_SETTINGS.overrunPercent;
  const belowMinimum =
    price !== null && minimumPrice !== null && price < minimumPrice;
  return {
    estimate,
    actual,
    price,
    isOverrun: hoursOver || belowMinimum,
    hoursOver,
    belowMinimum,
    hoursPercent,
    minimumPrice,
    missing,
  };
};
