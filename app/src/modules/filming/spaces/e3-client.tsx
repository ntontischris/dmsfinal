"use client";

import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";

import { withdrawRescheduleRequest } from "../actions-book";
import { athensDate, athensTime, formatDateTime } from "../helpers-time";
import type { FilmingCard } from "../types";
import { fmtDay } from "./e3-model";
import { useRun } from "./e3-run";
import { LastDone } from "./e3-ui";

// «Τι μπορείς να κάνεις» του πελάτη (prototype `screens/e3-client.tsx`), με τις ενέργειες της παλιάς σελίδας: μετάθεση μέσω
// της Κράτησης (E5) και απόσυρση του αιτήματος. Η ακύρωση και το αίτημα ακύρωσης του prototype λείπουν (δεν υπάρχει action).

const KEEPS_ONE =
  "Η μετάθεση θέλει έγκριση. Μέχρι να απαντήσουμε, το Γύρισμα μένει στην παλιά ώρα και μετρά μία φορά.";

const HOUR_MS = 3_600_000;

const endOf = (card: FilmingCard): string =>
  athensTime(
    new Date(Date.parse(card.startsAt) + card.hours * HOUR_MS).toISOString(),
  );

const rescheduleHref = (card: FilmingCard): string | null =>
  card.viewerCan.clientReschedule && card.agreement && card.kind
    ? `/app/book?reschedule=${card.id}&agreement=${card.agreement.id}&kind=${card.kind.id}`
    : null;

export function E3ClientActions({ card }: { card: FilmingCard }) {
  const { run, isPending, result } = useRun();
  const pending = card.signals.pendingReschedule;
  const slotProblem = card.signals.slotProblem;
  const moveHref = pending ? null : rescheduleHref(card);
  const hasAny =
    !!moveHref || !!pending || !!slotProblem || !!card.cancelRequest;
  if (!hasAny)
    return result ? (
      <section className="card">
        <LastDone log={[result.text]} tone={result.tone} />
      </section>
    ) : null;
  return (
    <Panel label="Τι μπορείς να κάνεις">
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {slotProblem && <p className="note">{slotProblem}</p>}
      {moveHref && (
        <div className="stack">
          <div className="btn-row">
            <Link className="button" href={moveHref}>
              Ζητώ άλλη μέρα
            </Link>
          </div>
          <p className="muted">{KEEPS_ONE}</p>
        </div>
      )}
      {card.cancelRequest && (
        <p className="note">
          Έχεις ζητήσει ακύρωση ({card.cancelRequest.reason}). Περιμένει
          απάντηση από την ομάδα.
        </p>
      )}
      {pending && (
        <div className="stack">
          <p className="note">
            Ζήτησες μετάθεση στις {formatDateTime(pending.startsAt)}. Περιμένει
            έγκριση· μέχρι τότε το Γύρισμα μένει{" "}
            {fmtDay(athensDate(card.startsAt))} {athensTime(card.startsAt)}–
            {endOf(card)}.
          </p>
          {card.viewerCan.clientWithdrawReschedule && (
            <div className="btn-row">
              <button
                type="button"
                className="button"
                disabled={isPending}
                onClick={() =>
                  run(withdrawRescheduleRequest, { filmingId: card.id })
                }
              >
                Απόσυρση
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
