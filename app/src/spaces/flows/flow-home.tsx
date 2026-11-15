"use client";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import type { JobDigests } from "./digests";
import { FLOWS, stepHref, type Flow } from "./flows";
import { QueuePanel } from "./queue-panel";
import { waitingOf } from "./queue-rows";
import type { TodayRows } from "./today-load";

import "./flows.css";

const areasOf = (flows: readonly Flow[]): readonly string[] => [
  ...new Set(flows.map((flow) => flow.area)),
];

// Η πόρτα λέει πόσα περιμένουν πραγματικά (όχι πόσα βήματα έχει ο οδηγός).
const doorSub = (flow: Flow, digests: JobDigests | null): string => {
  const areas = [...new Set(flow.steps.map((step) => step.area))].join(" → ");
  const waiting = digests ? waitingOf(digests.jobs, flow.id) : 0;
  return waiting > 0 ? `${waiting} περιμένουν · ${areas}` : areas;
};

function Doors({ digests }: { digests: JobDigests | null }) {
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
                sub={doorSub(flow, digests)}
              />
            ))}
          </RowList>
        </section>
      ))}
    </Panel>
  );
}

// Σήμερα (prototype οδηγών): πάνω η ουρά «Τι πρέπει να κάνω τώρα» (η δουλειά «Ξεκινώ τη μέρα μου»), κάτω οι πόρτες
// «Τι θέλεις να κάνεις;» ανά Χώρο. digests = null όσο διαβάζεται η ουρά· today = οι κάρτες της Σήμερα ως γραμμές.
export function FlowHome({
  digests,
  today = null,
}: {
  digests: JobDigests | null;
  today?: TodayRows | null;
}) {
  return (
    <div data-spaces className="flow-home">
      {digests ? (
        <QueuePanel digests={digests} today={today} />
      ) : (
        <Panel label="Τι πρέπει να κάνω τώρα">
          <p className="flow-home-empty">Φορτώνει η λίστα…</p>
        </Panel>
      )}
      <Doors digests={digests} />
    </div>
  );
}
