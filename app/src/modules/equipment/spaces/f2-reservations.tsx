"use client";

import Link from "next/link";
import { useState } from "react";

import { LastDone, Warning } from "./f-ui";

import type { EquipmentStatus } from "../types";
import type { CandidateView, ReservationView } from "./f-adapter";
import { FBox } from "./f-box";
import { conflictText, overlaps } from "./f-model";
import { useRunAction } from "./f-run";
import { releaseFromItem, reserveFromItem } from "./f2-reserve-actions";

export interface ReservationsAccess {
  canReserve: boolean;
  isReserveScoped: boolean; // «Δεσμεύει εξοπλισμό» με εύρος «δικά του»
  blocks: boolean | null; // ο Κανόνας σύγκρουσης· null όταν ο Χρήστης δεν βλέπει τους Κανόνες
}

interface F2ReservationsProps {
  itemId: string;
  status: EquipmentStatus;
  statusLabel: string;
  replacements: readonly string[];
  reservations: readonly ReservationView[];
  conflicts: readonly { a: ReservationView; b: ReservationView }[];
  candidates: readonly CandidateView[];
  access: ReservationsAccess;
}

// Όποιο Γύρισμα δεν σε αφορά φαίνεται ως κείμενο: ξέρεις πού είναι το αντικείμενο, όχι τι γυρίζεται.
function FilmingLink({ view }: { view: ReservationView }) {
  return view.href ? (
    <Link href={view.href}>{view.label}</Link>
  ) : (
    <span>{view.label}</span>
  );
}

// Δεσμεύσεις και συγκρούσεις (prototype `f2-reservations.tsx`) από το equipment_item_view· η βάση ξαναελέγχει κάθε ενέργεια.
export function F2Reservations({
  itemId,
  status,
  statusLabel,
  replacements,
  reservations,
  conflicts,
  candidates,
  access,
}: F2ReservationsProps) {
  const [picked, setPicked] = useState("");
  const { isPending, last, run } = useRunAction();
  const isAvailable = status === "available";
  const pickedFilming = candidates.find((f) => f.id === picked);
  const pickedClashes = pickedFilming
    ? reservations.filter((other) => overlaps(pickedFilming, other))
    : [];
  const isPickedBlocked = access.blocks === true && pickedClashes.length > 0;
  const message = last.error ?? last.notice;

  return (
    <>
      {conflicts.length > 0 && (
        <FBox
          title="Συγκρούσεις"
          hint={`${conflicts.length} επικαλύψεις`}
          isOpen
        >
          {conflicts.map(({ a, b }) => (
            <Warning key={`${a.key}-${b.key}`}>
              Δεσμευμένο σε δύο Γυρίσματα που επικαλύπτονται:{" "}
              <FilmingLink view={a} /> και <FilmingLink view={b} />. Λύσ&apos;
              το αποδεσμεύοντας το ένα ή αλλάζοντας ώρα.
            </Warning>
          ))}
          {access.blocks !== null && (
            <p className="f-note">{conflictText(access.blocks)}</p>
          )}
        </FBox>
      )}
      <FBox
        title="Μελλοντικές Δεσμεύσεις"
        hint={`${reservations.length} Δεσμεύσεις`}
        isOpen
      >
        {!isAvailable && reservations.length > 0 && (
          <Warning>
            Το αντικείμενο είναι «{statusLabel}» αλλά έχει Δεσμεύσεις. Αποφάσισε
            αν θα είναι έτοιμο εγκαίρως, αλλιώς αποδέσμευσέ το και
            {replacements.length > 0
              ? ` δέσμευσε στη θέση του ${replacements.join(" ή ")} από τη σελίδα του Γυρίσματος.`
              : " ενημέρωσε το Συνεργείο από τη σελίδα του Γυρίσματος."}
          </Warning>
        )}
        {reservations.length === 0 && (
          <p className="ml-empty">Καμία μελλοντική Δέσμευση.</p>
        )}
        {reservations.length > 0 && (
          <ul className="ml-list">
            {reservations.map((f) => (
              <li key={f.key} className="ml-line">
                <span className="ml-thumb" aria-hidden="true">
                  {f.day}
                </span>
                <div className="ml-main">
                  <strong>
                    <FilmingLink view={f} />
                  </strong>
                  <small>{f.weekday}</small>
                </div>
                <span className="ml-tag">{f.stateLabel}</span>
                {access.canReserve && f.filmingId ? (
                  <span className="ml-quick">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        run(releaseFromItem, {
                          itemId,
                          filmingId: f.filmingId ?? "",
                        })
                      }
                    >
                      Αποδέσμευση
                    </button>
                  </span>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        )}
        {access.canReserve && (
          <div className="f-box-body">
            {!isAvailable ? (
              <p className="f-note">
                Νέα Δέσμευση γίνεται μόνο σε «διαθέσιμο» αντικείμενο.
              </p>
            ) : candidates.length === 0 ? (
              <p className="f-note">
                Δεν υπάρχει ανοιχτό Γύρισμα όπου μπορείς να το δεσμεύσεις.
              </p>
            ) : (
              <div className="e3-inline ml-actions">
                <select
                  className="select"
                  aria-label="Γύρισμα για Δέσμευση"
                  value={picked}
                  onChange={(event) => setPicked(event.target.value)}
                >
                  <option value="">Δέσμευσε σε Γύρισμα…</option>
                  {candidates.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                 
                  disabled={!pickedFilming || isPickedBlocked || isPending}
                  onClick={() => {
                    if (!pickedFilming) return;
                    run(
                      reserveFromItem,
                      { itemId, filmingId: pickedFilming.id },
                      () => setPicked(""),
                    );
                  }}
                >
                  Δέσμευση
                </button>
              </div>
            )}
            {pickedClashes.map((other) => (
              <Warning key={other.key}>
                {isPickedBlocked ? "Μπλοκάρεται" : "Θα συγκρούεται"}: ήδη
                δεσμευμένο στο {other.label}.
              </Warning>
            ))}
            {access.isReserveScoped && (
              <p className="f-note">
                Δεσμεύεις μόνο σε Γυρίσματα όπου είσαι Μέλος της Παραγωγής ή του
                Συνεργείου.
              </p>
            )}
          </div>
        )}
        <LastDone
          log={message ? [message] : []}
          tone={last.error ? "error" : "ok"}
        />
      </FBox>
    </>
  );
}
