import Link from "next/link";

import {
  pipelineByStage,
  reportCapsOf,
  salesRows,
  sellersOf,
  type SalesRow,
} from "@/data/reports-access";
import { memberName } from "@/data/sales";
import type { ReportBodyProps } from "@/screens/m1-model";
import {
  Cards,
  ExportRow,
  Section,
  money,
  monthlyText,
} from "@/screens/m1-sales-parts";
import { Badge, StateNotice, screenHref } from "@/screens/shared";

function OpenList({
  rows,
  role,
  showOwner,
}: {
  rows: readonly SalesRow[];
  role: ReportBodyProps["role"];
  showOwner: boolean;
}) {
  return (
    <ul className="m1s-list">
      {rows.map((row) => {
        const label = `${row.title} · ${row.clientName}`;
        return (
          <li key={row.id}>
            {row.isLive ? (
              <Link href={screenHref(role, "B4", { id: row.id })}>{label}</Link>
            ) : (
              <span>{label}</span>
            )}
            <span className="muted">{row.stage}</span>
            {row.ownerId === null && (
              <Badge tone="attention">Χωρίς υπεύθυνο</Badge>
            )}
            {showOwner && row.ownerId !== null && (
              <span className="muted">
                Υπεύθυνος: {memberName(row.ownerId)}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PipelineBody(props: ReportBodyProps) {
  const { role, sellerId, isEmpty, canExport } = props;
  const canSee = reportCapsOf(role).canSeeAmounts;
  const stages = pipelineByStage(role, sellerId);
  const open = salesRows(role, sellerId).filter((r) => r.outcome === "Ανοιχτή");
  if (isEmpty || open.length === 0) {
    return (
      <StateNotice kind="empty" title="Καμία ανοιχτή Ευκαιρία">
        Δεν υπάρχουν ανοιχτές Ευκαιρίες.
      </StateNotice>
    );
  }
  const sum = (pick: (s: (typeof stages)[number]) => number): number =>
    stages.reduce((total, s) => total + pick(s), 0);
  const showOwner = sellersOf(role).length > 1 && !sellerId;
  return (
    <div className="m1s-body">
      <Cards
        items={[
          { label: "Ανοιχτές Ευκαιρίες", value: String(open.length) },
          {
            label: "Μηνιαία αξία",
            value: monthlyText(
              sum((s) => s.monthly),
              canSee,
            ),
          },
          {
            label: "Εφάπαξ αξία",
            value: money(
              sum((s) => s.once),
              canSee,
            ),
          },
        ]}
      />
      <table className="rtable">
        <thead>
          <tr>
            <th>Στάδιο</th>
            <th className="num">Ευκαιρίες</th>
            <th className="num">Μηνιαία αξία</th>
            <th className="num">Εφάπαξ αξία</th>
            <th className="num">Χωρίς πρόταση</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.stage}>
              <td data-label="Στάδιο">{s.stage}</td>
              <td className="num" data-label="Ευκαιρίες">
                {s.count}
              </td>
              <td className="num" data-label="Μηνιαία αξία">
                {monthlyText(s.monthly, canSee)}
              </td>
              <td className="num" data-label="Εφάπαξ αξία">
                {money(s.once, canSee)}
              </td>
              <td className="num" data-label="Χωρίς πρόταση">
                {s.withoutProposal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Section title="Οι ανοιχτές Ευκαιρίες">
        <OpenList rows={open} role={role} showOwner={showOwner} />
      </Section>
      <ExportRow canExport={canExport} />
    </div>
  );
}
