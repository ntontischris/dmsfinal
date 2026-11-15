"use client";

import { useSyncExternalStore } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { untilText } from "./athens-time";
import { finishDay, readDayDoneRaw } from "./later";
import { subscribeParked } from "./parked";
import { daySentence, type Queue } from "./queue-rows";
import type { ClosedItem } from "./today-closed";
import type { Later } from "./use-later";

interface PostponedProps {
  queue: Queue;
  restore: Later["restore"];
}

function Postponed({ queue, restore }: PostponedProps) {
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

interface DaySummaryProps {
  queue: Queue;
  today: string;
  // Ό,τι έκλεισα σήμερα στη βάση (Ίχνος)· null = δεν επιτρέπεται να διαβαστεί.
  closed: readonly ClosedItem[] | null;
  later: Later;
}

// Βήμα 3 «Τελείωσε η μέρα;»: μόνο όταν η λίστα άδειασε ή όλα έχουν «Αργότερα».
export function DaySummary({ queue, today, closed, later }: DaySummaryProps) {
  const dayDone = useSyncExternalStore(
    subscribeParked,
    readDayDoneRaw,
    () => "",
  );
  const sentence = daySentence(closed?.length ?? null, queue.postponed.length);
  // Άδεια λίστα χωρίς τίποτα κλεισμένο: η μέρα ξεκίνησε άδεια.
  const label =
    closed?.length === 0 && queue.postponed.length === 0
      ? "Τίποτα για σήμερα"
      : "Τι πρέπει να κάνω τώρα — Τελείωσε η μέρα;";
  return (
    <Panel label={label}>
      <p className="flow-guide-done" role="status">
        {sentence}
      </p>
      {dayDone !== today && (
        <>
          {closed && closed.length > 0 && (
            <section className="flow-home-area">
              <h3 className="kit-label">Τι έκλεισα σήμερα</h3>
              <RowList>
                {closed.map((item) => (
                  <ListRow
                    key={item.key}
                    title={item.title}
                    aside={untilText(item.at)}
                  />
                ))}
              </RowList>
            </section>
          )}
          {later.error && (
            <p className="muted" role="alert">
              {later.error}
            </p>
          )}
          <Postponed queue={queue} restore={later.restore} />
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
