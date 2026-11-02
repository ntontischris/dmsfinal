"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";

import { decideRescheduleRequest } from "../actions-booking";
import {
  approveFilming,
  cancelFilming,
  decideCancelRequest,
  markFilmingDone,
  markFilmingNoShow,
  rejectFilming,
  rescheduleFilming,
  undoFilmingOutcome,
} from "../actions-transitions";
import { athensDate, athensTime, formatDateTime } from "../helpers-time";
import type { FilmingCard } from "../types";
import { hoursLabel, isOpenState } from "./e3-model";
import { useRun, type FormAction } from "./e3-run";
import { LastDone, ReasonForm } from "./e3-ui";

// Οι Ενέργειες της σελίδας Γυρίσματος (prototype `screens/e3-actions.tsx`). Κάθε κουμπί φαίνεται μόνο όταν το viewerCan
// της βάσης το επιτρέπει· η βάση ελέγχει ξανά. Λείπει ο σύνδεσμος αρχείων στο «έγινε» (δεν υπάρχει στη βάση).

type Form =
  | "reject"
  | "cancel"
  | "undo"
  | "done"
  | "noshow"
  | "move"
  | "refuseMove"
  | null;

interface ActionsProps {
  card: FilmingCard;
  // Πρόβλημα της νέας ώρας ενός αιτήματος μετάθεσης (εκτός ωραρίου, σύγκρουση), αν ελέγχθηκε.
  newTimeProblem: string | null;
}

interface FormProps {
  card: FilmingCard;
  isPending: boolean;
  onSend: (action: FormAction, fields: Record<string, string>) => void;
  onClose: () => void;
}

