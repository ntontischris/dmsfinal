import { SIGNAL_LABELS } from "./labels";
import type { CostRow, CostSignals } from "./types";

// Μορφοποίηση και κρίσεις του module, καθαρές συναρτήσεις. Τα σήματα τα κρίνει η βάση· εδώ μόνο φαίνονται.

const MONEY = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });
const HOURS = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 1 });
const PERCENT = new Intl.NumberFormat("el-GR", { maximumFractionDigits: 1 });

export const formatMoney = (amount: number): string => MONEY.format(amount);

export const formatHours = (hours: number): string =>
  `${HOURS.format(hours)} ${hours === 1 ? "ώρα" : "ώρες"}`;

export const formatHoursValue = (hours: number): string => HOURS.format(hours);

export const formatPercent = (fraction: number): string =>
  `${PERCENT.format(fraction * 100)}%`;

// Η δεκαδική υποδιαστολή του ελληνικού πληκτρολογίου, για τα πεδία φόρμας.
export const decimalText = (value: number): string => String(value).replace(".", ",");

export interface Margin {
  amount: number;
  percent: number;
}

// Περιθώριο = τιμή − πραγματικό κόστος. Null για Εσωτερική (δεν έχει τιμή)· ποτέ μηδέν που θα έμοιαζε με κέρδος.
export const marginOf = (row: CostRow): Margin | null => {
  const price = row.estimate.price;
  if (price === null) return null;
  const amount = Math.round((price - row.actual.cost) * 100) / 100;
  return { amount, percent: price === 0 ? 0 : amount / price };
};

export const isInternalCost = (row: CostRow): boolean => row.client === null;

export const signalLabels = (signals: CostSignals): string[] => [
  ...(signals.lowMargin ? [SIGNAL_LABELS.lowMargin] : []),
  ...(signals.overrun ? [SIGNAL_LABELS.overrun] : []),
];

export interface HoursPrefill {
  shootHours: number;
  editHours: number;
  directCost: number;
}

// Τι δείχνει η φόρμα ωρών: ό,τι γράφτηκε· όπου δεν έχει γραφτεί ποτέ, η εκτίμηση. Έτσι ένα πρόχειρο δεν χάνεται στο reload.
export const hoursPrefill = (row: CostRow): HoursPrefill => ({
  shootHours: row.recorded.shootHours ?? row.estimate.shootHours,
  editHours: row.recorded.editHours ?? row.estimate.editHours,
  directCost: row.recorded.directCost ?? row.estimate.directCost,
});

export const estimateHours = (row: CostRow): number =>
  row.estimate.shootHours + row.estimate.editHours;

export const actualHours = (row: CostRow): number =>
  row.actual.shootHours + row.actual.editHours;
