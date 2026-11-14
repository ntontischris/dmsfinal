"use client";

import { useSyncExternalStore } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { FLOWS, flowOf, stepHref, type Flow } from "./flows";
import {
  parseParked,
  readParkedRaw,
  subscribeParked,
  type Parked,
} from "./parked";

import "./flows.css";

const areasOf = (flows: readonly Flow[]): readonly string[] => [
  ...new Set(flows.map((flow) => flow.area)),
];

function QueueRow({ row }: { row: Parked }) {
  const flow = flowOf(row.job);
  const step = flow?.steps[row.step - 1];
  if (!flow || !step) return null;
  const title =
    row.reason === "wait"
      ? `${flow.name} — περιμένουμε την ομάδα· μετά: ${step.question}`
      : `${flow.name} — συνέχισε`;
  return (
    <ListRow
      title={title}
      href={stepHref(flow, row.step, { date: row.date })}
      sub={`Βήμα ${row.step} από ${flow.steps.length}: ${step.question}`}
      aside={step.area}
    />
  );
}

// Σήμερα (prototype οδηγών): πάνω η ουρά «Τι πρέπει να κάνω τώρα», κάτω οι πόρτες «Τι θέλεις να κάνεις;» ανά Χώρο.
export function FlowHome() {
  const raw = useSyncExternalStore(subscribeParked, readParkedRaw, () => "[]");
  const rows = parseParked(raw);
  return (
    <div data-spaces className="flow-home">
      <Panel
        label="Τι πρέπει να κάνω τώρα"
        aside={rows.length > 0 ? String(rows.length) : undefined}
      >
        {rows.length > 0 ? (
          <RowList>
            {rows.map((row) => (
              <QueueRow key={row.job} row={row} />
            ))}
          </RowList>
        ) : (
          <p className="flow-home-empty">Τίποτα μισό αυτή τη στιγμή.</p>
        )}
      </Panel>
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
                  sub={`${flow.steps.length} βήματα · ${[...new Set(flow.steps.map((step) => step.area))].join(" → ")}`}
                />
              ))}
            </RowList>
          </section>
        ))}
      </Panel>
    </div>
  );
}