function DoneForm({ card, isPending, onSend, onClose }: FormProps) {
  const [hours, setHours] = useState(String(card.hours).replace(".", ","));
  const actual = Number(hours.replace(",", "."));
  const isValid = Number.isFinite(actual) && actual > 0;
  const extra = isValid ? actual - card.hours : 0;
  return (
    <div className="stack e3-form">
      <label>
        Πόσο κράτησε στην πράξη (ώρες)
        <input
          className="input"
          inputMode="decimal"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />
      </label>
      <p className="muted">
        Είχαν κλειστεί {hoursLabel(card.hours)}. Αν κράτησε παραπάνω, γράψε τις
        πραγματικές ώρες: η επιπλέον ώρα μετρά στο κόστος της Παραγωγής.
      </p>
      {extra > 0 && (
        <p className="note">Επιπλέον χρόνος: {hoursLabel(extra)}.</p>
      )}
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!isValid || isPending}
          onClick={() =>
            onSend(markFilmingDone, { filmingId: card.id, actualHours: hours })
          }
        >
          Επιβεβαίωση «έγινε»
        </button>
        <button type="button" className="button" onClick={onClose}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

// Αλλαγή μέρας/ώρας από την ομάδα: ίδια ενέργεια με τη μετάθεση της παλιάς σελίδας.
function MoveForm({ card, isPending, onSend, onClose }: FormProps) {
  const [date, setDate] = useState(athensDate(card.startsAt));
  const [time, setTime] = useState(athensTime(card.startsAt));
  const [hours, setHours] = useState(String(card.hours).replace(".", ","));
  return (
    <div className="stack e3-form">
      <p className="muted">
        Η Παροχή μένει μία. Αν είχε σταλεί Δελτίο, στείλε νέα έκδοση για να
        ενημερωθεί το Συνεργείο.
      </p>
      <label>
        Μέρα
        <input
          className="input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <label>
        Ώρα έναρξης
        <input
          className="input"
          type="time"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
      <label>
        Διάρκεια (ώρες)
        <input
          className="input"
          inputMode="decimal"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={isPending}
          onClick={() =>
            onSend(rescheduleFilming, { filmingId: card.id, date, time, hours })
          }
        >
          Μετάθεση Γυρίσματος
        </button>
        <button type="button" className="button" onClick={onClose}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function DecisionRow({
  note,
  yes,
  no,
  isDanger,
  isPending,
}: {
  note: string;
  yes: { label: string; onClick: () => void };
  no: { label: string; onClick: () => void };
  isDanger?: boolean;
  isPending: boolean;
}) {
  return (
    <div className="stack">
      <p className="note">{note}</p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary={isDanger ? undefined : "true"}
          data-danger={isDanger}
          disabled={isPending}
          onClick={yes.onClick}
        >
          {yes.label}
        </button>
        <button
          type="button"
          className="button"
          disabled={isPending}
          onClick={no.onClick}
        >
          {no.label}
        </button>
      </div>
    </div>
  );
}

export function E3Actions({ card, newTimeProblem }: ActionsProps) {
  const [form, setForm] = useState<Form>(null);
  const { run, isPending, result } = useRun();
  const can = card.viewerCan;
  const close = () => setForm(null);
  const send = (action: FormAction, fields: Record<string, string>) =>
    run(action, fields, close);
  const id = { filmingId: card.id };
  const isOpen = isOpenState(card.state);
  const formProps = { card, isPending, onSend: send, onClose: close };
  const pending = card.signals.pendingReschedule;
  const cancelHours = card.agreement?.filmingCancelHours;

  return (
    <Panel label="Ενέργειες">
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {isOpen && can.reschedule && form === null && (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            onClick={() => setForm("move")}
          >
            Αλλαγή μέρας/ώρας
          </button>
        </div>
      )}
      {form === "move" && <MoveForm {...formProps} />}

      {card.state === "pending" && can.approve && form === null && (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            disabled={isPending}
            onClick={() => send(approveFilming, id)}
          >
            Έγκριση
          </button>
          {can.reject && (
            <button
              type="button"
              className="button"
              data-danger="true"
              onClick={() => setForm("reject")}
            >
              Απόρριψη
            </button>
          )}
        </div>
      )}
      {form === "reject" && (
        <ReasonForm
          label="Λόγος απόρριψης"
          confirmLabel="Απόρριψη"
          isDanger
          isPending={isPending}
          onConfirm={(reason) => send(rejectFilming, { ...id, reason })}
          onClose={close}
        />
      )}
      {card.state === "pending" && !can.approve && (
        <p className="muted">Περιμένει έγκριση από τη Διαχείριση.</p>
      )}

      {card.state === "scheduled" &&
        form === null &&
        (can.markDone || can.markNoShow) && (
          <div className="btn-row">
            {can.markDone && (
              <button
                type="button"
                className="button"
                data-primary="true"
                onClick={() => setForm("done")}
              >
                Έγινε (και πόσο κράτησε)
              </button>
            )}
            {can.markNoShow && (
              <button
                type="button"
                className="button"
                onClick={() => setForm("noshow")}
              >
                Δεν έγινε
              </button>
            )}
          </div>
        )}
      {form === "done" && <DoneForm {...formProps} />}
      {form === "noshow" && (
        <DecisionRow
          note="Ο πελάτης δεν εμφανίστηκε. Η Παροχή καίγεται ή επιστρέφει κατά τους Όρους της Συμφωνίας."
          isDanger
          isPending={isPending}
          yes={{
            label: "Επιβεβαίωση «δεν έγινε»",
            onClick: () => send(markFilmingNoShow, id),
          }}
          no={{ label: "Άκυρο", onClick: close }}
        />
      )}

      {form === "refuseMove" && (
        <ReasonForm
          label="Λόγος απόρριψης της μετάθεσης"
          confirmLabel="Απόρριψη μετάθεσης"
          isPending={isPending}
          onConfirm={(reason) =>
            send(decideRescheduleRequest, { ...id, accept: "refuse", reason })
          }
          onClose={close}
        />
      )}
      {pending && can.decideReschedule && form !== "refuseMove" && (
        <DecisionRow
          note={`Ο πελάτης ζητά μετάθεση στις ${formatDateTime(pending.startsAt)} (${hoursLabel(pending.hours)}). Η παλιά ώρα κρατιέται μέχρι την απάντηση· η Παροχή μένει μία.${newTimeProblem ? ` Προσοχή: ${newTimeProblem}` : ""}`}
          isPending={isPending}
          yes={{
            label: "Έγκριση μετάθεσης",
            onClick: () =>
              send(decideRescheduleRequest, { ...id, accept: "accept" }),
          }}
          no={{
            label: "Απόρριψη μετάθεσης",
            onClick: () => setForm("refuseMove"),
          }}
        />
      )}

      {card.cancelRequest && can.decideCancel && (
        <DecisionRow
          note={`Αίτημα ακύρωσης: «${card.cancelRequest.reason}». Αν το δεχτείς, η Παροχή καίγεται ή επιστρέφει κατά τον Κανόνα της Συμφωνίας${cancelHours !== undefined ? ` (Όριο ${cancelHours} ώρες)` : ""}.`}
          isDanger
          isPending={isPending}
          yes={{
            label: "Δέχομαι",
            onClick: () =>
              send(decideCancelRequest, { ...id, accept: "accept" }),
          }}
          no={{
            label: "Αρνούμαι",
            onClick: () =>
              send(decideCancelRequest, { ...id, accept: "refuse" }),
          }}
        />
      )}
      {card.cancelRequest && !can.decideCancel && (
        <p className="muted">
          Υπάρχει αίτημα ακύρωσης από τον πελάτη· το αποφασίζει η Διαχείριση.
        </p>
      )}

      {isOpen && can.cancel && form === null && (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setForm("cancel")}
          >
            Ακύρωση από την ομάδα
          </button>
        </div>
      )}
      {form === "cancel" && (
        <ReasonForm
          label="Λόγος ακύρωσης"
          confirmLabel="Ακύρωση Γυρίσματος"
          isDanger
          isPending={isPending}
          onConfirm={(reason) => send(cancelFilming, { ...id, reason })}
          onClose={close}
        />
      )}

      {(card.state === "done" || card.state === "no_show") &&
        can.undo &&
        form !== "undo" && (
          <div className="stack">
            <button
              type="button"
              className="button"
              onClick={() => setForm("undo")}
            >
              Αναίρεση
            </button>
            <p className="muted">
              Για «έγινε» ή «δεν έγινε» που μπήκε κατά λάθος. Το Τιμολογητέο που
              γέννησε σβήνεται αν δεν έχει τιμολογηθεί· αλλιώς διορθώνεται με
              πιστωτικό.
            </p>
          </div>
        )}
      {form === "undo" && (
        <ReasonForm
          label="Λόγος αναίρεσης"
          confirmLabel="Αναίρεση"
          isPending={isPending}
          onConfirm={(reason) => send(undoFilmingOutcome, { ...id, reason })}
          onClose={close}
        />
      )}
      {(card.state === "cancelled" || card.state === "rejected") && (
        <p className="muted">Το Γύρισμα είναι τελικό.</p>
      )}
    </Panel>
  );
}
