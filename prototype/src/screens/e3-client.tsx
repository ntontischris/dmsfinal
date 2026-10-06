"use client";

import { useState } from "react";

import { BOOKING_HOURS } from "@/data/filming";
import { endTime, hoursUntil } from "@/data/filming-access";
import {
  TODAY,
  fmtDay,
  termsOf,
  withFilming,
  withLog,
  type Live,
  type UpdateLive,
} from "@/screens/e3-model";
import { ReasonForm } from "@/screens/e3-ui";
import type { Filming } from "@/data/filming";

interface Props {
  live: Live;
  initial: Filming;
  update: UpdateLive;
}

type Form = "reschedule" | "cancel" | "request" | null;

const CLIENT = "Πελάτης";

const slotError = (
  filming: Filming,
  date: string,
  start: string,
): string | null => {
  if (!date || !start) return "Διάλεξε μέρα και ώρα.";
  if (date <= TODAY) return "Η νέα μέρα πρέπει να είναι μετά από σήμερα.";
  const closed = BOOKING_HOURS.closedDays[date];
  if (closed) return closed;
  const day = BOOKING_HOURS.week[new Date(`${date}T00:00:00Z`).getUTCDay()];
  if (!day) return "Δεν δεχόμαστε κρατήσεις εκείνη τη μέρα.";
  const [hour] = start.split(":").map(Number);
  if (hour < day.from || hour + filming.hours > day.to)
    return `Εκείνη τη μέρα δεχόμαστε ${day.from}:00–${day.to}:00.`;
  return null;
};

function RescheduleForm({
  live,
  update,
  onClose,
}: Props & { onClose: () => void }) {
  const f = live.filming;
  const [date, setDate] = useState("");
  const [start, setStart] = useState(f.start);
  const error = date ? slotError(f, date, start) : null;
  const send = () => {
    update((l) =>
      withLog(
        { ...l, reschedule: { date, start } },
        `Ζητήθηκε μετάθεση στις ${date} ${start}. Περιμένει έγκριση· η παλιά ώρα κρατιέται.`,
      ),
    );
    onClose();
  };
  return (
    <div className="stack e3-form">
      <label>
        Νέα μέρα
        <input
          className="input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <label>
        Νέα ώρα έναρξης
        <input
          className="input"
          type="time"
          step={3600}
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
      </label>
      {error && <p className="e3-warn">{error}</p>}
      <p className="muted">
        Η μετάθεση θέλει έγκριση. Μέχρι να απαντήσουμε, το Γύρισμα μένει στην
        παλιά ώρα και η Παροχή μένει μία.
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!date || !!error}
          onClick={send}
        >
          Αίτημα μετάθεσης
        </button>
        <button type="button" className="button" onClick={onClose}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

export function E3ClientActions({ live, initial, update }: Props) {
  const [form, setForm] = useState<Form>(null);
  const f = live.filming;
  const terms = termsOf(initial);
  const close = () => setForm(null);
  const isWaiting = f.state === "αναμένει έγκριση";
  const isScheduled = f.state === "προγραμματισμένο";
  const isBeforeLimit = hoursUntil(f) > terms.cancelHours;

  const cancel = (reason: string) => {
    update((l) =>
      withLog(
        withFilming(l, {
          state: "ακυρώθηκε",
          cancellation: {
            by: CLIENT,
            when: TODAY,
            reason,
            side: "πελάτης",
            burns: false,
          },
        }),
        "Ακύρωσες το Γύρισμα. Η Παροχή επέστρεψε.",
      ),
    );
    close();
  };
  const request = (reason: string) => {
    update((l) =>
      withLog(
        withFilming(l, { cancelRequest: { by: CLIENT, when: TODAY, reason } }),
        "Στάλθηκε αίτημα ακύρωσης στη Διαχείριση.",
      ),
    );
    close();
  };

  if (!isWaiting && !isScheduled) return null;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Τι μπορείς να κάνεις</h2>
      </div>
      {isWaiting && form !== "cancel" && (
        <div className="stack">
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setForm("cancel")}
          >
            Ακύρωση
          </button>
          <p className="muted">
            Όσο περιμένει έγκριση, ακυρώνεις πάντα μόνος σου και η Παροχή
            επιστρέφει.
          </p>
        </div>
      )}
      {isScheduled && isBeforeLimit && form === null && (
        <div className="stack">
          <div className="btn-row">
            <button
              type="button"
              className="button"
              onClick={() => setForm("reschedule")}
              disabled={!!live.reschedule}
            >
              Μετάθεση
            </button>
            <button
              type="button"
              className="button"
              data-danger="true"
              onClick={() => setForm("cancel")}
            >
              Ακύρωση
            </button>
          </div>
          <p className="muted">
            Μέχρι {terms.cancelHours} ώρες πριν (Όριο ακύρωσης) ακυρώνεις μόνος
            σου και η Παροχή επιστρέφει.
          </p>
        </div>
      )}
      {isScheduled && !isBeforeLimit && form === null && !f.cancelRequest && (
        <div className="stack">
          <button
            type="button"
            className="button"
            onClick={() => setForm("request")}
          >
            Ζήτησε ακύρωση
          </button>
          <p className="muted">
            Πέρασε το Όριο ακύρωσης ({terms.cancelHours} ώρες πριν). Στέλνεις
            αίτημα και το αποφασίζει η ομάδα. Αν γίνει δεκτό, η Παροχή{" "}
            {terms.lateCancelBurns ? "καίγεται" : "επιστρέφει"}.
          </p>
        </div>
      )}
      {f.cancelRequest && (
        <p className="note">
          Έχεις ζητήσει ακύρωση ({f.cancelRequest.reason}). Περιμένει απάντηση
          από την ομάδα.
        </p>
      )}
      {live.reschedule && (
        <p className="note">
          Ζήτησες μετάθεση στις {fmtDay(live.reschedule.date)}{" "}
          {live.reschedule.start}. Περιμένει έγκριση· μέχρι τότε το Γύρισμα
          μένει {fmtDay(f.date)} {f.start}–{endTime(f)}.
        </p>
      )}
      {form === "reschedule" && (
        <RescheduleForm
          live={live}
          initial={initial}
          update={update}
          onClose={close}
        />
      )}
      {form === "cancel" && (
        <ReasonForm
          label="Λόγος ακύρωσης (προαιρετικός)"
          confirmLabel="Ακύρωση Γυρίσματος"
          isDanger
          isOptional
          onConfirm={cancel}
          onClose={close}
        />
      )}
      {form === "request" && (
        <ReasonForm
          label="Λόγος αιτήματος"
          confirmLabel="Στείλε αίτημα"
          onConfirm={request}
          onClose={close}
        />
      )}
    </section>
  );
}
