import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { formatDate, formatMoney, periodLabel } from "../helpers";
import type { PeriodRow, PeriodState } from "../types";

import { MutedNote } from "./terms-section-parts";

const STATE_TEXT: Readonly<Record<PeriodState, string>> = {
  closed: "κλειστή",
  current: "τρέχουσα",
  next: "επόμενη",
};

const NOTE =
  "Οι Περίοδοι είναι ημερολογιακοί μήνες. Η μερική πρώτη δίνει ολόκληρες Παροχές, η μερική τελευταία δεν δίνει νέες.";

interface PeriodPlanProps {
  periods: readonly PeriodRow[];
  isProposal: boolean; // πριν την υπογραφή είναι σχέδιο, όχι Περίοδοι που τρέχουν
  canSeeProductions: boolean; // ο σύνδεσμος προς την Παραγωγή μόνο για όποιον έχει «Παραγωγές»
}

function PeriodLine({
  period,
  hasAmount,
  showProduction,
}: {
  period: PeriodRow;
  hasAmount: boolean;
  showProduction: boolean;
}) {
  return (
    <Tr>
      <Td data-label="Περίοδος">{periodLabel(period)}</Td>
      <Td data-label="Ημερομηνίες">
        <span className="flex flex-wrap items-center gap-1 max-sm:justify-end">
          {formatDate(period.starts)} – {formatDate(period.ends)}
          {period.isPartial && <Badge>σπασμένη</Badge>}
        </span>
      </Td>
      {hasAmount && (
        <Td data-label="Ποσό" isNumeric>
          <span className="grid gap-0.5 max-sm:justify-items-end sm:justify-items-end">
            {period.amount === null ? "—" : formatMoney(period.amount)}
            {period.isDiscounted && (
              <span className="text-xs text-muted-foreground">με έκπτωση</span>
            )}
          </span>
        </Td>
      )}
      <Td data-label="Παροχές">
        {period.givesProvisions ? "ολόκληρες" : "χωρίς νέες Παροχές"}
      </Td>
      <Td data-label="Κατάσταση">{STATE_TEXT[period.state]}</Td>
      {showProduction && (
        <Td data-label="Παραγωγή">
          {period.productionId ? (
            <Link href={`/app/productions/${period.productionId}`}>Παραγωγή</Link>
          ) : (
            "—"
          )}
        </Td>
      )}
    </Tr>
  );
}

// Το πλάνο των Περιόδων μιας μηνιαίας Συμφωνίας: υπολογίζεται από τη βάση (ημερομηνίες, μερικοί μήνες, έκπτωση, Παροχές).
export function PeriodPlan({ periods, isProposal, canSeeProductions }: PeriodPlanProps) {
  if (periods.length === 0) return null;
  const hasAmount = periods.some((period) => period.amount !== null);
  const showProduction =
    canSeeProductions && periods.some((period) => period.productionId !== null);
  return (
    <section className="grid gap-2">
      <h3 className="kit-label m-0">
        {isProposal ? "Σχέδιο Περιόδων" : "Περίοδοι"}
      </h3>
      <Table>
        <thead>
          <tr>
            <Th>Περίοδος</Th>
            <Th>Ημερομηνίες</Th>
            {hasAmount && <Th isNumeric>Ποσό</Th>}
            <Th>Παροχές</Th>
            <Th>Κατάσταση</Th>
            {showProduction && <Th>Παραγωγή</Th>}
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <PeriodLine
              key={period.n}
              period={period}
              hasAmount={hasAmount}
              showProduction={showProduction}
            />
          ))}
        </tbody>
      </Table>
      <MutedNote>{NOTE}</MutedNote>
    </section>
  );
}
