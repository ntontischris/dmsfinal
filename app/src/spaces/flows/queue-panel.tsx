"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Panel } from "@/spaces/kit/panel";
import { RowList } from "@/spaces/kit/parts";

import { athensDay } from "./athens-time";
import { DaySummary } from "./day-summary";
import type { JobDigests } from "./digests";
import { LaterMenu } from "./later-menu";
import {
  mergedParked,
  parseParked,
  readParkedRaw,
  subscribeParked,
} from "./parked";
import { QueueFilters } from "./queue-filters";
import { Open, Row } from "./queue-row";
import {
  inArea,
  queueHeader,
  queueOf,
  type Queue,
  type QueueRow,
} from "./queue-rows";
import type { TodayRows } from "./today-load";
import { useLater, type Later } from "./use-later";
import {
  firstAfter,
  shownOf,
  withoutXekino,
  withResumed,
  xekinoPlaceOf,
} from "./xekino-rows";
import { addRoundKeys } from "./xekino-round";

interface RowsProps {
  rows: readonly QueueRow[];
  highlight: string | undefined;
  now: number;
  later: Later;
}

function Rows({ rows, highlight, now, later }: RowsProps) {
  return (
    <RowList>
      {rows.map((row) => (
        <Row
          key={row.key}
          row={row}
          isHighlighted={row.key === highlight}
          now={now}
          later={later}
        />
      ))}
    </RowList>
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

// Κάρτες που δεν φόρτωσαν: η λίστα μπορεί να μην τα έχει όλα — το λέει, με σύνδεσμο στην ουρά τους.
function Failed({ failed }: { failed: TodayRows["failed"] }) {
  if (failed.length === 0) return null;
  return (
    <p className="muted flow-queue-failed" role="status">
      Δεν φόρτωσαν:{" "}
      {failed.map((item, index) => (
        <span key={item.href}>
          {index > 0 && ", "}
          <Link href={item.href}>{item.title}</Link>
        </span>
      ))}
      . Ξαναδοκίμασε σε λίγο.
    </p>
  );
}

// Η λίστα με τις μισές δουλειές του λογαριασμού· η γραμμή που είχε ανοίξει το «Ξεκινώ» πρώτη με «Συνέχισε».
function useQueue(digests: JobDigests, today: TodayRows | null, now: number) {
  const local = parseParked(
    useSyncExternalStore(subscribeParked, readParkedRaw, () => "[]"),
  );
  const merged = mergedParked(today?.places ?? null, local, digests.at);
  const later = useLater(today?.snoozed ?? null, now);
  const queue = queueOf({
    digests: digests.jobs,
    parked: withoutXekino(merged),
    cards: today?.cards ?? [],
    later: later.later,
    now,
  });
  const resumed = xekinoPlaceOf(merged)?.item;
  const resumedQueue: Queue = {
    ...queue,
    fromYesterday: withResumed(queue.fromYesterday, resumed),
    today: withResumed(queue.today, resumed),
  };
  return { queue: resumedQueue, later, resumed };
}

// Ο γύρος της μέρας μαθαίνει κάθε γραμμή που φάνηκε (για το «Γραμμή n από N» του βήματος 2).
function useRound(rows: readonly QueueRow[]) {
  const keys = rows.map((row) => row.key).join("\n");
  useEffect(() => {
    if (keys) addRoundKeys(keys.split("\n"), athensDay(Date.now()));
  }, [keys]);
}

const filteredOf = (queue: Queue, area: string | null) => ({
  today: inArea(queue.today, area),
  fromYesterday: inArea(queue.fromYesterday, area),
});

interface QueuePanelProps {
  digests: JobDigests;
  today: TodayRows | null;
}

// Βήμα 1 «Ποιο είναι το επόμενο;»: 5 γραμμές, «Έμειναν από χθες» πάνω· οι υπόλοιπες και τα φίλτρα στο
// «Περισσότερα». Άδεια ή όλα «Αργότερα» → βήμα 3.
export function QueuePanel({ digests, today }: QueuePanelProps) {
  const now = useNow(digests.at);
  const after = useSearchParams().get("after");
  const [area, setArea] = useState<string | null>(null);
  const { queue, later, resumed } = useQueue(digests, today, now);
  const all = [...queue.fromYesterday, ...queue.today];
  useRound(all);
  if (all.length === 0)
    return (
      <DaySummary
        queue={queue}
        today={athensDay(now)}
        closed={today?.closed ?? null}
        unread={today?.unread ?? null}
        later={later}
      />
    );
  // Ένας Χώρος που άδειασε στο μεταξύ δεν κρατά τη λίστα κρυφή.
  const liveArea = area !== null && inArea(all, area).length > 0 ? area : null;
  const shown = shownOf(filteredOf(queue, liveArea));
  const visible = [...shown.fromYesterday, ...shown.today];
  const first =
    visible.find((row) => row.key === resumed) ?? firstAfter(visible, after);
  const rowsOf = (rows: readonly QueueRow[], highlight?: string) => (
    <Rows rows={rows} highlight={highlight} now={now} later={later} />
  );
  return (
    <Panel label={queueHeader(queue)}>
      <Failed failed={today?.failed ?? []} />
      {later.error && (
        <p className="muted" role="alert">
          {later.error}
        </p>
      )}
      {first && (
        <div className="btn-row">
          <Open row={first} later={later} className="button" isPrimary>
            Άνοιγμα
          </Open>
        </div>
      )}
      {shown.fromYesterday.length > 0 && (
        <section className="flow-home-area">
          <div className="btn-row flow-queue-head">
            <h3 className="kit-label">Έμειναν από χθες</h3>
            <LaterMenu
              keys={queue.fromYesterday.map((row) => row.key)}
              label="Μετάθεση όλων ▾"
              now={now}
              postpone={later.postpone}
            />
          </div>
          {rowsOf(shown.fromYesterday, first?.key)}
        </section>
      )}
      {shown.today.length > 0 && (
        <section className="flow-home-area">
          {rowsOf(shown.today, first?.key)}
        </section>
      )}
      {(shown.rest.length > 0 || liveArea !== null) && (
        <details className="flow-guide-more">
          <summary>Περισσότερα ({shown.rest.length})</summary>
          <QueueFilters rows={all} area={liveArea} onPick={setArea} />
          {rowsOf(shown.rest)}
        </details>
      )}
    </Panel>
  );
}
