import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Field, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { releaseItem, reserveItem } from "../actions-equipment";
import { formatDateTime, formatHours } from "../helpers";
import { STATE_LABELS } from "../labels";
import type { ItemReservation, OpenFilmingOption } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

interface ReservationsPanelProps {
  itemId: string;
  reservations: readonly ItemReservation[];
  nextReservation: ItemReservation | null;
  openFilmings: readonly OpenFilmingOption[];
  canReserve: boolean;
}

// F2 «Δεσμεύσεις»: πού είναι δεσμευμένο το αντικείμενο, με σήμα σύγκρουσης και αποδέσμευση. Ο σύνδεσμος στο Γύρισμα
// φαίνεται μόνο όπου ο Χρήστης το βλέπει (αλλιώς μόνο η ώρα).
export function ReservationsPanel({
  itemId,
  reservations,
  nextReservation,
  openFilmings,
  canReserve,
}: ReservationsPanelProps) {
  const reservedIds = reservations.map((row) => row.filmingId);
  const choices = openFilmings.filter(
    (filming) => !reservedIds.includes(filming.id),
  );
  return (
    <Panel label="Δεσμεύσεις">
      <div className="grid gap-4">
        <NextLine next={nextReservation} />
        {reservations.length === 0 ? (
          <MutedNote>Καμία ανοιχτή δέσμευση.</MutedNote>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 text-sm">
            {reservations.map((row) => (
              <ReservationLine
                key={`${row.startsAt}-${row.filmingId ?? "hidden"}`}
                itemId={itemId}
                row={row}
                canRelease={canReserve}
              />
            ))}
          </ul>
        )}
        {canReserve && choices.length > 0 && (
          <ReserveForm itemId={itemId} choices={choices} />
        )}
      </div>
    </Panel>
  );
}

function NextLine({ next }: { next: ItemReservation | null }) {
  if (next === null) return <MutedNote>Καμία επόμενη δέσμευση.</MutedNote>;
  return (
    <p className="m-0 text-sm">
      Επόμενη δέσμευση: {formatDateTime(next.startsAt)} ·{" "}
      {formatHours(next.hours)} ώρ.
    </p>
  );
}

function ReservationLine({
  itemId,
  row,
  canRelease,
}: {
  itemId: string;
  row: ItemReservation;
  canRelease: boolean;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <span className="grid gap-1">
        {row.filmingId ? (
          <Link href={`/app/filming/${row.filmingId}`} className="font-medium">
            {formatDateTime(row.startsAt)}
          </Link>
        ) : (
          <span>{formatDateTime(row.startsAt)}</span>
        )}
        <span className="flex flex-wrap gap-1">
          <Badge>{STATE_LABELS[row.state]}</Badge>
          {row.conflict && <Badge tone="attention">Σύγκρουση</Badge>}
        </span>
      </span>
      {canRelease && row.filmingId && (
        <ActionForm
          action={releaseItem}
          submitLabel="Αποδέσμευση"
          variant="danger"
          size="sm"
        >
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="filmingId" value={row.filmingId} />
        </ActionForm>
      )}
    </li>
  );
}

function ReserveForm({
  itemId,
  choices,
}: {
  itemId: string;
  choices: readonly OpenFilmingOption[];
}) {
  return (
    <ActionForm
      action={reserveItem}
      submitLabel="Δέσμευση σε Γύρισμα"
      variant="default"
      size="sm"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <Field label="Ανοιχτό Γύρισμα">
        <Select name="filmingId" required defaultValue="">
          <option value="" disabled>
            Διάλεξε Γύρισμα…
          </option>
          {choices.map((filming) => (
            <option key={filming.id} value={filming.id}>
              {formatDateTime(filming.startsAt)} · {filming.production.title}
            </option>
          ))}
        </Select>
      </Field>
    </ActionForm>
  );
}
