// I6 (νέα εμφάνιση): τα πραγματικά Έξοδα του μήνα (cost_expenses_view, cost_months_view) στα σχήματα του prototype
// (`screens/I6.tsx`, `i6-editor.tsx`, `i6-history.tsx`). Καθαρές συναρτήσεις.

import { monthOptions, monthStatus, type CostMonth } from "@/modules/catalogue";

import type { ExpenseCategory, MonthExpenses } from "../expenses-schema";
import { fmtMonth } from "./i6-model";

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;
const PAST_TABS = 3;

// ?month=YYYY-MM → YYYY-MM-01· χωρίς (ή άκυρο) = ο τρέχων μήνας.
export const monthOfParam = (
  value: string | undefined,
  current: string,
): string => (value && MONTH_PARAM.test(value) ? `${value}-01` : current);

// Ο τρέχων μήνας δεν γράφεται στη διεύθυνση, όπως στο prototype.
export const paramOfMonth = (
  month: string,
  current: string,
): string | undefined => (month === current ? undefined : month.slice(0, 7));

// Καρτέλες μηνών: οι τελευταίοι γραμμένοι πριν από τον τρέχοντα, ο τρέχων, ο επόμενος, όσοι μελλοντικοί έχουν γραφτεί
// και ο επιλεγμένος. Από τον παλιότερο στον νεότερο.
export const monthTabsOf = (
  saved: readonly string[],
  current: string,
  selected: string,
): readonly string[] => {
  const past = saved
    .filter((m) => m < current)
    .sort()
    .slice(-PAST_TABS);
  const future = saved.filter((m) => m > current);
  const ahead = monthOptions(current, 2).map((option) => option.value);
  return [...new Set([...past, ...ahead, ...future, selected])].sort();
};

export type SeedSource = "saved" | "total" | "copy" | "new";

export interface EditorSeed {
  categories: readonly ExpenseCategory[];
  productiveHours: number;
  // Μήνας με ένα σύνολο χωρίς ανάλυση: το σύνολο αυτό (μένει, όσο δεν γράφονται γραμμές).
  baseTotal: number;
  source: SeedSource;
  copiedFrom: string | null;
}

// Από τι ξεκινά ο επεξεργαστής. Κλεισμένος μήνας που δεν γράφτηκε ποτέ: τίποτα (null).
// Νέος μήνας: αντίγραφο του προηγούμενου, όπως λέει το prototype («Ο νέος μήνας ξεκινά ως αντίγραφο του προηγούμενου»).
export const seedOf = (view: MonthExpenses): EditorSeed | null => {
  const { saved, previous } = view;
  if (saved)
    return saved.categories
      ? {
          categories: saved.categories,
          productiveHours: saved.productiveHours,
          baseTotal: 0,
          source: "saved",
          copiedFrom: null,
        }
      : {
          categories: [],
          productiveHours: saved.productiveHours,
          baseTotal: saved.expensesTotal,
          source: "total",
          copiedFrom: null,
        };
  if (view.isClosed) return null;
  const copied = previous?.categories ?? [];
  return {
    categories: copied,
    productiveHours: previous?.productiveHours ?? 0,
    baseTotal: 0,
    source: copied.length > 0 ? "copy" : "new",
    copiedFrom: copied.length > 0 && previous ? previous.month : null,
  };
};

const STATUS_LABELS = {
  closed: "κλεισμένος",
  current: "τρέχων",
  future: "μελλοντικός",
} as const;

export interface HistoryRow {
  month: string;
  label: string;
  expenses: number;
  hours: number;
  hourCost: number;
  isClosed: boolean;
  statusLabel: string;
}

// Το Ιστορικό Κόστους ώρας: όλοι οι γραμμένοι μήνες, από τον παλιότερο στον νεότερο.
export const historyRowsOf = (
  months: readonly CostMonth[],
  current: string,
): readonly HistoryRow[] =>
  [...months]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => {
      const status = monthStatus(m.month, current);
      return {
        month: m.month,
        label: fmtMonth(m.month),
        expenses: m.expensesTotal,
        hours: m.productiveHours,
        hourCost: m.hourCost,
        isClosed: status === "closed",
        statusLabel: STATUS_LABELS[status],
      };
    });
