import Link from "next/link";

import { formatDateTime } from "@/modules/filming";
import type { GoogleView } from "@/modules/google";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

const RECENT_LIMIT = 5;
const DELETIONS_HREF = "/app/calendar/google-deletions";

const pendingText = (count: number): string =>
  count === 1 ? "1 αλλαγή" : `${count} αλλαγές`;

// «τελευταίος συγχρονισμός»: λεπτά/ώρες πριν, αλλιώς ημερομηνία και ώρα.
const ageOf = (iso: string | null, now: Date): string => {
  if (!iso) return "ποτέ";
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "μόλις τώρα";
  if (minutes < 60) return `πριν ${minutes} λεπτά`;
  if (minutes < 24 * 60) return `πριν ${Math.floor(minutes / 60)} ώρες`;
  return formatDateTime(iso);
};

function Outage({ view }: { view: GoogleView }) {
  return (
    <>
      <p>
        <Badge tone="attention">Καθυστερεί</Badge>
      </p>
      <h3>Εκκρεμούν {pendingText(view.pendingWrites)} πάνω από μία ώρα</h3>
      <p className="note">
        Το DMS δουλεύει κανονικά. Οι αλλαγές γράφονται στο Google μόνες τους, με
        τη σειρά που έγιναν, μόλις επανέλθει.
      </p>
    </>
  );
}

function Synced({ view }: { view: GoogleView }) {
  return (
    <>
      <p>
        <Badge tone="strong">Συγχρονισμένο</Badge>{" "}
        <span className="muted">
          · τελευταίος συγχρονισμός {ageOf(view.lastSyncAt, new Date())}
        </span>
      </p>
      {view.pendingWrites > 0 && (
        <p className="muted">Εκκρεμούν {pendingText(view.pendingWrites)}.</p>
      )}
    </>
  );
}

function Changes({ view }: { view: GoogleView }) {
  if (view.activity.length === 0)
    return <p className="muted">Κανένα πρόσφατο από το Google.</p>;
  return (
    <>
      <h3>Πρόσφατα από το Google</h3>
      <RowList>
        {view.activity.slice(0, RECENT_LIMIT).map((entry, index) => (
          <ListRow
            key={`${entry.at}-${index}`}
            title={<span className="a5-plain">{entry.message}</span>}
            sub={formatDateTime(entry.at)}
            aside={
              entry.filmingId && (
                <Link href={hrefOf("E3", { id: entry.filmingId })}>
                  Άνοιγμα
                </Link>
              )
            }
          />
        ))}
      </RowList>
    </>
  );
}

// Η κάρτα Google του prototype (`screens/a5-google.tsx`) με την πραγματική κατάσταση του συγχρονισμού (google_view).
export function A5Google({
  view,
  isStale,
}: {
  view: GoogleView;
  isStale: boolean;
}) {
  return (
    <Panel label="Εταιρικό ημερολόγιο Google">
      {isStale ? <Outage view={view} /> : <Synced view={view} />}
      <p>
        Διαγραφές που περιμένουν επιβεβαίωση:{" "}
        <strong>{view.pendingDeletions}</strong>{" "}
        {view.pendingDeletions > 0 && (
          <Link href={DELETIONS_HREF}>Δες τες</Link>
        )}
      </p>
      <Changes view={view} />
      {view.rules.newEvent === "blocked" && (
        <p className="note">
          Ό,τι αλλάζει στο Google περνά από τους κανόνες του DMS: νέο γεγονός
          γίνεται μη διαθεσιμότητα (ρεπό/άδεια), ποτέ Γύρισμα.
        </p>
      )}
    </Panel>
  );
}
