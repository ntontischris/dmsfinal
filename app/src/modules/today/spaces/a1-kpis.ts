// Δείκτες και «ραντάρ κινδύνου» της Σήμερα (d9, όπως η μπάρα δεικτών του παλιού DMS). Μόνο ό,τι έδωσε η βάση: δείκτης
// null → δεν φαίνεται. Οι αριθμοί είναι τα ίδια σύνολα με τις Αναφορές (Τζίρος, Κέρδος) και την πρόβλεψη Πωλήσεων.

import type { StatProps } from "@/spaces/kit/panel";
import { fmtPercent } from "@/spaces/screens/shared";

import type { KpiRisk, TodayKpis } from "../view-schema";
import { wholeEuros } from "./a1-facts";
import { countWord } from "./a1-model";

const eurosOf = (amount: number): string => wholeEuros(amount * 100);

const turnoverStat = (turnover: number): StatProps => ({
  label: "Τζίρος μήνα",
  value: eurosOf(turnover),
  hint: "καθαρά, μείον Πιστωτικά",
  href: "/app/reports?report=turnover&period=this-month",
});

// Χωρίς «Βλέπει ποσά» η πρόβλεψη δεν έχει ποσά: μένει το πλήθος των ανοιχτών Ευκαιριών.
const pipelineStat = (
  pipeline: NonNullable<TodayKpis["pipeline"]>,
): StatProps => {
  const open = countWord(pipeline.open, "ανοιχτή", "ανοιχτές");
  return pipeline.weighted === null || pipeline.total === null
    ? {
        label: "Ανοιχτές Ευκαιρίες",
        value: String(pipeline.open),
        href: "/app/pipeline",
      }
    : {
        label: "Αξία pipeline",
        value: eurosOf(pipeline.weighted),
        hint: `σταθμισμένη · από ${eurosOf(pipeline.total)} · ${open}`,
        href: "/app/pipeline",
      };
};

const productionsStat = (count: number): StatProps => ({
  label: "Ενεργές Παραγωγές",
  value: String(count),
  href: "/app/productions",
});

const marginStat = (margin: NonNullable<TodayKpis["margin"]>): StatProps => ({
  label: "Περιθώριο φέτος",
  value: margin.margin === null ? "—" : fmtPercent(margin.margin),
  hint:
    margin.months === 0
      ? "κανένας μήνας με Έξοδα"
      : `${countWord(margin.months, "μήνας", "μήνες")} με Έξοδα`,
  tone: margin.margin !== null && margin.margin < 0 ? "attention" : undefined,
  href: "/app/reports?report=profit&period=this-year",
});

// Η σειρά των πλακιδίων: Τζίρος, pipeline, Παραγωγές, Περιθώριο· όσα επιτρέπονται.
export const kpiStatsOf = (kpis: TodayKpis): StatProps[] => [
  ...(kpis.turnover === null ? [] : [turnoverStat(kpis.turnover)]),
  ...(kpis.pipeline === null ? [] : [pipelineStat(kpis.pipeline)]),
  ...(kpis.activeProductions === null
    ? []
    : [productionsStat(kpis.activeProductions)]),
  ...(kpis.margin === null ? [] : [marginStat(kpis.margin)]),
];

const RISK_TEXT: Record<string, (count: number) => string> = {
  cost_overrun: (n) =>
    `${countWord(n, "Παραγωγή", "Παραγωγές")} σε Υπέρβαση κόστους`,
  hours_missing: (n) =>
    `${countWord(n, "παραδομένη Παραγωγή", "παραδομένες Παραγωγές")} χωρίς επιβεβαιωμένες ώρες`,
  expenses_missing: () => "Λείπουν τα Έξοδα του προηγούμενου μήνα",
  late_opportunities: (n) =>
    `${countWord(n, "Ευκαιρία", "Ευκαιρίες")} με Αναμενόμενο κλείσιμο που πέρασε`,
};

export interface RiskRow {
  code: string;
  title: string;
  href: string;
}

// Άγνωστος κωδικός (νεότερη βάση) απλώς δεν φαίνεται.
export const riskRowsOf = (risks: readonly KpiRisk[]): RiskRow[] =>
  risks.flatMap((risk) => {
    const text = RISK_TEXT[risk.code];
    return text
      ? [{ code: risk.code, title: text(risk.count), href: risk.link }]
      : [];
  });
