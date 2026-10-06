import Link from "next/link";

import { findRoleDef, teamCapsOf } from "@/data/team-access";
import { RoleLists } from "@/screens/n4-lists";
import { NewRole } from "@/screens/n4-new";
import { RolePage } from "@/screens/n4-role";
import { n4Href } from "@/screens/n4-shared";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./n4.css";

// N4 «Ρόλοι και Δικαιώματα»: μόνο ο Ιδιοκτήτης (απόφαση Ζ).
export function N4({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { ...query, state: undefined };
  const header = (
    <StateSwitcher role={role} code="N4" state={state} keep={keep} />
  );
  if (!teamCapsOf(role).isOwner) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Τους Ρόλους και τα Δικαιώματά τους (νέοι Ρόλοι, Εύρος, διαγραφή)
            τους αλλάζει μόνο ο Ιδιοκτήτης.
          </p>
          {role === "admin" && (
            <p>
              Ρόλους σε Χρήστες ομάδας δίνεις στην{" "}
              <Link href={screenHref(role, "N1", {})}>Ομάδα (N1)</Link>.
            </p>
          )}
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τους Ρόλους" />
      </>
    );
  }
  if (query.new === "1") {
    return (
      <div className="n4">
        {header}
        <NewRole role={role} query={query} />
      </div>
    );
  }
  const def = query.roleDef ? findRoleDef(query.roleDef) : undefined;
  if (query.roleDef && !def) {
    return (
      <>
        {header}
        <StateNotice kind="empty" title="Αυτός ο Ρόλος δεν υπάρχει">
          <p>Ίσως διαγράφηκε.</p>
          <p>
            <Link href={n4Href(role, query, {})}>Όλοι οι Ρόλοι</Link>
          </p>
        </StateNotice>
      </>
    );
  }
  return (
    <div className="n4">
      {header}
      {def ? (
        <RolePage role={role} query={query} def={def} />
      ) : (
        <>
          {state === "empty" && (
            <StateNotice kind="empty" title="Δεν έχεις φτιάξει δικό σου Ρόλο">
              Υπάρχουν μόνο οι έτοιμοι Ρόλοι. Με «Νέος Ρόλος» φτιάχνεις έναν από
              το μηδέν ή ως «Αντίγραφο του…» έτοιμου, π.χ. για εξωτερικό
              συνεργάτη που βλέπει μόνο τα Γυρίσματά του.
            </StateNotice>
          )}
          <RoleLists
            role={role}
            query={query}
            builtInOnly={state === "empty"}
          />
        </>
      )}
    </div>
  );
}
