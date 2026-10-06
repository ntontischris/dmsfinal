import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { RoleKind } from "@/data/team";
import { clientRoles, teamRoles } from "@/data/team-access";
import { PermissionMatrix } from "@/screens/n4-matrix";
import { n4Href } from "@/screens/n4-shared";
import type { ScreenQuery } from "@/screens/shared";

// «Νέος Ρόλος» (`?new=1&kind=…&from=…`): είδος, από το μηδέν ή «Αντίγραφο του…», Δικαιώματα.

const KINDS: readonly { kind: RoleKind; label: string }[] = [
  { kind: "ομάδας", label: "Ρόλος ομάδας" },
  { kind: "πελάτη", label: "Ρόλος πελάτη" },
];

const pickKind = (value: string | undefined): RoleKind =>
  value === "πελάτη" ? "πελάτη" : "ομάδας";

interface NewRoleProps {
  role: RoleId;
  query: ScreenQuery;
}

export function NewRole({ role, query }: NewRoleProps) {
  const kind = pickKind(query.kind);
  // Ο Ιδιοκτήτης δεν αντιγράφεται: ό,τι κάνει μόνο ο Ιδιοκτήτης δεν δίνεται σε Ρόλο.
  const sources = (kind === "ομάδας" ? teamRoles() : clientRoles()).filter(
    (def) => !def.isOwner,
  );
  const source = sources.find((def) => def.id === query.from);
  const href = (params: Record<string, string | undefined>) =>
    n4Href(role, query, { new: "1", kind, ...params });
  const chip = (isOn: boolean) => (isOn ? "strong" : undefined);
  return (
    <>
      <p>
        <Link href={n4Href(role, query, {})}>← Όλοι οι Ρόλοι</Link>
      </p>
      <section className="card n4-section">
        <h2 className="card-title">Νέος Ρόλος</h2>
        <div className="n4-chips" role="group" aria-label="Είδος">
          <span className="muted">Είδος:</span>
          {KINDS.map((k) => (
            <Link
              key={k.kind}
              className="badge"
              data-tone={chip(k.kind === kind)}
              aria-current={k.kind === kind ? "true" : undefined}
              href={n4Href(role, query, { new: "1", kind: k.kind })}
            >
              {k.label}
            </Link>
          ))}
        </div>
        <p className="note">
          Το είδος δεν αλλάζει μετά τη δημιουργία. Ένας Ρόλος ομάδας δεν γίνεται
          Ρόλος πελάτη, ούτε το αντίστροφο.
        </p>
        <div className="n4-chips" role="group" aria-label="Αφετηρία">
          <span className="muted">Ξεκίνα:</span>
          <Link
            className="badge"
            data-tone={chip(!source)}
            aria-current={!source ? "true" : undefined}
            href={href({ from: undefined })}
          >
            από το μηδέν
          </Link>
          {sources.map((def) => (
            <Link
              key={def.id}
              className="badge"
              data-tone={chip(def.id === source?.id)}
              aria-current={def.id === source?.id ? "true" : undefined}
              href={href({ from: def.id })}
            >
              Αντίγραφο του «{def.name}»
            </Link>
          ))}
        </div>
        {kind === "ομάδας" && (
          <p className="muted">
            Ο Ιδιοκτήτης δεν αντιγράφεται: όσα κάνει μόνο αυτός δεν δίνονται σε
            Ρόλο.
          </p>
        )}
        <div className="stack">
          <label htmlFor="n4-new-name">Όνομα</label>
          <input
            id="n4-new-name"
            className="input"
            defaultValue={source ? `${source.name} (αντίγραφο)` : ""}
            placeholder="π.χ. Μοντέρ εξωτερικός"
          />
          <label htmlFor="n4-new-desc">Περιγραφή</label>
          <textarea
            id="n4-new-desc"
            className="input"
            rows={2}
            defaultValue={source?.description ?? ""}
          />
        </div>
      </section>
      <section className="card n4-section">
        <h2 className="card-title">Δικαιώματα</h2>
        <PermissionMatrix
          kind={kind}
          grants={source?.grants ?? {}}
          prefix="new-"
        />
        <div className="btn-row n4-actions">
          <button type="button" className="button" data-primary="true">
            Δημιουργία Ρόλου
          </button>
          <Link className="button" href={n4Href(role, query, {})}>
            Άκυρο
          </Link>
        </div>
        <p className="note">
          Ο νέος Ρόλος δεν τον έχει κανείς ακόμα· η δημιουργία γράφεται στο
          Ίχνος. Μετά τον δίνεις από τη σελίδα του Ρόλου ή από την Ομάδα (N1).
        </p>
      </section>
    </>
  );
}
