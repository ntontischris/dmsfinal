import Link from "next/link";

import { COST_SETTINGS } from "@/data/catalogue";
import type { TrailEntry } from "@/data/productions";
import type { RoleId } from "@/data/roles";
import type { Figures } from "@/screens/g3-model";
import {
  Badge,
  fmtDate,
  fmtMoney,
  fmtPercent,
  screenHref,
} from "@/screens/shared";

interface StatusProps {
  figures: Figures;
  isDelivered: boolean;
  isInternal: boolean;
}

export function G3Status({ figures, isDelivered, isInternal }: StatusProps) {
  if (figures.missing.length === 0)
    return (
      <p>
        <Badge tone="strong">με πραγματικές ώρες</Badge>
      </p>
    );
  return (
    <section className="card" role="status">
      <div className="card-title">
        <h2>Χωρίς πραγματικές ώρες</h2>
        <Badge tone="attention">{figures.missing.join(" · ")}</Badge>
      </div>
      <p className="muted">
        Δεν μετράει ως μηδενικό κόστος στα σύνολα: μένει «—» μέχρι να γραφτούν
        πλήρεις ώρες.
      </p>
      {isDelivered && !isInternal && (
        <p className="note">
          Η Παραγωγή παραδόθηκε χωρίς πραγματικές ώρες: γεννιέται το Γεγονός
          «Παραγωγή παραδομένη χωρίς πραγματικές ώρες» και ειδοποιούνται μόνο
          όσοι βλέπουν κόστος.
        </p>
      )}
    </section>
  );
}

export function G3Signal({ figures }: { figures: Figures }) {
  const { overrunPercent, multipliers } = COST_SETTINGS;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Υπέρβαση κόστους</h2>
        {figures.isOverrun ? (
          <Badge tone="attention">αναμμένο</Badge>
        ) : (
          <Badge>σβηστό</Badge>
        )}
      </div>
      {!figures.actual ? (
        <p className="muted">
          Χωρίς πλήρεις πραγματικές ώρες το σήμα δεν κρίνεται.
        </p>
      ) : (
        <ul className="list">
          <li>
            α) Ώρες πάνω από την εκτίμηση κατά περισσότερο από {overrunPercent}
            %: {figures.hoursOver ? "ναι" : "όχι"} (
            {fmtPercent(figures.hoursPercent)})
          </li>
          {figures.price !== null && (
            <li>
              β) Τιμή κάτω από κόστος × {multipliers.min}:{" "}
              {figures.belowMinimum ? "ναι" : "όχι"} (τιμή{" "}
              {fmtMoney(figures.price)}, ελάχιστη τιμή{" "}
              {fmtMoney(figures.minimumPrice ?? 0)})
            </li>
          )}
        </ul>
      )}
      <p className="note">
        Το σήμα ακολουθεί τα νούμερα: αν μια διόρθωση αναιρέσει τη συνθήκη,
        σβήνει μόνο του. Κάθε αλλαγή μένει στο Ίχνος. Ο Πελάτης δεν βλέπει
        τίποτα από αυτά.
      </p>
    </section>
  );
}

export function G3Trail({
  entries,
  role,
}: {
  entries: readonly TrailEntry[];
  role: RoleId;
}) {
  return (
    <section className="card">
      <h2>Ίχνος κόστους</h2>
      {entries.length === 0 ? (
        <p className="muted">Καμία εγγραφή κόστους ακόμα.</p>
      ) : (
        <ul className="list">
          {entries.map((entry, index) => (
            <li key={`${entry.when}-${index}`}>
              <span className="muted">
                {fmtDate(entry.when)} · {entry.who}
              </span>
              <div>{entry.what}</div>
            </li>
          ))}
        </ul>
      )}
      <p className="note">
        <Link href={screenHref(role, "I7", {})}>
          Κερδοφορία ανά Πελάτη και μήνα
        </Link>
        <br />
        Τα σύνολα ανά Πελάτη και μήνα ζουν στα Οικονομικά (I7)· εδώ μόνο η μία
        Παραγωγή.
      </p>
    </section>
  );
}
