"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { FLOWS, flowOf, stepHref, type Flow } from "./flows";
import {
  enterParked,
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
  // Όλη η γραμμή ανοίγει το βήμα· η θέση γράφεται στην καρτέλα πριν την πλοήγηση. Η γραμμή μένει στην ουρά
  // μέχρι το «Τέλος» της δουλειάς (όχι με το πάτημα).
  return (
    <li className="part-row">
      <Link
        className="part-row-main flow-queue-link"
        href={stepHref(flow, row.step, { date: row.date })}
        onClick={() => enterParked(row)}
      >
        <span className="part-title">{title}</span>
        <span className="part-sub">
          Βήμα {row.step} από {flow.steps.length}: {step.question}
        </span>
      </Link>
      <span className="part-row-aside">{step.area}</span>
    </li>
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
