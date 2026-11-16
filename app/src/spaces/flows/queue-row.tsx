"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { LaterMenu } from "./later-menu";
import { clearRun } from "./loop-run";
import { enterParked } from "./parked";
import type { QueueRow } from "./queue-rows";
import { openNoticeRow } from "./today-actions";
import type { Later } from "./use-later";
import { isGuideRow, openHrefOf } from "./xekino-rows";

// Άνοιγμα γραμμής: η μισή δουλειά παίρνει τη θέση της· ένας οδηγός που ανοίγει από την αρχή ξεκινά νέο γύρο·
// ένα «Αργότερα» που έληξε σβήνει (το «Νέο ·» φεύγει).
const openRow = (row: QueueRow, later: Later) => {
  if (row.parked) enterParked(row.parked);
  else if (isGuideRow(row)) clearRun(row.key);
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
export function Open({
  row,
  later,
  className,
  isPrimary,
  children,
}: OpenProps) {
  const primary = isPrimary ? "true" : undefined;
  const href = openHrefOf(row);
  if (!row.noticeIds)
    return (
      <Link
        className={className}
        data-primary={primary}
        href={href}
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
      <input type="hidden" name="href" value={href} />
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
export function Row({ row, isHighlighted, now, later }: RowProps) {
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
