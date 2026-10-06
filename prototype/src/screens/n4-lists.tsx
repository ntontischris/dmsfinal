import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { OWNER_ONLY, type RoleDef } from "@/data/team";
import { clientRoles, teamRoles, usersWithRole } from "@/data/team-access";
import { n4Href, pluralUsers } from "@/screens/n4-shared";
import { Badge, type ScreenQuery } from "@/screens/shared";

// Η αρχική της N4: Ρόλοι ομάδας, Ρόλοι πελάτη, και τα «Μόνο ο Ιδιοκτήτης».

interface RoleListProps {
  role: RoleId;
  query: ScreenQuery;
  title: string;
  roles: readonly RoleDef[];
  kind: RoleDef["kind"];
}

function RoleList({ role, query, title, roles, kind }: RoleListProps) {
  return (
    <section className="card n4-section">
      <div className="card-title">
        <h2>{title}</h2>
        <Link className="button" href={n4Href(role, query, { new: "1", kind })}>
          Νέος Ρόλος
        </Link>
      </div>
      <ul className="list">
        {roles.map((def) => (
          <li key={def.id} className="row">
            <span className="n4-role-name">
              <Link href={n4Href(role, query, { roleDef: def.id })}>
                {def.name}
              </Link>
              <span className="muted">{def.description}</span>
            </span>
            <span className="btn-row">
              <span className="muted">
                {pluralUsers(usersWithRole(def.id))}
              </span>
              {def.isBuiltIn ? (
                <Badge>έτοιμος</Badge>
              ) : (
                <Badge tone="strong">δικός σου</Badge>
              )}
              {def.isOwner && <Badge tone="attention">κλειδωμένος</Badge>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OwnerOnlySection() {
  return (
    <section className="card n4-section">
      <h2 className="card-title">Μόνο ο Ιδιοκτήτης</h2>
      <p className="muted">
        Αυτά δεν είναι Δικαιώματα: δεν δίνονται σε κανέναν Ρόλο, ούτε στη
        Διαχείριση. Τα κάνει μόνο όποιος έχει τον Ρόλο Ιδιοκτήτης.
      </p>
      <ul className="list">
        {OWNER_ONLY.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

interface RoleListsProps {
  role: RoleId;
  query: ScreenQuery;
  builtInOnly: boolean;
}

export function RoleLists({ role, query, builtInOnly }: RoleListsProps) {
  const pick = (roles: readonly RoleDef[]) =>
    builtInOnly ? roles.filter((def) => def.isBuiltIn) : roles;
  return (
    <>
      <RoleList
        role={role}
        query={query}
        title="Ρόλοι ομάδας"
        roles={pick(teamRoles())}
        kind="ομάδας"
      />
      <RoleList
        role={role}
        query={query}
        title="Ρόλοι πελάτη"
        roles={pick(clientRoles())}
        kind="πελάτη"
      />
      <OwnerOnlySection />
      <p className="note">
        Ένας Χρήστης ομάδας μπορεί να έχει πολλούς Ρόλους· ισχύει το ευρύτερο
        Εύρος. Τους Ρόλους των Χρηστών τους δίνεις και στην οθόνη Ομάδα (N1).
      </p>
    </>
  );
}
