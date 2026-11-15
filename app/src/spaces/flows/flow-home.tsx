"use client";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import type { JobDigests } from "./digests";
import { FLOWS, stepHref, totalOf, type Flow } from "./flows";
import { QueuePanel } from "./queue-panel";

import "./flows.css";

const areasOf = (flows: readonly Flow[]): readonly string[] => [
  ...new Set(flows.map((flow) => flow.area)),
];

function Doors() {
  return (
    <Panel label="Τι θέλεις να κάνεις;">
      {areasOf(FLOWS).map((area) => (
        <section key={area} className="flow-home-area">
          <h3 className="kit-label">{area}</h3>
          <RowList>
            {FLOWS.filter((flow) => flow.area === area).map((flow) => (
              <ListRow
                key={flow.id}
                title={flow.name}
                href={stepHref(flow, 1)}
                sub={`${totalOf(flow)} βήματα · ${[...new Set(flow.steps.map((step) => step.area))].join(" → ")}`}
              />
            ))}
          </RowList>
        </section>
      ))}
    </Panel>
  );
}

// Σήμερα (prototype οδηγών): πάνω η ουρά «Τι πρέπει να κάνω τώρα» (η δουλειά «Ξεκινώ τη μέρα μου»), κάτω οι πόρτες
// «Τι θέλεις να κάνεις;» ανά Χώρο. digests = null όσο διαβάζεται η ουρά.
export function FlowHome({ digests }: { digests: JobDigests | null }) {
  return (
    <div data-spaces className="flow-home">
      {digests ? (
        <QueuePanel digests={digests} />
      ) : (
        <Panel label="Τι πρέπει να κάνω τώρα">
          <p className="flow-home-empty">Φορτώνει η λίστα…</p>
        </Panel>
      )}
      <Doors />
    </div>
  );
}
