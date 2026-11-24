import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { fmtDate } from "@/spaces/screens/shared";

import { matchesFilter, type N1User, type StatusFilter } from "./n1-adapter";
import { Line, ListSection } from "./n-parts";

const lastSeenLabel = (user: N1User): string | null => {
  if (user.lastSeen === undefined) return null;
  return user.lastSeen ? fmtDate(user.lastSeen) : "ποτέ";
};

const filterHref = (filter: StatusFilter): string =>
  hrefOf("N1", { status: filter === "active" ? undefined : filter });

const statusTag = (user: N1User): string =>
  user.isActive
    ? "ενεργός"
    : `απενεργοποιημένος${user.deactivatedAt ? ` ${fmtDate(user.deactivatedAt)}` : ""}`;

function UserLine({ user }: { user: N1User }) {
  const lastSeen = lastSeenLabel(user);
  return (
    <Line
      name={user.name}
      href={user.href}
      title={user.isSelf ? `${user.name} (εσύ)` : user.name}
      tag={statusTag(user)}
      sub={
        <span className="n1-email">
          {user.email} · {user.roles}
          {lastSeen && ` · Τελευταία είσοδος: ${lastSeen}`}
        </span>
      }
      isFaded={!user.isActive}
    />
  );
}

interface UserListProps {
  users: readonly N1User[];
  filter: StatusFilter;
  // Ο Ιδιοκτήτης: γρήγορος σύνδεσμος στους Ρόλους και τα Δικαιώματα (N4).
  canManageRoles?: boolean;
}

// Οι Χρήστες ομάδας (Ενεργοί / Απενεργοποιημένοι ως φίλτρα), σε γραμμές όπως η λίστα των Τιμολογίων.
export function UserList({ users, filter, canManageRoles }: UserListProps) {
  const shown = users.filter((u) => matchesFilter(u, filter));
  const count = (f: StatusFilter) =>
    users.filter((u) => matchesFilter(u, f)).length;
  return (
    <ListSection
      title="Χρήστες ομάδας"
      quick={
        <>
          {canManageRoles && (
            <Link href={hrefOf("N4")}>Ρόλοι και Δικαιώματα</Link>
          )}
          <Link href={hrefOf("N6")} data-primary>
            Πρόσκληση Χρήστη
          </Link>
        </>
      }
    >
      <nav className="page-filters" aria-label="Κατάσταση Χρηστών">
        <Link
          href={filterHref("active")}
          scroll={false}
          aria-current={filter === "active" ? "page" : undefined}
        >
          Ενεργοί ({count("active")})
        </Link>
        <Link
          href={filterHref("inactive")}
          scroll={false}
          aria-current={filter === "inactive" ? "page" : undefined}
        >
          Απενεργοποιημένοι ({count("inactive")})
        </Link>
      </nav>
      {shown.length === 0 ? (
        <p className="ml-empty">
          Κανένας απενεργοποιημένος Χρήστης. Όποιον απενεργοποιήσεις μένει εδώ,
          με τους Ρόλους του, για Επανενεργοποίηση.
        </p>
      ) : (
        <ul className="ml-list">
          {shown.map((u) => (
            <UserLine key={u.id} user={u} />
          ))}
        </ul>
      )}
    </ListSection>
  );
}
