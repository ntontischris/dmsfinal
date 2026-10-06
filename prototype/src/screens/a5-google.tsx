import Link from "next/link";

import {
  COMPANY_CALENDAR,
  GOOGLE_CHANGES,
  GOOGLE_DELETIONS,
  memberName,
  type GoogleChange,
} from "@/data/calendar";
import type { RoleId } from "@/data/roles";
import { a5Href, fmtStamp, type A5Params } from "@/screens/a5-dates";
import { Badge, screenHref } from "@/screens/shared";

interface A5GoogleProps {
  role: RoleId;
  params: A5Params;
}

const changeHref = (role: RoleId, change: GoogleChange): string | undefined => {
  if (change.filmingId) {
    return screenHref(role, "E3", { id: change.filmingId });
  }
  if (change.blockedId) {
    return screenHref(role, "A6", { id: change.blockedId });
  }
  return undefined;
};

function Outage() {
  const { outage } = COMPANY_CALENDAR;
  return (
    <>
      <p>
        <Badge tone="attention">
          Εκτός σύνδεσης από {outage.since.slice(11, 16)}
        </Badge>
      </p>
      <h3>Εκκρεμούν {outage.pendingWrites.length} αλλαγές</h3>
      <ul className="list">
        {outage.pendingWrites.map((write) => (
          <li key={write}>{write}</li>
        ))}
      </ul>
      <p className="note">
        Το DMS δουλεύει κανονικά. Οι αλλαγές γράφονται στο Google μόνες τους, με
        τη σειρά που έγιναν, μόλις επανέλθει. Αν το Google άλλαξε στο μεταξύ το
        ίδιο γεγονός, κρατιέται η αλλαγή του DMS και ειδοποιείται όποιος το
        άλλαξε. Μετά από {outage.alertAfterHours} ώρα η Υγεία συστήματος
        κοκκινίζει και ο admin παίρνει Ειδοποίηση.
      </p>
    </>
  );
}

function Synced({ role }: { role: RoleId }) {
  const waiting = GOOGLE_DELETIONS.filter(
    (deletion) => deletion.status === "αναμένει",
  ).length;
  return (
    <>
      <p>
        <Badge tone="strong">Συγχρονισμένο</Badge>{" "}
        <span className="muted">
          · τελευταίος συγχρονισμός {fmtStamp(COMPANY_CALENDAR.lastSync)}
        </span>
      </p>
      <p>
        Διαγραφές που περιμένουν επιβεβαίωση: <strong>{waiting}</strong>{" "}
        {waiting > 0 && <Link href={screenHref(role, "A7", {})}>Δες τες</Link>}
      </p>
    </>
  );
}

function Changes({ role }: { role: RoleId }) {
  return (
    <>
      <h3>Πρόσφατα από το Google</h3>
      <ul className="list">
        {GOOGLE_CHANGES.map((change) => {
          const href = changeHref(role, change);
          return (
            <li key={change.id}>
              <div className="row">
                <span className="muted">
                  {fmtStamp(change.when)} · {memberName(change.by)}
                </span>
                <Badge
                  tone={
                    change.kind === "μετακίνηση απορρίφθηκε"
                      ? "attention"
                      : undefined
                  }
                >
                  {change.kind}
                </Badge>
              </div>
              <p>{change.text}</p>
              {href && <Link href={href}>Άνοιγμα</Link>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function A5Google({ role, params }: A5GoogleProps) {
  const isDown = params.google === "down";
  return (
    <section className="card a5-google">
      <div className="card-title">
        <h2>Εταιρικό ημερολόγιο Google</h2>
        <span className="muted">{COMPANY_CALENDAR.name}</span>
      </div>
      {isDown ? <Outage /> : <Synced role={role} />}
      <Changes role={role} />
      <p className="note">
        Ό,τι αλλάζει στο Google περνά από τους κανόνες του DMS: νέο γεγονός
        γίνεται Κλεισμένος χρόνος, ποτέ Γύρισμα.
      </p>
      <p className="muted">
        <Link
          href={a5Href(role, params, {
            google: isDown ? undefined : "down",
          })}
        >
          {isDown
            ? "πίσω στην κανονική λειτουργία"
            : "παράδειγμα: Google εκτός"}
        </Link>
      </p>
    </section>
  );
}
