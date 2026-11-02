// M1 (νέα εμφάνιση): οι απαντήσεις των RPC των Αναφορών στα σχήματα του prototype. Καθαρές συναρτήσεις.
// null = ο Χρήστης δεν βλέπει ποσά (η βάση τα έστειλε κενά): φαίνεται «—».

import { fmtMoney } from "@/spaces/screens/shared";

import type { TurnoverMonth } from "../view-schema";

export const DASH = "—";

export const money = (value: number | null): string =>
  value === null ? DASH : fmtMoney(value);

export const monthlyText = (value: number | null): string =>
  value === null ? DASH : `${fmtMoney(value)} /μήνα`;

const dayMonth = (iso: string): string =>
  `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// «Αυτό το τρίμηνο (01/07–30/09/2026)»: οι ημερομηνίες της βάσης δίπλα στο όνομα της Περιόδου.
export const periodLabelWithDates = (period: {
  label: string;
  from: string;
  to: string;
}): string =>
  `${period.label} (${dayMonth(period.from)}–${dayMonth(period.to)}/${period.to.slice(0, 4)})`;

export interface ChartBar {
  month: string;
  isPartial: boolean;
  turnover: number;
  collections: number;
  // Πλάτος μπάρας (% του πλάτους), ως 60% για το μεγαλύτερο ποσό.
  turnoverWidth: string;
  collectionsWidth: string;
}

export interface TurnoverChartData {
  bars: ChartBar[];
  // Μήνες χωρίς κίνηση: δεν πιάνουν χώρο στο γράφημα, είναι στον πίνακα.
  quiet: number;
}

// Μόνο με ποσά (η οθόνη δεν δείχνει γράφημα αλλιώς). Μήνες με μηδέν και στα δύο δεν ζωγραφίζονται.
export const turnoverChartOf = (
  months: readonly TurnoverMonth[],
): TurnoverChartData => {
  const active = months.filter(
    (m) => (m.turnover ?? 0) !== 0 || (m.collections ?? 0) !== 0,
  );
  const max = Math.max(
    1,
    ...active.flatMap((m) => [
      Math.abs(m.turnover ?? 0),
      Math.abs(m.collections ?? 0),
    ]),
  );
  const width = (v: number) => `${(Math.abs(v) / max) * 60}%`;
  return {
    bars: active.map((m) => ({
      month: m.month,
      isPartial: m.isPartial,
      turnover: m.turnover ?? 0,
      collections: m.collections ?? 0,
      turnoverWidth: width(m.turnover ?? 0),
      collectionsWidth: width(m.collections ?? 0),
    })),
    quiet: months.length - active.length,
  };
};

export const quietText = (quiet: number): string =>
  `${quiet === 1 ? "1 μήνας" : `${quiet} μήνες`} χωρίς κινήσεις δεν φαίνονται στο γράφημα· είναι στον πίνακα.`;

// Κελί των Οφειλών: με ποσά το ποσό, χωρίς ποσά το πλήθος Τιμολογίων· κενό κουτί «—».
export const agingCell = (
  amounts: boolean,
  amount: number | null,
  count: number,
): string => {
  if (count === 0) return DASH;
  return amounts ? money(amount) : `${count} Τιμ.`;
};

// Η μπάρα του μεριδίου, 0–100%.
export const shareWidth = (share: number): string =>
  `${Math.min(100, Math.max(0, share * 100))}%`;

// Χωρίς Υπεύθυνο δεν είναι άνθρωπος: η γραμμή δείχνει μόνο το Στάδιο και σημαία «Χωρίς υπεύθυνο».
export const openSub = (
  stageLabel: string,
  managerName: string | null,
  showOwner: boolean,
): string =>
  showOwner && managerName !== null
    ? `${stageLabel} · Υπεύθυνος: ${managerName}`
    : stageLabel;
