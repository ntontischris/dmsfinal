import { formatDateTime, historyLines } from "../helpers";
import type { ProductionHistoryEntry } from "../types";
import { G2Box } from "./g2-box";

// Το Ίχνος ενεργειών της Σελίδας Παραγωγής: τα γεγονότα της Παραγωγής, νεότερο πρώτο. Η Συνομιλία ανοίγει από το
// «Άνοιγμα Συνομιλίας» της κεφαλίδας (g2-screen).
export function G2Trail({
  history,
}: {
  history: readonly ProductionHistoryEntry[];
}) {
  const lines = historyLines(history);
  return (
    <G2Box title="Ίχνος ενεργειών" hint={`${lines.length} ενέργειες`}>
      {lines.length === 0 && (
        <p className="ml-empty">Δεν υπάρχουν ακόμα ενέργειες.</p>
      )}
      <ul className="ml-list">
        {lines.map((line, index) => (
          <li key={`${line.at}-${index}`} className="ml-line">
            <span className="ml-main">
              <strong>{line.text}</strong>
              <small>
                {formatDateTime(line.at)} · {line.actor}
              </small>
            </span>
          </li>
        ))}
      </ul>
    </G2Box>
  );
}
