import {
  reportCapsOf,
  resultsOf,
  sellersOf,
  sourcesOf,
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
  rowValue,
} from "@/screens/m1-sales-parts";
import { Badge, StateNotice, fmtDate, fmtPercent } from "@/screens/shared";

const sumOf = (rows: readonly SalesRow[], pick: "monthly" | "once"): number =>
  rows.reduce((total, r) => total + (r[pick] ?? 0), 0);

function wonHint(won: readonly SalesRow[], canSee: boolean): string {
  return `${monthlyText(sumOf(won, "monthly"), canSee)} · ${money(sumOf(won, "once"), canSee)} εφάπαξ`;
}

function ClosedTable({
  rows,
  canSee,
  showOwner,
}: {
  rows: readonly SalesRow[];
  canSee: boolean;
  showOwner: boolean;
}) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Ευκαιρία</th>
          <th>Έκβαση</th>
          <th>Ημερομηνία Έκβασης</th>
          <th className="num">Αξία</th>
          {showOwner && <th>Υπεύθυνος</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td data-label="Ευκαιρία">
              {r.title} · {r.clientName}
            </td>
            <td data-label="Έκβαση">
              <Badge tone={r.outcome === "Κερδισμένη" ? "strong" : undefined}>
                {r.outcome}
              </Badge>
              {r.outcome === "Χαμένη" && r.lostReason && ` ${r.lostReason}`}
            </td>
            <td data-label="Ημερομηνία Έκβασης">
              {r.closed ? fmtDate(r.closed) : "—"}
            </td>
            <td className="num" data-label="Αξία">
              {rowValue(r, canSee)}
            </td>
            {showOwner && (
              <td data-label="Υπεύθυνος">{memberName(r.ownerId)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ResultsBody(props: ReportBodyProps) {
  const { role, range, sellerId, isEmpty, canExport } = props;
  const canSee = reportCapsOf(role).canSeeAmounts;
  const res = resultsOf(role, range, sellerId);
  const closed = [...res.won, ...res.lost].sort((a, b) =>
    (b.closed ?? "").localeCompare(a.closed ?? ""),
  );
  if (isEmpty || closed.length === 0) {
    return (
      <StateNotice kind="empty" title="Καμία έκβαση στην περίοδο">
        Δεν έκλεισε καμία Ευκαιρία σε αυτή την περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1s-body">
      <Cards
        items={[
          {
            label: "Κερδισμένες",
            value: String(res.won.length),
            hint: wonHint(res.won, canSee),
          },
          { label: "Χαμένες", value: String(res.lost.length) },
          {
            label: "Ποσοστό επιτυχίας",
            value: res.winRate === null ? "—" : fmtPercent(res.winRate),
          },
        ]}
      />
      {res.lossReasons.length > 0 && (
        <Section title="Λόγοι απώλειας">
          <table className="rtable">
            <thead>
              <tr>
                <th>Λόγος</th>
                <th className="num">Ευκαιρίες</th>
              </tr>
            </thead>
            <tbody>
              {res.lossReasons.map((l) => (
                <tr key={l.reason}>
                  <td data-label="Λόγος">{l.reason}</td>
                  <td className="num" data-label="Ευκαιρίες">
                    {l.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
      <Section title="Οι Ευκαιρίες που έκλεισαν">
        <ClosedTable
          rows={closed}
          canSee={canSee}
          showOwner={sellersOf(role).length > 1}
        />
      </Section>
      <ExportRow canExport={canExport} />
    </div>
  );
}

export function SourcesBody(props: ReportBodyProps) {
  const { role, range, sellerId, isEmpty, canExport } = props;
  const rows = sourcesOf(role, range, sellerId);
  if (isEmpty || rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Καμία νέα Ευκαιρία">
        Δεν άνοιξε καμία Ευκαιρία σε αυτή την περίοδο.
      </StateNotice>
    );
  }
  return (
    <div className="m1s-body">
      <p className="note">Μετρά τις Ευκαιρίες που άνοιξαν μέσα στην περίοδο.</p>
      <table className="rtable">
        <thead>
          <tr>
            <th>Πηγή</th>
            <th className="num">Άνοιξαν</th>
            <th className="num">Κερδήθηκαν</th>
            <th className="num">Χάθηκαν</th>
            <th className="num">Ακόμα ανοιχτές</th>
            <th className="num">Ποσοστό επιτυχίας</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.source}>
              <td data-label="Πηγή">{r.source}</td>
              <td className="num" data-label="Άνοιξαν">
                {r.opened}
              </td>
              <td className="num" data-label="Κερδήθηκαν">
                {r.won}
              </td>
              <td className="num" data-label="Χάθηκαν">
                {r.lost}
              </td>
              <td className="num" data-label="Ακόμα ανοιχτές">
                {r.open}
              </td>
              <td className="num" data-label="Ποσοστό επιτυχίας">
                {r.won + r.lost > 0
                  ? fmtPercent(r.won / (r.won + r.lost))
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ExportRow canExport={canExport} />
    </div>
  );
}
