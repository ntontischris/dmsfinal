import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/modules/filming";

import { ageLabel, pendingLabel } from "../helpers";
import type { GoogleActivityEntry, GoogleView } from "../types";

const RECENT_LIMIT = 5;
export const DELETIONS_PATH = "/app/calendar/google-deletions";

// Η κάρτα Google στην Οθόνη Ημερολογίου (A5): μόνο όπου το Δικαίωμα το επιτρέπει.
export function GoogleSyncCard({ view, stale }: { view: GoogleView; stale: boolean }) {
  return (
    <Panel label="Google Calendar" aside={<Badge tone={stale ? "attention" : "ok"}>{stale ? "Καθυστερεί" : "Συγχρονισμένο"}</Badge>}>
      <div className="grid gap-3 text-sm">
        <p className="m-0">
          {stale ? `Εκκρεμούν ${pendingLabel(view.pendingWrites)} πάνω από μία ώρα` : `Τελευταίος συγχρονισμός ${ageLabel(view.lastSyncAt)}`}
        </p>
        {!stale && view.pendingWrites > 0 && <p className="m-0 text-muted-foreground">{pendingLabel(view.pendingWrites)}</p>}
        {view.pendingDeletions > 0 && (
          <Link className="w-fit underline" href={DELETIONS_PATH}>
            Διαγραφές από το Google ({view.pendingDeletions})
          </Link>
        )}
        <RecentActivity entries={view.activity} />
      </div>
    </Panel>
  );
}

function RecentActivity({ entries }: { entries: GoogleActivityEntry[] }) {
  if (entries.length === 0) return <p className="m-0 text-muted-foreground">Κανένα πρόσφατο από το Google.</p>;
  return (
    <div className="grid gap-1">
      <h3 className="m-0 text-sm font-semibold">Πρόσφατα από το Google</h3>
      <ul className="m-0 grid list-none gap-1 p-0">
        {entries.slice(0, RECENT_LIMIT).map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="text-muted-foreground">
            {formatDateTime(entry.at)} · {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
