import Link from "next/link";

import { AREA_LABELS, type AuditEntry } from "@/data/audit";
import type { RoleId } from "@/data/roles";
import type { SettingsCaps } from "@/data/settings-access";
import { fmtDateTime } from "@/screens/n5-integrations";
import { screenHref } from "@/screens/shared";

// Οι οθόνες αυτές δεν ανοίγουν για τη Διαχείριση: εκεί το Στοιχείο μένει απλό κείμενο.
const OWNER_ONLY_SCREENS: readonly string[] = ["I3", "N4", "N5"];

const canLink = (role: RoleId, entry: AuditEntry): boolean =>
  !!entry.subjectHref &&
  (role === "owner" || !OWNER_ONLY_SCREENS.includes(entry.subjectHref));

// Ποσά και κόστος κρύβονται ανά Δικαίωμα· η γραμμή μένει πάντα.
const hiddenLabel = (entry: AuditEntry, caps: SettingsCaps): string | null => {
  if (entry.sensitivity === "amount" && !caps.seesAmounts)
    return "— κρυφό ποσό —";
  if (entry.sensitivity === "cost" && !caps.canManageCost)
    return "— κρυφό κόστος —";
  return null;
};

function BeforeAfter({
  entry,
  hidden,
}: {
  entry: AuditEntry;
  hidden: string | null;
}) {
  if (hidden) return <span className="p1-hidden">{hidden}</span>;
  if (!entry.before && !entry.after) return <>—</>;
  return (
    <span className="p1-ba">
      {entry.before ?? "—"} → {entry.after ?? "—"}
    </span>
  );
}

interface Props {
  role: RoleId;
  caps: SettingsCaps;
  entries: readonly AuditEntry[];
}

export function AuditTable({ role, caps, entries }: Props) {
  return (
    <div className="scroll">
      <table className="rtable">
        <thead>
          <tr>
            <th>Πότε</th>
            <th>Ποιος</th>
            <th>Περιοχή</th>
            <th>Στοιχείο</th>
            <th>Ενέργεια</th>
            <th>Πριν → Μετά</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td data-label="Πότε">{fmtDateTime(e.at)}</td>
              <td data-label="Ποιος">{e.actor}</td>
              <td data-label="Περιοχή">{AREA_LABELS[e.area]}</td>
              <td data-label="Στοιχείο">
                {e.subjectHref && canLink(role, e) ? (
                  <Link
                    href={screenHref(role, e.subjectHref, e.subjectQuery ?? {})}
                  >
                    {e.subject}
                  </Link>
                ) : (
                  e.subject
                )}
              </td>
              <td data-label="Ενέργεια">{e.action}</td>
              <td data-label="Πριν → Μετά">
                <BeforeAfter entry={e} hidden={hiddenLabel(e, caps)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
