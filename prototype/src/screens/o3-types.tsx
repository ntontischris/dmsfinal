import Link from "next/link";

import {
  BENEFIT_TYPES,
  MEASURE_MODES,
  type BenefitType,
} from "@/data/settings-agreements";
import type { RoleId } from "@/data/roles";
import { SettingsCard } from "@/screens/o-shared";
import { Badge, screenHref, type ScreenQuery } from "@/screens/shared";

interface Props {
  role: RoleId;
  query: ScreenQuery;
  isEmpty: boolean;
}

function ActionCell({ item, href }: { item: BenefitType; href: string }) {
  if (item.status === "Νέα")
    return <Link href={`${href}delete`}>Διαγραφή</Link>;
  if (item.status === "Σε χρήση")
    return <Link href={`${href}retire`}>Απόσυρση</Link>;
  return <span className="muted">ξαναμπαίνει με το χέρι</span>;
}

// Είδη Παροχής: δίγλωσσα, γιατί τα βλέπει ο πελάτης.
export function BenefitTypesCard({ role, query, isEmpty }: Props) {
  const showRetired = query.retired === "types";
  const items = isEmpty ? [] : BENEFIT_TYPES;
  const visible = items.filter((i) => showRetired || i.status !== "Αποσύρθηκε");
  const [actId, actKind] = (query.act ?? "").split(":");
  const acted = items.find((i) => `types-${i.id}` === actId);
  const base = (act: string) =>
    screenHref(role, "O3", { state: query.state, set: query.set, act });
  return (
    <SettingsCard title="Είδη Παροχής">
      <Badge>ελληνικά και αγγλικά</Badge>
      {acted && actKind === "retire" && (
        <p className="note" role="status">
          «{acted.label}» αποσύρθηκε: φεύγει από τις νέες επιλογές, μένει στα{" "}
          {acted.uses} παλιά στοιχεία και μετριέται στις Αναφορές.
        </p>
      )}
      {acted && actKind === "delete" && (
        <p className="note" role="status">
          «{acted.label}» διαγράφηκε: δεν είχε χρησιμοποιηθεί ποτέ.
        </p>
      )}
      {visible.length === 0 ? (
        <p className="muted">
          Κανένα είδος Παροχής ακόμα. Χωρίς είδη δεν στήνεται Κατάλογος.
        </p>
      ) : (
        <div className="scroll">
          <table className="rtable o3-table">
            <thead>
              <tr>
                <th>Ετικέτα (el)</th>
                <th>Ετικέτα (en)</th>
                <th>Μονάδα</th>
                <th>Τρόπος μέτρησης</th>
                <th>Προεπιλεγμένη διάρκεια</th>
                <th>Όριο αλλαγών (γύροι)</th>
                <th>Κατάσταση</th>
                <th>Ενέργεια</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td data-label="Ετικέτα (el)">{item.label}</td>
                  <td data-label="Ετικέτα (en)">{item.labelEn}</td>
                  <td data-label="Μονάδα">{item.unit}</td>
                  <td data-label="Τρόπος μέτρησης">{item.measure}</td>
                  <td data-label="Προεπιλεγμένη διάρκεια">
                    {item.defaultDuration || "—"}
                  </td>
                  <td data-label="Όριο αλλαγών (γύροι)">
                    {item.changeLimit ?? "—"}
                  </td>
                  <td data-label="Κατάσταση">
                    {item.status}
                    {item.status !== "Νέα" && (
                      <span className="muted"> · {item.uses} χρήσεις</span>
                    )}
                  </td>
                  <td data-label="Ενέργεια">
                    <ActionCell item={item} href={base(`types-${item.id}:`)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="btn-row o-list-actions">
        <button type="button" className="button">
          + Νέο είδος Παροχής
        </button>
      </div>
      <p className="muted o-hint">
        Ο Τρόπος μέτρησης είναι σταθερή επιλογή ({MEASURE_MODES.join(" / ")}):
        το σύστημα ξέρει να μετρά μόνο αυτούς τους τρεις, γι αυτό δεν
        προστίθενται άλλοι. Τη λίστα τη βλέπει ο πελάτης, οπότε η αποθήκευση
        θέλει και τις δύο γλώσσες.
      </p>
      <p className="muted o-hint">
        Την προθεσμία παράδοσης ανά είδος την ορίζεις στα{" "}
        <Link href={screenHref(role, "O5", {})}>Παραδοτέα (O5)</Link>.
      </p>
    </SettingsCard>
  );
}
