"use client";

import Link from "next/link";
import { useState } from "react";

import type { EquipmentItem } from "@/data/equipment";
import {
  canReserveOn,
  isUpcoming,
  type EquipmentCaps,
} from "@/data/equipment-access";
import { FILMINGS, FILMING_RULES, type Filming } from "@/data/filming";
import {
  canOpenFilming,
  overlappingFilmings,
  startsAt,
} from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import { Warning } from "@/screens/e3-ui";
import { conflictText, filmingLabel } from "@/screens/f-model";
import { Badge, screenHref } from "@/screens/shared";

interface F2ReservationsProps {
  role: RoleId;
  caps: EquipmentCaps;
  item: EquipmentItem;
  holderIds: readonly string[];
  onChange: (holderIds: readonly string[], text: string) => void;
}

const byStart = (a: Filming, b: Filming) => startsAt(a) - startsAt(b);

const clashesWith = (filming: Filming, holders: readonly Filming[]) =>
  overlappingFilmings(filming).filter((other) => holders.includes(other));

export function F2Reservations({
  role,
  caps,
  item,
  holderIds,
  onChange,
}: F2ReservationsProps) {
  const [picked, setPicked] = useState("");
  const holders = FILMINGS.filter((f) => holderIds.includes(f.id));
  const upcoming = holders.filter(isUpcoming).sort(byStart);
  const past = holders
    .filter((f) => f.state === "έγινε")
    .sort((a, b) => byStart(b, a))
    .slice(0, 5);
  const conflicts = upcoming.flatMap((a, index) =>
    upcoming
      .slice(index + 1)
      .filter((b) => clashesWith(a, upcoming).includes(b))
      .map((b) => ({ a, b })),
  );
  const blocks = FILMING_RULES.equipmentConflict === "μπλοκάρει";
  const isAvailable = item.status === "διαθέσιμο";
  const candidates = FILMINGS.filter(
    (f) => isUpcoming(f) && !holderIds.includes(f.id) && canReserveOn(role, f),
  ).sort(byStart);
  const pickedFilming = candidates.find((f) => f.id === picked);
  const pickedClashes = pickedFilming
    ? clashesWith(pickedFilming, upcoming)
    : [];
  const isPickedBlocked = blocks && pickedClashes.length > 0;
  // Όποιο Γύρισμα δεν σε αφορά φαίνεται ως κείμενο: ξέρεις πού είναι το αντικείμενο, όχι τι γυρίζεται.
  const link = (f: Filming) =>
    canOpenFilming(role, f) ? (
      <Link href={screenHref(role, "E3", { id: f.id })}>{filmingLabel(f)}</Link>
    ) : (
      <span>{filmingLabel(f)}</span>
    );

  return (
    <>
      {conflicts.length > 0 && (
        <section className="card e3-banner">
          <div className="card-title">
            <h2>Συγκρούσεις</h2>
            <Badge tone="attention">{conflicts.length}</Badge>
          </div>
          {conflicts.map(({ a, b }) => (
            <Warning key={`${a.id}-${b.id}`}>
              Δεσμευμένο σε δύο Γυρίσματα που επικαλύπτονται: {link(a)} και{" "}
              {link(b)}. Λύσ' το αποδεσμεύοντας το ένα ή αλλάζοντας ώρα.
            </Warning>
          ))}
          <p className="note">{conflictText(blocks)}</p>
        </section>
      )}
      <section className="card">
        <div className="card-title">
          <h2>Μελλοντικές Δεσμεύσεις</h2>
          <span className="badge">{upcoming.length}</span>
        </div>
        {!isAvailable && upcoming.length > 0 && (
          <Warning>
            Το αντικείμενο είναι «{item.status}» αλλά έχει Δεσμεύσεις. Αποφάσισε
            αν θα είναι έτοιμο εγκαίρως, αλλιώς αποδέσμευσέ το.
          </Warning>
        )}
        {upcoming.length === 0 && (
          <p className="muted">Καμία μελλοντική Δέσμευση.</p>
        )}
        <ul className="list">
          {upcoming.map((f) => (
            <li key={f.id}>
              <div className="row">
                <span>
                  {link(f)} <span className="muted">· {f.state}</span>
                </span>
                {canReserveOn(role, f) && (
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      onChange(
                        holderIds.filter((id) => id !== f.id),
                        `Αποδεσμεύτηκε από ${filmingLabel(f)}.`,
                      )
                    }
                  >
                    Αποδέσμευση
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {caps.canReserve && (
          <div className="stack">
            {!isAvailable ? (
              <p className="muted">
                Νέα Δέσμευση γίνεται μόνο σε «διαθέσιμο» αντικείμενο.
              </p>
            ) : candidates.length === 0 ? (
              <p className="muted">
                Δεν υπάρχει ανοιχτό Γύρισμα όπου μπορείς να το δεσμεύσεις.
              </p>
            ) : (
              <div className="e3-inline">
                <select
                  className="select"
                  aria-label="Γύρισμα για Δέσμευση"
                  value={picked}
                  onChange={(event) => setPicked(event.target.value)}
                >
                  <option value="">Δέσμευσε σε Γύρισμα…</option>
                  {candidates.map((f) => (
                    <option key={f.id} value={f.id}>
                      {filmingLabel(f)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="button"
                  disabled={!pickedFilming || isPickedBlocked}
                  onClick={() => {
                    if (!pickedFilming) return;
                    onChange(
                      [...holderIds, pickedFilming.id],
                      `Δεσμεύτηκε σε ${filmingLabel(pickedFilming)}.`,
                    );
                    setPicked("");
                  }}
                >
                  Δέσμευση
                </button>
              </div>
            )}
            {pickedClashes.map((other) => (
              <Warning key={other.id}>
                {isPickedBlocked ? "Μπλοκάρεται" : "Θα συγκρούεται"}: ήδη
                δεσμευμένο στο {filmingLabel(other)}.
              </Warning>
            ))}
            {caps.isReserveScoped && (
              <p className="note">
                Δεσμεύεις μόνο σε Γυρίσματα όπου είσαι Μέλος της Παραγωγής ή του
                Συνεργείου.
              </p>
            )}
          </div>
        )}
      </section>
      <section className="card">
        <div className="card-title">
          <h2>Πρόσφατες χρήσεις</h2>
        </div>
        {past.length === 0 ? (
          <p className="muted">
            Δεν έχει χρησιμοποιηθεί ακόμα σε Γύρισμα που έγινε.
          </p>
        ) : (
          <ul className="list">
            {past.map((f) => (
              <li key={f.id}>{link(f)}</li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
