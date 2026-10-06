import Link from "next/link";

import { detailOf, latestVersion } from "@/data/deliverables-access";
import type { DeliverableSummary } from "@/data/productions";
import type { RoleId } from "@/data/roles";
import { productionLabel, reviewWaitLabel, whoLabel } from "@/screens/h1-model";
import { fmtDate, screenHref } from "@/screens/shared";

import "./h1.css";

interface ReviewProps {
  role: RoleId;
  items: readonly DeliverableSummary[];
}

export function ReviewTable({ role, items }: ReviewProps) {
  return (
    <>
      <p className="note">Η Έκδοση του Ελεγκτή δεν περνά από εδώ.</p>
      <table className="rtable">
        <thead>
          <tr>
            <th>Παραδοτέο</th>
            <th>Έκδοση</th>
            <th>Την πρόσθεσε</th>
            <th>Πότε</th>
            <th>Περιμένει</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <ReviewRow key={d.id} role={role} d={d} />
          ))}
        </tbody>
      </table>
    </>
  );
}

function ReviewRow({ role, d }: { role: RoleId; d: DeliverableSummary }) {
  const version = latestVersion(detailOf(d));
  const href = screenHref(role, "H2", {
    id: d.id,
    v: version ? String(version.number) : undefined,
  });
  return (
    <tr>
      <td data-label="Παραδοτέο" className="h1-cell">
        {d.title}
        <span className="h1-sub">{productionLabel(d)}</span>
      </td>
      <td data-label="Έκδοση">{version ? `v${version.number}` : "—"}</td>
      <td data-label="Την πρόσθεσε">
        {version ? whoLabel(version.addedBy) : "—"}
      </td>
      <td data-label="Πότε">{version ? fmtDate(version.addedAt.slice(0, 10)) : "—"}</td>
      <td data-label="Περιμένει">
        {version ? reviewWaitLabel(version.addedAt) : "—"}
      </td>
      <td>
        <Link className="button" data-primary="true" href={href}>
          Άνοιγμα για έλεγχο
        </Link>
      </td>
    </tr>
  );
}
