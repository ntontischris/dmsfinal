"use client";

import { useSyncExternalStore } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { athensAt, untilText } from "./athens-time";
import { flowOf } from "./flows";
import {
  closedSince,
  finishDay,
  parseClosed,
  readClosedRaw,
  readDayDoneRaw,
  restore,
} from "./later";
import { subscribeParked } from "./parked";
import { daySentence, type Queue } from "./queue-rows";

function Postponed({ queue }: { queue: Queue }) {
  if (queue.postponed.length === 0) return null;
  return (
    <section className="flow-home-area">
      <div className="btn-row flow-queue-head">
        <h3 className="kit-label">
          Αφημένα για αργότερα ({queue.postponed.length})
        </h3>
        <button
          type="button"
          className="button"
          data-ghost="true"
          onClick={() => restore(queue.postponed.map(({ row }) => row.key))}
        >
          Αναίρεση όλων
        </button>
      </div>
      <RowList>
        {queue.postponed.map(({ row, until }) => (
          <li key={row.key} className="part-row">
            <span className="part-row-main">
              <span className="part-title">{row.title}</span>
              <span className="part-sub">Ξαναβγαίνει {untilText(until)}</span>
            </span>
            <button
              type="button"
              className="button"
              data-ghost="true"
              onClick={() => restore([row.key])}
            >
              Αναίρεση
            </button>
          </li>
        ))}
      </RowList>
    </section>
  );
}

// Βήμα 3 «Τελείωσε η μέρα;»: μόνο όταν η λίστα άδειασε ή όλα έχουν «Αργότερα».
export function DaySummary({ queue, today }: { queue: Queue; today: string }) {
  const closedRaw = useSyncExternalStore(
    subscribeParked,
    readClosedRaw,
    () => "[]",
  );
  const dayDone = useSyncExternalStore(
    subscribeParked,
    readDayDoneRaw,
    () => "",
  );
  const closed = closedSince(parseClosed(closedRaw), athensAt(today, 0));
  const sentence = daySentence(closed.length, queue.postponed.length);
  return (
    <Panel label="Τι πρέπει να κάνω τώρα — Τελείωσε η μέρα;">
      <p className="flow-guide-done" role="status">
        {sentence}
      </p>
      {dayDone !== today && (
        <>
          {closed.length > 0 && (
            <section className="flow-home-area">
              <h3 className="kit-label">Τι έκλεισα σήμερα</h3>
              <RowList>
                {closed.map((item) => (
                  <ListRow
                    key={`${item.job}-${item.at}`}
                    title={flowOf(item.job)?.name ?? item.job}
                    aside={untilText(item.at)}
                  />
                ))}
              </RowList>
            </section>
          )}
          <Postponed queue={queue} />
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              onClick={() => finishDay(today)}
            >
              Τέλος
            </button>
          </div>
        </>
      )}
    </Panel>
  );
}
