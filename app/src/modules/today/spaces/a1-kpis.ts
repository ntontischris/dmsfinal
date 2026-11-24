// Δείκτες και «ραντάρ κινδύνου» της Σήμερα (d9, όπως η μπάρα δεικτών του παλιού DMS). Μόνο ό,τι έδωσε η βάση: δείκτης
// null → δεν φαίνεται. Οι αριθμοί είναι τα ίδια σύνολα με τις Αναφορές (Τζίρος, Κέρδος) και την πρόβλεψη Πωλήσεων.

import { fmtPercent, type BadgeTone } from "@/spaces/screens/shared";

import type { KpiRisk, TodayKpis } from "../view-schema";
import { wholeEuros } from "./a1-facts";
import { countWord } from "./a1-model";
import { monthAccusativeOf } from "./a1-money";

// Ένας δείκτης: ετικέτα, αριθμός, μικρή εξήγηση, τόνος και πού πηγαίνει.
export interface KpiStat {
  label: string;
  value: string;
  hint?: string;
  tone?: BadgeTone;
  href?: string;
}

const eurosOf = (amount: number): string => wholeEuros(amount * 100);

const turnoverStat = (turnover: number): KpiStat => ({
  label: "Τζίρος μήνα",
  value: eurosOf(turnover),
  hint: "καθαρά, μείον Πιστωτικά",
  href: "/app/reports?report=turnover&period=this-month",
});

// Τ8: πόσα μπήκαν τον μήνα, από τις ίδιες Εισπράξεις με την κάρτα των Τιμολογίων (με ΦΠΑ, όχι ο τζίρος).
const receivedStat = (month: string, received: number): KpiStat => ({
  label: `Μπήκαν τον ${monthAccusativeOf(Number(month.slice(5, 7)))}`,
  value: eurosOf(received),
  hint: "Εισπράξεις με ΦΠΑ",
  href: "/app/finance/receipts",
});

// Χωρίς «Βλέπει ποσά» η πρόβλεψη δεν έχει ποσά: μένει το πλήθος των ανοιχτών Ευκαιριών.
const pipelineStat = (
  pipeline: NonNullable<TodayKpis["pipeline"]>,
): KpiStat => {
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

const productionsStat = (count: number): KpiStat => ({
  label: "Ενεργές Παραγωγές",
  value: String(count),
  href: "/app/productions",
});

const marginStat = (margin: NonNullable<TodayKpis["margin"]>): KpiStat => ({
  label: "Περιθώριο φέτος",
  value: margin.margin === null ? "—" : fmtPercent(margin.margin),
  hint:
    margin.months === 0
      ? "κανένας μήνας με Έξοδα"
      : `${countWord(margin.months, "μήνας", "μήνες")} με Έξοδα`,
  tone: margin.margin !== null && margin.margin < 0 ? "attention" : undefined,
  href: "/app/reports?report=profit&period=this-year",
});

// Η σειρά των πλακιδίων: Τζίρος, Μπήκαν, pipeline, Παραγωγές, Περιθώριο· όσα επιτρέπονται.
export const kpiStatsOf = (
  kpis: TodayKpis,
  received: number | null = null,
): KpiStat[] => [
  ...(kpis.turnover === null ? [] : [turnoverStat(kpis.turnover)]),
  ...(received === null ? [] : [receivedStat(kpis.month, received)]),
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
