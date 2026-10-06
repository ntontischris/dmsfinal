import Link from "next/link";

import { personName, type ProductionStub } from "@/data/filming";
import type { RoleId } from "@/data/roles";
import { nextFilmingOf, sortKeyOf } from "@/screens/g1-rows";
import { progressOf, recordOf, stateOf } from "@/data/productions-access";
import { fmtDate, screenHref } from "@/screens/shared";

import "./g1.css";

const stateLabel = (p: ProductionStub): string => {
  const state = stateOf(p);
  if (state === "ακυρωμένη") return "ακυρώθηκε";
  if (state === "ανοιχτή") return "σε εξέλιξη";
  const when = recordOf(p).delivery?.when;
  return when ? `παραδόθηκε στις ${fmtDate(when.slice(0, 10))}` : "παραδόθηκε";
};

function ClientCard({ role, p }: { role: RoleId; p: ProductionStub }) {
  const progress = progressOf(p);
  const next = nextFilmingOf(p);
  return (
    <article className="card">
      <h3>
        <Link href={screenHref(role, "G2", { id: p.id })}>{p.title}</Link>
      </h3>
      <p className="muted">{stateLabel(p)}</p>
      <ul>
        <li>εγκρίθηκαν {progress.approved}</li>
        <li>περιμένουν εσένα {progress.waitingClient}</li>
        <li>σε εργασία {progress.inWork}</li>
      </ul>
      <p>Επόμενο Γύρισμα: {next ? fmtDate(next) : "—"}</p>
      <p className="muted">Υπεύθυνος: {personName(p.ownerId)}</p>
    </article>
  );
}

const groupLabelOf = (p: ProductionStub): string => p.periodLabel ?? "Εφάπαξ";

// Ομαδοποίηση ανά Περίοδο, η πιο πρόσφατη πρώτη.
export function G1ClientCards({
  role,
  productions,
}: {
  role: RoleId;
  productions: readonly ProductionStub[];
}) {
  const sorted = [...productions].sort((a, b) =>
    sortKeyOf(b).localeCompare(sortKeyOf(a)),
  );
  const labels = [...new Set(sorted.map(groupLabelOf))];
  return (
    <>
      {labels.map((label) => (
        <section key={label}>
          <h2>{label}</h2>
          <div className="g1-cards">
            {sorted
              .filter((p) => groupLabelOf(p) === label)
              .map((p) => (
                <ClientCard key={p.id} role={role} p={p} />
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
