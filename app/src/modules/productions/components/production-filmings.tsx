import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { formatDateTime } from "../helpers";
import type { ProductionFilming } from "../types";

import { MutedNote } from "./form-fields";

// Οι κατάστασεις των Γυρισμάτων όπως φαίνονται εδώ (ίδιες με τη λίστα Γυρισμάτων).
const FILMING_STATE_LABELS: Readonly<Record<string, string>> = {
  pending: "Αναμένει έγκριση",
  scheduled: "Προγραμματισμένο",
  done: "Έγινε",
  no_show: "Δεν έγινε",
  cancelled: "Ακυρώθηκε",
  rejected: "Απορρίφθηκε",
};

// G2: τα Γυρίσματα της Παραγωγής, όσα βλέπει ο Χρήστης. Κάθε γραμμή οδηγεί στη σελίδα του Γυρίσματος.
export function ProductionFilmings({
  filmings,
}: {
  filmings: readonly ProductionFilming[];
}) {
  return (
    <Panel label="Γυρίσματα">
      {filmings.length === 0 ? (
        <MutedNote>Κανένα Γύρισμα για αυτή την Παραγωγή.</MutedNote>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {filmings.map((filming) => (
            <li
              key={filming.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <Link href={`/app/filming/${filming.id}`} className="font-medium">
                {formatDateTime(filming.startsAt)}
              </Link>
              <span className="flex flex-wrap gap-1">
                <Badge>
                  {FILMING_STATE_LABELS[filming.state] ?? filming.state}
                </Badge>
                {filming.isExtra && <Badge tone="strong">Έξτρα</Badge>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
