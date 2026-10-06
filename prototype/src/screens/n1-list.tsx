import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { TEAM_USERS, type TeamUser } from "@/data/team";
import { roleNames } from "@/data/team-access";
import { Badge, fmtDate, screenHref, type ScreenQuery } from "@/screens/shared";

type StatusFilter = "active" | "inactive";

const pickFilter = (value: string | undefined): StatusFilter =>
  value === "inactive" ? "inactive" : "active";

const matches = (user: TeamUser, filter: StatusFilter): boolean =>
  filter === "active" ? user.status === "ενεργός" : user.status !== "ενεργός";

const lastSeenLabel = (user: TeamUser): string =>
  user.lastSeen ? fmtDate(user.lastSeen) : "ποτέ";

interface UserListProps {
  role: RoleId;
  query: ScreenQuery;
  actorId: string;
}

export function UserList({ role, query, actorId }: UserListProps) {
  const filter = pickFilter(query.status);
  const users = TEAM_USERS.filter((u) => matches(u, filter));
  const count = (f: StatusFilter) =>
    TEAM_USERS.filter((u) => matches(u, f)).length;
  const tabHref = (f: StatusFilter) =>
    screenHref(role, "N1", {
      ...query,
      status: f === "active" ? undefined : f,
    });
  return (
    <section className="card n1-section">
      <div className="card-title">
        <h2>Χρήστες ομάδας</h2>
        <a className="button" data-primary href="#n1-invite">
          Πρόσκληση Χρήστη
        </a>
      </div>
      <nav className="tabs" aria-label="Κατάσταση Χρηστών">
        <Link
          className="tab"
          href={tabHref("active")}
          aria-current={filter === "active" ? "page" : undefined}
        >
          Ενεργοί ({count("active")})
        </Link>
        <Link
          className="tab"
          href={tabHref("inactive")}
          aria-current={filter === "inactive" ? "page" : undefined}
        >
          Απενεργοποιημένοι ({count("inactive")})
        </Link>
      </nav>
      {users.length === 0 ? (
        <p className="muted">
          Κανένας απενεργοποιημένος Χρήστης. Όποιον απενεργοποιήσεις μένει εδώ,
          με τους Ρόλους του, για Επανενεργοποίηση.
        </p>
      ) : (
        <table className="rtable">
          <thead>
            <tr>
              <th>Όνομα</th>
              <th>Email</th>
              <th>Ρόλοι</th>
              <th>Κατάσταση</th>
              <th>Τελευταία είσοδος</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Όνομα">
                  <Link href={screenHref(role, "N1", { user: u.id })}>
                    {u.name}
                  </Link>
                  {u.id === actorId && " (εσύ)"}
                </td>
                <td data-label="Email" className="n1-email">
                  {u.email}
                </td>
                <td data-label="Ρόλοι">{roleNames(u.roleIds)}</td>
                <td data-label="Κατάσταση">
                  {u.status === "ενεργός" ? (
                    <Badge>ενεργός</Badge>
                  ) : (
                    <Badge tone="attention">
                      {u.status}
                      {u.deactivatedAt && ` ${fmtDate(u.deactivatedAt)}`}
                    </Badge>
                  )}
                </td>
                <td data-label="Τελευταία είσοδος">{lastSeenLabel(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
