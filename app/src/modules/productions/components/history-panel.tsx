import { Panel } from "@/components/ui/panel";

import { formatDateTime, historyLines } from "../helpers";
import type { ProductionHistoryEntry } from "../types";

import { MutedNote } from "./form-fields";

// Το ιστορικό της Παραγωγής: το Ίχνος ενεργειών, νεότερο πρώτο.
export function HistoryPanel({ history }: { history: readonly ProductionHistoryEntry[] }) {
  const lines = historyLines(history);
  return (
    <Panel label="Ιστορικό">
      {lines.length === 0 ? (
        <MutedNote>Δεν υπάρχει ακόμα ιστορικό.</MutedNote>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {lines.map((line, index) => (
            <li key={`${line.at}-${index}`}>
              <span className="text-muted-foreground">
                {formatDateTime(line.at)} · {line.actor}
              </span>{" "}
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
