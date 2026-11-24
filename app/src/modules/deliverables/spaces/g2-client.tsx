import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";

import type { ClientDeliverableCard } from "../client-types";
import { clientRowSubOf, visibleForClient } from "./g2-client-model";
import { H2Box } from "./h2-box";
import { CLIENT_WORDS } from "./h3-adapter";
import { ClientStatusBadge } from "./h3-group";

// Τα Παραδοτέα της Σελίδας Παραγωγής στην όψη πελάτη, ως κουτιά με γραμμές-κάρτες (.ml-list),
// από την όψη πελάτη της βάσης. Η σελίδα του Παραδοτέου για τον πελάτη είναι η H4.
export function G2ClientDeliverables({
  awaiting,
  deliverables,
}: {
  awaiting: readonly ClientDeliverableCard[];
  deliverables: readonly ClientDeliverableCard[];
}) {
  const visible = visibleForClient(deliverables);
  return (
    <>
      {awaiting.length > 0 && (
        <H2Box
          title="Περιμένουν εσένα"
          hint={`${awaiting.length} Παραδοτέα`}
          isOpen
        >
          <ul className="ml-list">
            {awaiting.map((d) => (
              <li key={d.id} className="ml-line" data-urgent="">
                <span className="ml-thumb" aria-hidden="true">
                  {initialsOf(d.title)}
                </span>
                <span className="ml-main">
                  <strong>
                    <Link href={hrefOf("H2", { id: d.id })}>{d.title}</Link>
                  </strong>
                </span>
              </li>
            ))}
          </ul>
        </H2Box>
      )}
      <H2Box title="Παραδοτέα" hint={`${visible.length} Παραδοτέα`}>
        {visible.length === 0 && (
          <p className="ml-empty">Δεν υπάρχουν ακόμα Παραδοτέα.</p>
        )}
        <ul className="ml-list">
          {visible.map((d) => (
            <li key={d.id} className="ml-line">
              <span className="ml-thumb" aria-hidden="true">
                {initialsOf(d.title)}
              </span>
              <span className="ml-main">
                <strong>
                  <Link href={hrefOf("H2", { id: d.id })}>{d.title}</Link>
                </strong>
                <small>{clientRowSubOf(d)}</small>
              </span>
              <span className="ml-quick">
                <ClientStatusBadge state={CLIENT_WORDS[d.state]} />
              </span>
            </li>
          ))}
        </ul>
      </H2Box>
    </>
  );
}
