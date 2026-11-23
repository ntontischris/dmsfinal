import Link from "next/link";

import { Pending } from "@/modules/settings";
import { hrefOf } from "@/spaces/data/screens";
import { StateNotice, fmtMoney } from "@/spaces/screens/shared";

import { G3Box } from "./g3-box";
import type { ChangeRow, HourCostGlance, MethodItem } from "./o6-adapter";
import { MethodsHead, initialsOf } from "./o6-lines";

// Τα μπλοκ της O6 (prototype `screens/o6-cost.tsx`, `o-shared.tsx`) που δεν είναι φόρμες, στη μορφή «Χρήματα»:
// γραμμές (ml-line) και κλειστά κουτιά. Οι καρτέλες και το «εκκρεμεί» είναι τα κοινά των Ρυθμίσεων (`@/modules/settings`).

export function NoCostPermission() {
  return (
    <StateNotice kind="denied" title="Θέλει το Δικαίωμα «Διαχειρίζεται κόστος»">
      Τα έξοδα περιέχουν μισθούς, οπότε τα βλέπει και τα αλλάζει μόνο όποιος
      έχει αυτό το Δικαίωμα (αρχικά μόνο ο Ιδιοκτήτης).
    </StateNotice>
  );
}

// Χωρίς «Διαχειρίζεται κόστος»: μόνο το σύνολο Κόστος ώρας του μήνα (prototype `O6AdminCost`). Το νούμερο φαίνεται
// ήδη στην υπόδειξη του κλειστού κουτιού.
export function AdminCost({ glance }: { glance: HourCostGlance }) {
  const value =
    glance.hourCost === null ? null : `${fmtMoney(glance.hourCost)} ανά ώρα`;
  return (
    <>
      <NoCostPermission />
      <G3Box
        title={
          glance.monthLabel
            ? `Κόστος ώρας, ${glance.monthLabel}`
            : "Κόστος ώρας"
        }
        hint={value ?? <Pending />}
      >
        <p>{value === null ? <Pending /> : <strong>{value}</strong>}</p>
        <p className="muted o-hint">
          Βλέπεις μόνο το σύνολο· τα έξοδα και οι μισθοί φαίνονται σε όποιον
          έχει το Δικαίωμα.
        </p>
      </G3Box>
    </>
  );
}

// Οι Τρόποι είσπραξης μόνο για ανάγνωση: ίδιες γραμμές, χωρίς κουμπιά.
export function MethodsList({ items }: { items: readonly MethodItem[] }) {
  return (
    <section className="o6-methods">
      <MethodsHead
        inUse={items.filter((item) => item.status === "Σε χρήση").length}
      />
      <ul className="ml-list">
        {items.map((item) => (
          <li
            key={item.id}
            className="ml-line"
            data-faded={item.status === "Αποσύρθηκε" || undefined}
          >
            <span className="ml-thumb" aria-hidden="true">
              {initialsOf(item.label)}
            </span>
            <span className="ml-main">
              <span className="ml-tag">{item.status}</span>
              <strong>{item.label}</strong>
            </span>
          </li>
        ))}
      </ul>
      <p className="muted o-hint">
        Αλλάζουν μόνο από όποιον «Διαχειρίζεται Ρυθμίσεις».
      </p>
    </section>
  );
}

export function RecentChanges({
  rows,
  canSeeAudit,
}: {
  rows: readonly ChangeRow[];
  canSeeAudit: boolean;
}) {
  return (
    <G3Box
      title="Τελευταίες αλλαγές"
      hint={
        rows.length === 0
          ? "Καμία αλλαγή ακόμα"
          : `${rows.length} αλλαγές · τελευταία ${rows[0]?.when ?? ""}`
      }
    >
      {canSeeAudit && (
        <p>
          <Link href={hrefOf("P1")}>Όλες οι αλλαγές στο Ίχνος</Link>
        </p>
      )}
      {rows.length === 0 ? (
        <p className="muted">Καμία αλλαγή ακόμα σε αυτή την ενότητα.</p>
      ) : (
        <ul className="ml-list">
          {rows.map((row) => (
            <li key={row.key} className="ml-line">
              <span className="ml-thumb" aria-hidden="true">
                {initialsOf(row.title)}
              </span>
              <span className="ml-main">
                <span className="ml-tag">{row.when}</span>
                <strong>{row.title}</strong>
                <small>{row.sub}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </G3Box>
  );
}
