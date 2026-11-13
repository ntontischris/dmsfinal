import type { StatProps } from "@/spaces/kit/panel";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { ForecastRow, PipelineValue } from "../types";

// Κείμενα της Πρόβλεψης (b3): μία Ευκαιρία (B4) και το σύνολο (B3). Τα null σημαίνουν «δεν το βλέπεις» ή «δεν γράφτηκε».

const VALUE_SOURCE: Record<NonNullable<ForecastRow["valueSource"]>, string> = {
  estimate: "εκτίμηση",
  proposal: "από την πρόταση",
};
const PROBABILITY_SOURCE: Record<
  NonNullable<ForecastRow["probabilitySource"]>,
  string
> = {
  opportunity: "δική της",
  stage: "του Σταδίου",
};

export const valueText = (row: ForecastRow | null): string => {
  if (!row || row.value === null) return "—";
  const source = row.valueSource ? ` (${VALUE_SOURCE[row.valueSource]})` : "";
  return `${fmtMoney(row.value)}${source}`;
};

export const probabilityText = (row: ForecastRow | null): string => {
  if (!row) return "—";
  const source = row.probabilitySource
    ? ` (${PROBABILITY_SOURCE[row.probabilitySource]})`
    : "";
  return `${row.probability}%${source}`;
};

export const weightedText = (row: ForecastRow | null): string =>
  row?.weighted === null || row?.weighted === undefined
    ? "—"
    : fmtMoney(row.weighted);

export const closeText = (row: ForecastRow | null): string => {
  if (!row?.expectedClose) return "—";
  const date = fmtDate(row.expectedClose);
  return row.isLate ? `${date} · πέρασε` : date;
};

// Μία γραμμή στην κάρτα του Pipeline: «60% · σταθμ. 3.600 € · κλείσιμο 30/11/2026». Η σταθμισμένη μόνο με «Βλέπει ποσά».
export const cardForecastText = (
  row: ForecastRow | undefined,
): string | null => {
  if (!row) return null;
  const parts = [
    `${row.probability}%`,
    row.weighted === null ? null : `σταθμ. ${fmtMoney(row.weighted)}`,
    row.expectedClose ? `κλείσιμο ${closeText(row)}` : null,
  ];
  return parts.filter((part) => part !== null).join(" · ");
};

const money = (value: number | null): string =>
  value === null ? "—" : fmtMoney(value);

// Οι δείκτες πάνω από το Pipeline. Χωρίς «Βλέπει ποσά» μένουν μόνο τα πλήθη.
export const pipelineStats = (v: PipelineValue): StatProps[] => {
  const counts: StatProps[] = [
    { label: "Ανοιχτές", value: String(v.open) },
    {
      label: "Κλείνουν αυτόν τον μήνα",
      value: String(v.thisMonth.count),
      hint: v.hasAmounts
        ? `σταθμισμένα ${money(v.thisMonth.weighted)}`
        : undefined,
    },
    {
      label: "Πέρασε το κλείσιμο",
      value: String(v.late),
      tone: v.late > 0 ? "attention" : undefined,
    },
  ];
  if (!v.hasAmounts) return counts;
  return [
    {
      label: "Αξία ανοιχτών",
      value: money(v.total),
      hint: `${v.valued} από ${v.open} με Αξία`,
    },
    {
      label: "Σταθμισμένη πρόβλεψη",
      value: money(v.weighted),
      hint: "Αξία × Πιθανότητα",
    },
    ...counts,
  ];
};
