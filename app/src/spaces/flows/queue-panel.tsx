"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { Panel } from "@/spaces/kit/panel";
import { RowList } from "@/spaces/kit/parts";

import { athensDay, laterOptions } from "./athens-time";
import { DaySummary } from "./day-summary";
import type { JobDigests } from "./digests";
import {
  enterParked,
  parseParked,
  readParkedRaw,
  subscribeParked,
} from "./parked";
import {
  AREAS,
  inArea,
  queueHeader,
  queueOf,
  type Queue,
  type QueueRow,
} from "./queue-rows";
import { openNoticeRow } from "./today-actions";
import type { TodayRows } from "./today-load";
import { useLater, type Later } from "./use-later";

const SHOWN = 5;

interface LaterMenuProps {
  keys: readonly string[];
  label: string;
  now: number;
  postpone: Later["postpone"];
}

// «Αργότερα ▾» / «Μετάθεση όλων ▾»: οι έτοιμες ώρες· η γραμμή φεύγει ως τότε.
function LaterMenu({ keys, label, now, postpone }: LaterMenuProps) {
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

// Άνοιγμα γραμμής: η μισή δουλειά παίρνει τη θέση της· ένα «Αργότερα» που έληξε σβήνει (το «Νέο ·» φεύγει).
const openRow = (row: QueueRow, later: Later) => {
  if (row.parked) enterParked(row.parked);
  if (row.isNew) later.restore([row.key]);
};

interface OpenProps {
  row: QueueRow;
  later: Later;
  className: string;
  isPrimary?: boolean;
  children: ReactNode;
}

// Το άνοιγμα μιας γραμμής: σύνδεσμος· γραμμή Ειδοποίησης = φόρμα που τις σημειώνει διαβασμένες και πάει στο σχετικό.
function Open({ row, later, className, isPrimary, children }: OpenProps) {
  const primary = isPrimary ? "true" : undefined;
  if (!row.noticeIds)
    return (
      <Link
        className={className}
        data-primary={primary}
        href={row.href}
        onClick={() => openRow(row, later)}
      >
        {children}
      </Link>
    );
  return (
    <form action={openNoticeRow} className="flow-queue-notice">
      {row.noticeIds.map((id) => (
        <input key={id} type="hidden" name="id" value={id} />
      ))}
      <input type="hidden" name="href" value={row.href} />
      <button
        type="submit"
        className={className}
        data-primary={primary}
        onClick={() => openRow(row, later)}
      >
        {children}
      </button>
    </form>
  );
}

interface RowProps {
  row: QueueRow;
  isHighlighted: boolean;
  now: number;
  later: Later;
}

// Όλη η γραμμή ανοίγει τη δουλειά (η ετικέτα Χώρου μέσω ::after)· το «Αργότερα» μένει πάνω της.
function Row({ row, isHighlighted, now, later }: RowProps) {
  return (
    <li
      className="part-row"
      data-highlight={isHighlighted ? "true" : undefined}
    >
      <Open row={row} later={later} className="part-row-main flow-queue-link">
        <span className="part-title">{row.title}</span>
        <span className="part-sub">{row.sub}</span>
      </Open>
      <span className="part-row-aside">{row.area}</span>
      <LaterMenu
        keys={[row.key]}
        label="Αργότερα ▾"
        now={now}
        postpone={later.postpone}
      />
    </li>
  );
}

interface RowsProps {
  rows: readonly QueueRow[];
  highlightFirst: boolean;
  now: number;
  later: Later;
}

// Οι 5 πρώτες γραμμές, οι υπόλοιπες πίσω από το «Περισσότερα (N)».
function Rows({ rows, highlightFirst, now, later }: RowsProps) {
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
            later={later}
          />
        ))}
      </RowList>
      {rest.length > 0 && (
        <details className="flow-guide-more">
          <summary>Περισσότερα ({rest.length})</summary>
          <RowList>
            {rest.map((row) => (
              <Row
                key={row.key}
                row={row}
                isHighlighted={false}
                now={now}
                later={later}
              />
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

interface FiltersProps {
  queue: Queue;
  area: string | null;
  onPick: (area: string | null) => void;
}

// Μαλακές κάρτες-φίλτρα ανά Χώρο, με πόσα έχει ο καθένας· μόνο όσοι έχουν γραμμές.
function Filters({ queue, area, onPick }: FiltersProps) {
  const rows = [...queue.fromYesterday, ...queue.today];
  const areas = AREAS.map((name) => ({
    name,
    count: inArea(rows, name).length,
  })).filter((item) => item.count > 0);
  if (areas.length < 2) return null;
  return (
    <div className="btn-row flow-queue-filters" role="group" aria-label="Χώρος">
      {[{ name: null, count: rows.length }, ...areas].map((item) => (
        <button
          key={item.name ?? "all"}
          type="button"
          className="button"
          data-ghost={item.name === area ? undefined : "true"}
          aria-pressed={item.name === area}
          onClick={() => onPick(item.name)}
        >
          {item.name ?? "Όλα"} ({item.count})
        </button>
      ))}
    </div>
  );
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

const filteredOf = (queue: Queue, area: string | null): Queue => ({
  ...queue,
  today: inArea(queue.today, area),
  fromYesterday: inArea(queue.fromYesterday, area),
});

interface QueuePanelProps {
  digests: JobDigests;
  today: TodayRows | null;
}

// Βήμα 1 «Ποιο είναι το επόμενο;»: μία λίστα (οδηγοί και κάρτες), «Έμειναν από χθες» πάνω· άδεια ή όλα «Αργότερα» → βήμα 3.
export function QueuePanel({ digests, today }: QueuePanelProps) {
  const now = useNow(digests.at);
  const [area, setArea] = useState<string | null>(null);
  const parked = parseParked(
    useSyncExternalStore(subscribeParked, readParkedRaw, () => "[]"),
  );
  const later = useLater(today?.snoozed ?? null, now);
  const queue = queueOf({
    digests: digests.jobs,
    parked,
    cards: today?.cards ?? [],
    later: later.later,
    now,
  });
  // Ένας Χώρος που άδειασε στο μεταξύ δεν κρατά τη λίστα κρυφή.
  const isAreaLive =
    area !== null &&
    inArea([...queue.fromYesterday, ...queue.today], area).length > 0;
  const shown = filteredOf(queue, isAreaLive ? area : null);
  const first = shown.fromYesterday[0] ?? shown.today[0];
  if (!queue.fromYesterday[0] && !queue.today[0])
    return (
      <DaySummary
        queue={queue}
        today={athensDay(now)}
        closed={today?.closed ?? null}
        later={later}
      />
    );
  return (
    <Panel label={queueHeader(queue)}>
      <Failed failed={today?.failed ?? []} />
      {later.error && (
        <p className="muted" role="alert">
          {later.error}
        </p>
      )}
      <Filters queue={queue} area={isAreaLive ? area : null} onPick={setArea} />
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
              keys={shown.fromYesterday.map((row) => row.key)}
              label="Μετάθεση όλων ▾"
              now={now}
              postpone={later.postpone}
            />
          </div>
          <Rows
            rows={shown.fromYesterday}
            highlightFirst
            now={now}
            later={later}
          />
        </section>
      )}
      {shown.today.length > 0 && (
        <section className="flow-home-area">
          <Rows
            rows={shown.today}
            highlightFirst={shown.fromYesterday.length === 0}
            now={now}
            later={later}
          />
        </section>
      )}
    </Panel>
  );
}
