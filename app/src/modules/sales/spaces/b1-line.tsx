import Link from "next/link";

import { Meter } from "@/spaces/kit/parts";
import { initialsOf } from "@/spaces/shell/avatar";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import type { B1Columns, B1Row } from "./b1-adapter";

// Η κατάσταση δίνει το χρώμα της γραμμής: ενεργός = periwinkle, υποψήφιος = κίτρινη λεπτομέρεια, ανενεργός = αχνός.
const STATUS_TONE: Readonly<Record<string, string>> = {
  Ενεργός: "active",
  Υποψήφιος: "waiting",
  Ανενεργός: "inactive",
};

// Τα γεγονότα των παλιών στηλών σε μία μικρή γραμμή: Πόλη · Υπεύθυνος · Ευκαιρίες · τελευταία επαφή · Συμφωνίες.
const factsOf = (row: B1Row, columns: B1Columns): readonly string[] => [
  ...(row.city ? [row.city] : []),
  ...(columns.showOwner ? [`Υπεύθυνος: ${row.owner || "—"}`] : []),
  ...(columns.showOpportunities
    ? [
        `${row.openOpportunities ?? "—"} ανοιχτές Ευκαιρίες`,
        `τελευταία επαφή ${row.lastContact ? fmtDate(row.lastContact) : "καμία"}`,
      ]
    : []),
  ...(columns.showAgreements
    ? [`${row.activeAgreements ?? "—"} ενεργές Συμφωνίες`]
    : []),
];

// Πακέτο και μήνας: οι μπάρες ανά Παροχή, το επόμενο γύρισμα και η προειδοποίηση «Χωρίς γύρισμα».
function MonthGlance({ row }: { row: B1Row }) {
  if (!row.packageName && !row.month) return null;
  return (
    <div className="b1-month" aria-label={row.month?.text}>
      {row.packageName && <span className="b1-package">{row.packageName}</span>}
      {row.month?.meters.map((meter) => (
        <Meter key={meter.label} {...meter} />
      ))}
      {row.month?.next && (
        <span className="part-sub">
          επόμενο γύρισμα <strong>{row.month.next}</strong>
        </span>
      )}
      {row.month?.hasNoShoot && <Badge tone="attention">Χωρίς γύρισμα</Badge>}
    </div>
  );
}

interface ClientLineProps extends B1Columns {
  row: B1Row;
}

// Ένας Πελάτης, μία γραμμή (όπως τα Τιμολόγια): αρχικά, κατάσταση, όνομα, τα γεγονότα των στηλών, Υπόλοιπο, διπλό.
export function ClientLine({ row, ...columns }: ClientLineProps) {
  return (
    <tr
      className="ml-line b1-line"
      data-tone={row.status ? STATUS_TONE[row.status] : undefined}
      data-urgent={row.month?.hasNoShoot ? "" : undefined}
    >
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(row.name)}
      </td>
      <td className="ml-main" data-label="Πελάτης">
        <span className="ml-tag">{row.status ?? "—"}</span>
        <strong>
          <Link href={row.href}>{row.name}</Link>
        </strong>
        <small>{factsOf(row, columns).join(" · ")}</small>
        {row.ownership && (
          <small>
            <Badge>{row.ownership.badge}</Badge> {row.ownership.note}
          </small>
        )}
        <MonthGlance row={row} />
      </td>
      <td className="ml-amount" data-label="Υπόλοιπο">
        {columns.showBalance && (
          <>
            {row.balance ?? "—"}
            <small>Υπόλοιπο</small>
          </>
        )}
      </td>
      <td className="ml-quick">
        {row.isPossibleDuplicate && (
          <Link className="b1-duplicate" href={row.mergeHref}>
            Πιθανό διπλό: συγχώνευση ή όχι
          </Link>
        )}
      </td>
    </tr>
  );
}

// Πελάτης άλλου πωλητή: μόνο το όνομα και ποιος τον έχει, χωρίς σύνδεσμο.
export function TakenLine({ row }: { row: B1Row }) {
  return (
    <tr className="ml-line b1-line taken" data-faded="">
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(row.name)}
      </td>
      <td className="ml-main" colSpan={3}>
        <strong className="part-title">{row.name}</strong>
        {row.ownership && (
          <small>
            <Badge>{row.ownership.badge}</Badge> {row.ownership.note}
          </small>
        )}
      </td>
    </tr>
  );
}
