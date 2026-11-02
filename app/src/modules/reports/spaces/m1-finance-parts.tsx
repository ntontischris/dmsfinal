import type { ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";

import { getPeriods } from "../queries";
import { isPeriodCode, type PeriodCode } from "../url";
import type { ReportPeriod } from "../view-schema";

// Κοινά κομμάτια των σωμάτων Αναφορών (prototype `screens/m1-finance-parts.tsx`). Το ExportRow είναι στο m1-export-row.

export function SummaryCard(props: {
  label: string;
  basis: string;
  value: string;
}) {
  return (
    <Panel label={props.label} aside={props.basis}>
      <strong className="m1f-big">{props.value}</strong>
    </Panel>
  );
}

export function Cell(props: {
  label: string;
  num?: boolean;
  children: ReactNode;
}) {
  return (
    <td className={props.num ? "num" : undefined} data-label={props.label}>
      {props.children}
    </td>
  );
}

// Χωρίς «Βλέπει ποσά» η βάση στέλνει κενά ποσά: το λέμε, αντί να δείχνουμε σκέτες παύλες.
export function NoAmountsNote({ amounts }: { amounts: boolean }) {
  if (amounts) return null;
  return (
    <p className="note">
      Βλέπεις πλήθη χωρίς ποσά: τα ποσά θέλουν «Βλέπει ποσά».
    </p>
  );
}

export type KnownPeriod = ReportPeriod & { code: PeriodCode };

// Οι πέντε Περίοδοι όπως τις υπολογίζει η βάση (ώρα Ελλάδας). Αν δεν φορτώσουν, το φίλτρο απλώς δεν φαίνεται.
export async function loadPeriods(): Promise<KnownPeriod[] | undefined> {
  const periods = await getPeriods();
  if (!periods.ok) return undefined;
  return periods.data.items.flatMap((item) =>
    isPeriodCode(item.code) ? [{ ...item, code: item.code }] : [],
  );
}
