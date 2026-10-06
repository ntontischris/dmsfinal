import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { PERMISSIONS, type RoleDef } from "@/data/team";
import { PermissionMatrix } from "@/screens/n4-matrix";
import { DeleteSection, HoldersSection } from "@/screens/n4-role-people";
import { n4Href, pluralUsers, roleHolders } from "@/screens/n4-shared";
import { Badge, type ScreenQuery } from "@/screens/shared";

// Η σελίδα ενός Ρόλου (`?roleDef=`): στοιχεία, Δικαιώματα, αποθήκευση με προεπισκόπηση, Χρήστες, διαγραφή.

interface RolePageProps {
  role: RoleId;
  query: ScreenQuery;
  def: RoleDef;
}

// Ένα ενδεικτικό «πριν → μετά» για την προεπισκόπηση: το πρώτο Δικαίωμα που δεν έχει ο Ρόλος.
const sampleChange = (def: RoleDef): string => {
  const perm = PERMISSIONS.find(
    (p) => p.kind === def.kind && !def.grants[p.id],
  );
  if (!perm) return "—";
  const after = def.kind === "πελάτη" ? "Ναι" : "Όλα";
  const before = def.kind === "πελάτη" ? "Όχι" : "—";
  return `«${perm.label}»: ${before} → ${after}`;
};

function SavePreview({ role, query, def }: RolePageProps) {
  const holders = roleHolders(def);
  const names = holders.map((h) => h.name).join(", ");
  return (
    <div className="n4-confirm" role="alertdialog" aria-label="Προεπισκόπηση">
      <p>
        <strong>Επηρεάζει {pluralUsers(holders.length)}</strong>
        {holders.length > 0 && <>: {names}</>}· ισχύει στην επόμενη ενέργειά
        τους.
      </p>
      <p className="muted">Αλλαγές: {sampleChange(def)}</p>
      <p className="note">
        Η αλλαγή γράφεται στο Ίχνος, με το πριν και το μετά για κάθε Δικαίωμα.
      </p>
      <div className="btn-row">
        <button type="button" className="button" data-primary="true">
          Επιβεβαίωση αποθήκευσης
        </button>
        <Link
          className="button"
          href={n4Href(role, query, { roleDef: def.id })}
        >
          Άκυρο
        </Link>
      </div>
    </div>
  );
}

function RoleDetails({ def }: { def: RoleDef }) {
  return (
    <div className="stack">
      <label htmlFor="n4-name">Όνομα</label>
      <input
        id="n4-name"
        className="input"
        defaultValue={def.name}
        disabled={def.isOwner}
      />
      <label htmlFor="n4-desc">Περιγραφή</label>
      <textarea
        id="n4-desc"
        className="input"
        rows={2}
        defaultValue={def.description}
        disabled={def.isOwner}
      />
      <p className="muted">
        Είδος: Ρόλος {def.kind} (το είδος δεν αλλάζει μετά τη δημιουργία).
      </p>
    </div>
  );
}

export function RolePage({ role, query, def }: RolePageProps) {
  const isSaving = query.confirm === "save" && !def.isOwner;
  return (
    <>
      <p>
        <Link href={n4Href(role, query, {})}>← Όλοι οι Ρόλοι</Link>
      </p>
      <section className="card n4-section">
        <div className="card-title">
          <h2>{def.name}</h2>
          <span className="btn-row">
            {def.isBuiltIn ? (
              <Badge>έτοιμος</Badge>
            ) : (
              <Badge tone="strong">δικός σου</Badge>
            )}
            {def.isOwner && <Badge tone="attention">κλειδωμένος</Badge>}
          </span>
        </div>
        <RoleDetails def={def} />
        {def.isOwner && (
          <p className="note">
            Ο Ιδιοκτήτης έχει πάντα «Όλα» σε κάθε Δικαίωμα και επιπλέον όσα
            κάνει μόνο ο Ιδιοκτήτης. Δεν αλλάζει και δεν διαγράφεται.
          </p>
        )}
      </section>
      <section className="card n4-section">
        <h2 className="card-title">Δικαιώματα</h2>
        <PermissionMatrix
          kind={def.kind}
          grants={def.grants}
          locked={def.isOwner}
        />
        {!def.isOwner &&
          (isSaving ? (
            <SavePreview role={role} query={query} def={def} />
          ) : (
            <div className="btn-row n4-actions">
              <Link
                className="button"
                data-primary="true"
                href={n4Href(role, query, { roleDef: def.id, confirm: "save" })}
              >
                Αποθήκευση
              </Link>
            </div>
          ))}
      </section>
      <HoldersSection def={def} />
      <DeleteSection role={role} query={query} def={def} />
    </>
  );
}
