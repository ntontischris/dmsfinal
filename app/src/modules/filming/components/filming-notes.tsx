import { Panel } from "@/components/ui/panel";

import { formatDateTime, historyLines } from "../helpers";
import type { FilmingCard } from "../types";

import { MutedNote } from "./form-fields";

// Οι σημειώσεις του Γυρίσματος και οι λόγοι κατάστασης (απόρριψη, ακύρωση). Η εσωτερική σημείωση μόνο όπου επιτρέπεται.
export function FilmingNotes({ card }: { card: FilmingCard }) {
  const notes = noteLines(card);
  return (
    <Panel label="Σημειώσεις">
      {notes.length === 0 ? (
        <MutedNote>Καμία σημείωση.</MutedNote>
      ) : (
        <dl className="m-0 grid gap-3 text-sm">
          {notes.map((note) => (
            <div key={note.label} className="grid gap-0.5">
              <dt className="text-muted-foreground">{note.label}</dt>
              <dd className="m-0 whitespace-pre-line">{note.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

function noteLines(card: FilmingCard): { label: string; text: string }[] {
  const candidates = [
    { label: "Σημείωση Πελάτη", text: card.clientNote },
    { label: "Εσωτερική σημείωση", text: card.internalNote },
    { label: "Λόγος απόρριψης", text: card.rejectedReason },
    { label: "Λόγος ακύρωσης", text: card.cancelledReason },
  ];
  return candidates.flatMap((note) =>
    note.text ? [{ label: note.label, text: note.text }] : [],
  );
}

// Το Ιστορικό: ένα γεγονός ανά γραμμή, με ώρα και όνομα. Το βλέπει μόνο όποιος βλέπει το Συνεργείο.
export function FilmingHistory({ card }: { card: FilmingCard }) {
  const lines = historyLines(card.history);
  return (
    <Panel label="Ιστορικό">
      {lines.length === 0 ? (
        <MutedNote>Κανένα γεγονός ακόμα.</MutedNote>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {lines.map((line, index) => (
            <li key={`${line.at}-${index}`}>
              <span className="text-muted-foreground">
                {formatDateTime(line.at)} · {line.actor}
              </span>
              <br />
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
