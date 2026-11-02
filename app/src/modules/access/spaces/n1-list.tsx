import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import { matchesFilter, type N1User, type StatusFilter } from "./n1-adapter";

const lastSeenLabel = (user: N1User): string | null => {
  if (user.lastSeen === undefined) return null;
  return user.lastSeen ? fmtDate(user.lastSeen) : "ποτέ";
};

const tabHref = (filter: StatusFilter): string =>
  hrefOf("N1", { status: filter === "active" ? undefined : filter });

interface UserListProps {
  users: readonly N1User[];
  filter: StatusFilter;
}

// Οι Χρήστες ομάδας σε δύο καρτέλες (Ενεργοί / Απενεργοποιημένοι), όπως στο prototype `screens/n1-list.tsx`.
export function UserList({ users, filter }: UserListProps) {
  const shown = users.filter((u) => matchesFilter(u, filter));
  const count = (f: StatusFilter) =>
    users.filter((u) => matchesFilter(u, f)).length;
  return (
    <Panel
      label="Χρήστες ομάδας"
      aside={
        <a className="button" data-primary href="#n1-invite">
          Πρόσκληση Χρήστη
        </a>
      }
    >
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
      {shown.length === 0 ? (
        <p className="muted">
          Κανένας απενεργοποιημένος Χρήστης. Όποιον απενεργοποιήσεις μένει εδώ,
          με τους Ρόλους του, για Επανενεργοποίηση.
        </p>
      ) : (
        <RowList>
          {shown.map((u) => {
            const lastSeen = lastSeenLabel(u);
            return (
              <ListRow
                key={u.id}
                lead={<Avatar name={u.name} size={36} />}
                href={u.href}
                title={u.isSelf ? `${u.name} (εσύ)` : u.name}
                sub={
                  <span className="n1-email">
                    {u.email} · {u.roles}
                  </span>
                }
                isFaded={!u.isActive}
                aside={
                  <>
                    {lastSeen && (
                      <span className="part-sub">
                        Τελευταία είσοδος: {lastSeen}
                      </span>
                    )}
                    {u.isActive ? (
                      <Badge tone="strong">ενεργός</Badge>
                    ) : (
                      <Badge tone="attention">
                        απενεργοποιημένος
                        {u.deactivatedAt && ` ${fmtDate(u.deactivatedAt)}`}
                      </Badge>
                    )}
                  </>
                }
              />
            );
          })}
        </RowList>
      )}
    </Panel>
  );
}
