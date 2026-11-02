import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import type { ClientDeliverableCard } from "../client-types";
import { CLIENT_WORDS } from "./h3-adapter";
import { ClientStatusBadge } from "./h3-group";
import { clientRowSubOf, visibleForClient } from "./g2-client-model";

// Τα Παραδοτέα της Σελίδας Παραγωγής στην όψη πελάτη (prototype `screens/g2-sections.tsx` G2ClientDeliverables),
// από την όψη πελάτη της βάσης (ίδια ανάγνωση με την παλιά G2 πελάτη). Η σελίδα του Παραδοτέου για τον πελάτη είναι η H4.
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
        <Panel label="Περιμένουν εσένα" isFlush>
          <RowList>
            {awaiting.map((d) => (
              <ListRow
                key={d.id}
                title={d.title}
                href={hrefOf("H2", { id: d.id })}
                isHighlighted
              />
            ))}
          </RowList>
        </Panel>
      )}
      <Panel label="Παραδοτέα" aside={visible.length} isFlush>
        {visible.length === 0 && (
          <p className="muted g2-pad">Δεν υπάρχουν ακόμα Παραδοτέα.</p>
        )}
        <RowList>
          {visible.map((d) => (
            <ListRow
              key={d.id}
              title={d.title}
              href={hrefOf("H2", { id: d.id })}
              sub={clientRowSubOf(d)}
              aside={<ClientStatusBadge state={CLIENT_WORDS[d.state]} />}
            />
          ))}
        </RowList>
      </Panel>
    </>
  );
}
