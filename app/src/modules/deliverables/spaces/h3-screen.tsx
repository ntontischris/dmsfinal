import Link from "next/link";
import type { ReactNode } from "react";

import { canSeeClientWork, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { listClientDeliverables } from "../client-queries";
import type { ClientDeliverableCard } from "../client-types";
import { groupsOf, waitingOf } from "./h3-adapter";
import { ClientStatusBadge, PeriodCard } from "./h3-group";

import "./h34.css";

const wrap = (children: ReactNode) => <div data-spaces>{children}</div>;

function WaitingCard({
  waiting,
}: {
  waiting: readonly ClientDeliverableCard[];
}) {
  return (
    <Panel
      label="Περιμένουν εσένα"
      aside={<span className="muted">{waiting.length}</span>}
    >
      {waiting.length === 0 ? (
        <p className="muted">Τίποτα δεν περιμένει εσένα.</p>
      ) : (
        <RowList>
          {waiting.map((d) => (
            <ListRow
              key={d.id}
              isHighlighted
              lead={
                <span className="part-tile" aria-hidden="true">
                  {initialsOf(d.title)}
                </span>
              }
              href={hrefOf("H2", { id: d.id })}
              title={d.title}
              sub={d.kind}
              aside={
                <>
                  <ClientStatusBadge state="περιμένει εσένα" />
                  <Link
                    className="button"
                    data-primary="true"
                    href={hrefOf("H2", { id: d.id })}
                  >
                    Δες και ενέκρινε
                  </Link>
                </>
              }
            />
          ))}
        </RowList>
      )}
    </Panel>
  );
}

// H3 Παραδοτέα, όψη πελάτη, στη νέα εμφάνιση (prototype `screens/H3.tsx`): μία ανάγνωση (client_deliverables_view).
// Ο τίτλος είναι του Χώρου (καρτέλα): τον γράφει η κεφαλίδα του κελύφους.
export async function SpacesClientDeliverables({ viewer }: { viewer: Viewer }) {
  if (!canSeeClientWork(viewer))
    return wrap(
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>
          Τα Παραδοτέα των Παραγωγών σου τα βλέπει όποιος έχει πρόσβαση στις
          Παραγωγές.
        </p>
      </StateNotice>,
    );
  const result = await listClientDeliverables();
  if (!result.ok) return wrap(<ErrorNotice what="τα Παραδοτέα" />);

  const groups = groupsOf(result.data);
  const waiting = waitingOf(result.data);
  return wrap(
    <div className="h34">
      <header className="h34-header">
        <p className="note">
          Θέλεις κάτι καινούργιο;{" "}
          <Link href={hrefOf("J3")}>Ζήτα το από την ομάδα</Link>.
        </p>
      </header>
      {groups.length === 0 ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν ακόμα Παραδοτέα">
          <p>Θα εμφανιστούν εδώ μόλις η ομάδα σου στείλει το πρώτο.</p>
        </StateNotice>
      ) : (
        <>
          <WaitingCard waiting={waiting} />
          {groups.map((group) => (
            <PeriodCard key={group.key} group={group} />
          ))}
        </>
      )}
    </div>,
  );
}
