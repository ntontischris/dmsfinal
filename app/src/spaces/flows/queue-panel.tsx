"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Panel } from "@/spaces/kit/panel";
import { RowList } from "@/spaces/kit/parts";

import { athensDay, laterOptions } from "./athens-time";
import { DaySummary } from "./day-summary";
import type { JobDigests } from "./digests";
import { parseLater, postpone, readLaterRaw } from "./later";
import {
  enterParked,
  parseParked,
  readParkedRaw,
  subscribeParked,
} from "./parked";
import { queueHeader, queueOf, type QueueRow } from "./queue-rows";

const SHOWN = 5;

interface LaterMenuProps {
  keys: readonly string[];
  label: string;
  now: number;
}

// «Αργότερα ▾» / «Μετάθεση όλων ▾»: οι έτοιμες ώρες· η γραμμή φεύγει ως τότε.
function LaterMenu({ keys, label, now }: LaterMenuProps) {
  return (
    <details className="flow-later">
      <summary className="button" data-ghost="true">
        {label}
      </summary>
      <div className="btn-row flow-later-options">
        {laterOptions(now).map((option) => (
          <button
            key={option.label}
            type="button"
            className="button"
            data-ghost="true"
            onClick={() => postpone(keys, option.until)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </details>
  );
}

const openRow = (row: QueueRow) => {
  if (row.parked) enterParked(row.parked);
};

interface RowProps {
  row: QueueRow;
  isHighlighted: boolean;
  now: number;
}

// Όλη η γραμμή ανοίγει τη δουλειά (η ετικέτα Χώρου μέσω ::after)· το «Αργότερα» μένει πάνω της.
function Row({ row, isHighlighted, now }: RowProps) {
  return (
    <li
      className="part-row"
      data-highlight={isHighlighted ? "true" : undefined}
    >
      <Link
        className="part-row-main flow-queue-link"
        href={row.href}
        onClick={() => openRow(row)}
      >
        <span className="part-title">{row.title}</span>
        <span className="part-sub">{row.sub}</span>
      </Link>
      <span className="part-row-aside">{row.area}</span>
      <LaterMenu keys={[row.key]} label="Αργότερα ▾" now={now} />
    </li>
  );
}

interface RowsProps {
  rows: readonly QueueRow[];
  highlightFirst: boolean;
  now: number;
}

// Οι 5 πρώτες γραμμές, οι υπόλοιπες πίσω από το «Περισσότερα (N)».
function Rows({ rows, highlightFirst, now }: RowsProps) {
  const rest = rows.slice(SHOWN);
  return (
    <>
      <RowList>
        {rows.slice(0, SHOWN).map((row, index) => (
          <Row
            key={row.key}
            row={row}
            isHighlighted={highlightFirst && index === 0}
            now={now}
          />
        ))}
      </RowList>
      {rest.length > 0 && (
        <details className="flow-guide-more">
          <summary>Περισσότερα ({rest.length})</summary>
          <RowList>
            {rest.map((row) => (
              <Row key={row.key} row={row} isHighlighted={false} now={now} />
            ))}
          </RowList>
        </details>
      )}
    </>
  );
}

// Το ρολόι της σελίδας: ξεκινά από την ώρα της ανάγνωσης (ίδια σε server και browser) και τρέχει ανά λεπτό.
function useNow(start: number): number {
  const [now, setNow] = useState(start);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

// Βήμα 1 «Ποιο είναι το επόμενο;»: μία λίστα, «Έμειναν από χθες» πάνω· άδεια ή όλα «Αργότερα» → βήμα 3.
export function QueuePanel({ digests }: { digests: JobDigests }) {
  const now = useNow(digests.at);
  const parked = parseParked(
    useSyncExternalStore(subscribeParked, readParkedRaw, () => "[]"),
  );
  const later = parseLater(
    useSyncExternalStore(subscribeParked, readLaterRaw, () => "{}"),
  );
  const queue = queueOf({ digests: digests.jobs, parked, later, now });
  const first = queue.fromYesterday[0] ?? queue.today[0];
  if (!first) return <DaySummary queue={queue} today={athensDay(now)} />;
  return (
    <Panel label={queueHeader(queue)}>
      <div className="btn-row">
        <Link
          className="button"
          data-primary="true"
          href={first.href}
          onClick={() => openRow(first)}
        >
          Άνοιγμα
        </Link>
      </div>
      {queue.fromYesterday.length > 0 && (
        <section className="flow-home-area">
          <div className="btn-row flow-queue-head">
            <h3 className="kit-label">Έμειναν από χθες</h3>
            <LaterMenu
              keys={queue.fromYesterday.map((row) => row.key)}
              label="Μετάθεση όλων ▾"
              now={now}
            />
          </div>
          <Rows rows={queue.fromYesterday} highlightFirst now={now} />
        </section>
      )}
      {queue.today.length > 0 && (
        <section className="flow-home-area">
          <Rows
            rows={queue.today}
            highlightFirst={queue.fromYesterday.length === 0}
            now={now}
          />
        </section>
      )}
    </Panel>
  );
}
