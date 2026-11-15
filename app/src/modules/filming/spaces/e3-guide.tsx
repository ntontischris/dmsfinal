"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { Panel } from "@/spaces/kit/panel";

import { offerTimes, pickOfferedTime, withdrawOffer } from "../actions-answer";
import { formatDateTime } from "../helpers-time";
import { hoursLabel } from "./e3-model";
import { useRun } from "./e3-run";
import { LastDone } from "./e3-ui";

// Οι προτεινόμενες ώρες (οδηγός «Εγκρίνω αιτήματα γυρίσματος», βήμα 2β και ⏳3): η φόρμα της ομάδας, η κατάσταση της
// πρότασης με ανάκληση, και τα κουμπιά του Πελάτη. Μετά από κάθε ενέργεια η σελίδα ξαναφορτώνει μόνη της.

interface OfferFormProps {
  filmingId: string;
  times: readonly string[];
  hours: number;
}

// Βήμα 2β: οι πρώτες ελεύθερες ώρες, ήδη τσεκαρισμένες. Το κύριο κουμπί του οδηγού υποβάλλει τη φόρμα «e3-offer».
export function E3OfferForm({ filmingId, times, hours }: OfferFormProps) {
  const [state, formAction, isPending] = useActionState(
    offerTimes,
    INITIAL_FORM_STATE,
  );
  return (
    <Panel label="Ώρες που προτείνεις στον Πελάτη">
      <form
        id="e3-offer"
        action={formAction}
        className="stack"
        aria-busy={isPending}
      >
        <input type="hidden" name="filmingId" value={filmingId} />
        {times.length === 0 ? (
          <p className="e-warn">
            Δεν βρέθηκε ελεύθερη ώρα στις επόμενες εβδομάδες. Δες το Ημερολόγιο
            ή άλλαξε το ωράριο.
          </p>
        ) : (
          <fieldset className="stack">
            <legend className="kit-label">
              Οι πρώτες ελεύθερες ώρες ({hoursLabel(hours)} η καθεμία)
            </legend>
            {times.map((time) => (
              <label key={time}>
                <input
                  type="checkbox"
                  name="times"
                  value={time}
                  defaultChecked
                />{" "}
                {formatDateTime(time)}
              </label>
            ))}
          </fieldset>
        )}
        <label className="stack">
          <span className="kit-label">
            Σημείωση προς τον Πελάτη (προαιρετικά)
          </span>
          <textarea name="note" rows={2} maxLength={500} />
        </label>
        <p className="muted">
          Ο Πελάτης βλέπει τις ώρες στη σελίδα του Γυρίσματος και κλείνει με ένα
          πάτημα. Θες να το μετακινήσεις χωρίς να ρωτήσεις; Χρησιμοποίησε την
          «Αλλαγή μέρας/ώρας» πιο κάτω.
        </p>
        {state.error && (
          <p className="e-warn" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </Panel>
  );
}

interface OfferStatusProps {
  filmingId: string;
  line: string;
  times: readonly string[];
  note: string | null;
}

// Η ομάδα βλέπει τι στάλθηκε και μπορεί να το ανακαλέσει.
export function E3OfferStatus({
  filmingId,
  line,
  times,
  note,
}: OfferStatusProps) {
  const { run, isPending, result } = useRun();
  return (
    <Panel label="Προτεινόμενες ώρες">
      <div className="stack">
        <p className="e-info">{line}</p>
        {times.length > 0 && (
          <ul>
            {times.map((time) => (
              <li key={time}>{formatDateTime(time)}</li>
            ))}
          </ul>
        )}
        {note && <p className="muted">Σημείωση: «{note}»</p>}
        <div className="btn-row">
          <button
            type="button"
            className="button"
            disabled={isPending}
            onClick={() => run(withdrawOffer, { filmingId })}
          >
            Ανάκληση πρότασης
          </button>
        </div>
        {result && <LastDone log={[result.text]} tone={result.tone} />}
      </div>
    </Panel>
  );
}

interface ClientOfferProps {
  filmingId: string;
  times: readonly string[];
  hours: number;
  note: string | null;
}

// Ο Πελάτης διαλέγει μία ώρα· το Γύρισμα κλείνει χωρίς νέα έγκριση.
export function E3ClientOffer({
  filmingId,
  times,
  hours,
  note,
}: ClientOfferProps) {
  const { run, isPending, result } = useRun();
  return (
    <Panel label="Σου προτείνουμε αυτές τις ώρες">
      <div className="stack">
        {note && <p className="note">«{note}»</p>}
        {times.length === 0 ? (
          <p className="muted">
            Οι ώρες που σου προτείναμε δεν είναι πια ελεύθερες· θα σου στείλουμε
            νέες.
          </p>
        ) : (
          <>
            <p className="muted">
              Πάτα μία ({hoursLabel(hours)}) και το Γύρισμα κλείνει αμέσως.
            </p>
            <div className="btn-row">
              {times.map((time) => (
                <button
                  key={time}
                  type="button"
                  className="button"
                  disabled={isPending}
                  onClick={() =>
                    run(pickOfferedTime, { filmingId, startsAt: time })
                  }
                >
                  {formatDateTime(time)}
                </button>
              ))}
            </div>
          </>
        )}
        {result && <LastDone log={[result.text]} tone={result.tone} />}
      </div>
    </Panel>
  );
}
