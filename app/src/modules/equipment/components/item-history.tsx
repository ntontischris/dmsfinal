import { Panel } from "@/components/ui/panel";

import { formatDateTime } from "../helpers";
import type { HistoryLine } from "../types";

import { MutedNote } from "./equipment-fields";

// Το ιστορικό του αντικειμένου: το Ίχνος ενεργειών, νεότερο πρώτο.
export function ItemHistory({ lines }: { lines: readonly HistoryLine[] }) {
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
