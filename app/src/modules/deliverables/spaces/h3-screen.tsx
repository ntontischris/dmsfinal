import Link from "next/link";
import type { ReactNode } from "react";

import { can, canSeeClientWork, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { listClientDeliverables } from "../client-queries";
import type { ClientDeliverableCard } from "../client-types";
import { H2Box } from "./h2-box";
import { groupsOf, waitingOf } from "./h3-adapter";
import { ClientStatusBadge, PeriodCard } from "./h3-group";

import "../../finance/spaces/money-lines.css";
import "./h34.css";

const wrap = (children: ReactNode) => <div data-spaces>{children}</div>;

function WaitingCard({
  waiting,
}: {
  waiting: readonly ClientDeliverableCard[];
}) {
  return (
    <H2Box title="Περιμένουν εσένα" hint={`${waiting.length} Παραδοτέα`} isOpen>
      {waiting.length === 0 ? (
        <p className="ml-empty">Τίποτα δεν περιμένει εσένα.</p>
      ) : (
        <ul className="ml-list">
          {waiting.map((d) => (
            <li key={d.id} className="ml-line" data-urgent="">
              <span className="ml-thumb" aria-hidden="true">
                {initialsOf(d.title)}
              </span>
              <span className="ml-main">
                <strong>
                  <Link href={hrefOf("H2", { id: d.id })}>{d.title}</Link>
                </strong>
                <small>{d.kind}</small>
              </span>
              <span className="ml-quick">
                <ClientStatusBadge state="περιμένει εσένα" />
                <Link data-primary="true" href={hrefOf("H2", { id: d.id })}>
                  Δες και ενέκρινε
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </H2Box>
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
      {/* Μόνο με «Βλέπει Συνομιλία»: χωρίς αυτό η Συνομιλία (J3) δεν ανοίγει. */}
      {can(viewer, "c.chatRead") && (
        <header className="h34-ask">
          <p className="note">
            Θέλεις κάτι καινούργιο;{" "}
            <Link href={hrefOf("J3")}>Ζήτα το από την ομάδα</Link>.
          </p>
        </header>
      )}
      {groups.length === 0 ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν ακόμα Παραδοτέα">
          <p>Θα εμφανιστούν εδώ μόλις η ομάδα σου στείλει το πρώτο.</p>
        </StateNotice>
      ) : (
        <div className="ml-stack">
          <WaitingCard waiting={waiting} />
          {groups.map((group, index) => (
            <PeriodCard key={group.key} group={group} isOpen={index === 0} />
          ))}
        </div>
      )}
    </div>,
  );
}
