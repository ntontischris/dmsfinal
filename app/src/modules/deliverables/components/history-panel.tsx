import { Panel } from "@/components/ui/panel";

import { formatDateTime } from "../helpers";
import { historyLines, type HistoryLine } from "../history";
import type { DeliverableHistoryEntry } from "../types";

import { MutedNote } from "./form-fields";

// Το Ίχνος ενεργειών του Παραδοτέου, όπως στις άλλες σελίδες: ποιος, πότε, τι.
export function HistoryPanel({ history }: { history: readonly DeliverableHistoryEntry[] }) {
  const lines: HistoryLine[] = historyLines(history);
  return (
    <Panel label="Ίχνος ενεργειών">
      {lines.length === 0 ? (
        <MutedNote>Καμία ενέργεια ακόμα.</MutedNote>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {lines.map((line, index) => (
            <li key={`${line.at}-${index}`} className="flex flex-wrap justify-between gap-2">
              <span>{line.text}</span>
              <span className="text-muted-foreground">
                {line.actor} · {formatDateTime(line.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
