import Link from "next/link";

import type { ProductionStub } from "@/data/filming";
import type { TrailEntry } from "@/data/productions";
import { isInternal } from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import { fmtDate, screenHref } from "@/screens/shared";

export function G2Messages({
  role,
  production,
}: {
  role: RoleId;
  production: ProductionStub;
}) {
  return (
    <section className="card">
      <h2>Μηνύματα της ετικέτας</h2>
      {isInternal(production) ? (
        <p className="muted">
          Εσωτερική Παραγωγή: δεν έχει Συνομιλία πελάτη· μόνο Εσωτερικά
          Μηνύματα.
        </p>
      ) : (
        <>
          <p className="muted">
            Η Συνομιλία είναι μία ανά Πελάτη. Τα μηνύματα με την ετικέτα αυτής
            της Παραγωγής ανοίγουν φιλτραρισμένα στη Συνομιλία.
          </p>
          <Link
            className="button"
            href={
              role === "client"
                ? screenHref(role, "J3", {})
                : screenHref(role, "J2", {
                    client: production.clientId,
                    production: production.id,
                  })
            }
          >
            Άνοιγμα Συνομιλίας
          </Link>
        </>
      )}
    </section>
  );
}

export function G2Extras({
  extras,
  fmt,
}: {
  extras: readonly { label: string; amount: number }[];
  fmt: (value: number) => string;
}) {
  return (
    <section className="card">
      <h2>Τιμολογητέα της Παραγωγής</h2>
      {extras.length === 0 && <p className="muted">Κανένα.</p>}
      <ul className="list">
        {extras.map((e) => (
          <li key={e.label} className="row">
            <span>{e.label}</span>
            <strong>{fmt(e.amount)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function G2Trail({
  trail,
  canSeeCost,
}: {
  trail: readonly TrailEntry[];
  canSeeCost: boolean;
}) {
  const shown = trail.filter((e) => canSeeCost || !e.costOnly);
  return (
    <section className="card">
      <h2>Ίχνος ενεργειών</h2>
      {shown.length === 0 && (
        <p className="muted">Δεν υπάρχουν ακόμα ενέργειες.</p>
      )}
      <ul className="list">
        {shown.map((e) => (
          <li key={`${e.when}-${e.what}`}>
            <span className="muted">
              {fmtDate(e.when.slice(0, 10))} · {e.who}
            </span>
            <div>{e.what}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

