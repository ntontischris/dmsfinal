"use client";

import type { ReactNode } from "react";

import type { B2ActivityRow } from "./activity-rows";
import { Line, Lines, initialsOf } from "./b2-box";

// Οι Δραστηριότητες της Σελίδας Πελάτη ως γραμμές «Χρημάτων»: αρχικά όποιου τη γράφει, είδος ως ετικέτα, κείμενο,
// «πότε · είδος · ποιος» αχνά, και «Διόρθωση»/«Διαγραφή» δεξιά. Η φόρμα διόρθωσης ανοίγει κάτω από τη γραμμή.
export function ActivityLines({
  rows,
  editingId,
  renderEdit,
  renderActions,
}: {
  rows: readonly B2ActivityRow[];
  editingId: string | null;
  renderEdit: (row: B2ActivityRow) => ReactNode;
  renderActions: (row: B2ActivityRow) => ReactNode;
}) {
  return (
    <Lines label="Δραστηριότητες">
      {rows.map((activity) => (
        <Line
          key={activity.id}
          mark={initialsOf(activity.by)}
          tag={activity.kind}
          title={activity.text}
          sub={`${activity.when} · ${activity.kind} · ${activity.by}`}
          quick={activity.canChange ? renderActions(activity) : undefined}
          below={editingId === activity.id ? renderEdit(activity) : undefined}
        />
      ))}
    </Lines>
  );
}
