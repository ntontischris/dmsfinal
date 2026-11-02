import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";

import { formatDateTime, historyLines } from "../helpers";
import type { ProductionHistoryEntry } from "../types";

// Μηνύματα και Ίχνος της Σελίδας Παραγωγής (prototype `screens/g2-notes.tsx`). Τα «Τιμολογητέα της Παραγωγής» του prototype
// λείπουν: η Παραγωγή της βάσης δεν φέρνει ποσά.

// Η Συνομιλία είναι μία ανά Πελάτη· ο σύνδεσμος ανοίγει με την ετικέτα της Παραγωγής. null = χωρίς «Συνομιλεί με πελάτη».
export function G2Messages({
  isInternal,
  threadHref,
}: {
  isInternal: boolean;
  threadHref: string | null;
}) {
  return (
    <Panel label="Μηνύματα της ετικέτας">
      {isInternal ? (
        <p className="muted">
          Εσωτερική Παραγωγή: δεν έχει Συνομιλία πελάτη· μόνο Εσωτερικά
          Μηνύματα.
        </p>
      ) : (
        <>
          <p className="muted">
            Η Συνομιλία είναι μία ανά Πελάτη. Τα μηνύματα με την ετικέτα αυτής
            της Παραγωγής ανοίγουν φιλτραρισμένα στη Συνομιλία.
          </p>
          {threadHref && (
            <Link className="button" href={threadHref}>
              Άνοιγμα Συνομιλίας
            </Link>
          )}
        </>
      )}
    </Panel>
  );
}

// Το Ίχνος ενεργειών: τα γεγονότα της Παραγωγής, νεότερο πρώτο.
export function G2Trail({
  history,
}: {
  history: readonly ProductionHistoryEntry[];
}) {
  const lines = historyLines(history);
  return (
    <Panel label="Ίχνος ενεργειών">
      {lines.length === 0 && (
        <p className="muted">Δεν υπάρχουν ακόμα ενέργειες.</p>
      )}
      <ul className="list">
        {lines.map((line, index) => (
          <li key={`${line.at}-${index}`}>
            <span className="muted">
              {formatDateTime(line.at)} · {line.actor}
            </span>
            <div>{line.text}</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
