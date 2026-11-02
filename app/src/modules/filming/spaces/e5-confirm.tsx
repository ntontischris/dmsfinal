"use client";

import { useKeptForm } from "@/lib/use-kept-form";
import { fmtDate } from "@/spaces/screens/shared";

import { bookClientFilming, rescheduleClientFilming } from "../actions-book";
import { athensToIso, formatDateTime, formatHours } from "../helpers-time";

export interface E5ConfirmProps {
  agreementId: string;
  kindId: string;
  kindLabel: string;
  date: string;
  time: string;
  hours: number;
  cancelHours: number;
  needsApproval: boolean;
  // Μετάθεση υπάρχοντος Γυρίσματος (?reschedule=): χωρίς πεδία κειμένου, όπως η παλιά σελίδα.
  rescheduleId: string | null;
}

// Βήμα 4 (prototype `Summary` + επιβεβαίωση): σύνοψη, Όριο ακύρωσης και αποστολή στο πραγματικό action.
// Με επιτυχία η σελίδα πάει στο Γύρισμα (E3), που λέει αν περιμένει έγκριση.
export function E5Confirm(props: E5ConfirmProps) {
  const { date, time, hours, cancelHours, rescheduleId } = props;
  const bookForm = useKeptForm(bookClientFilming);
  const moveForm = useKeptForm(rescheduleClientFilming);
  const { state, isPending, onSubmit, formRef } = rescheduleId
    ? moveForm
    : bookForm;
  const deadline = new Date(
    new Date(athensToIso(date, time)).getTime() - cancelHours * 3_600_000,
  ).toISOString();
  return (
    <form ref={formRef} onSubmit={onSubmit} className="e-form">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      <input type="hidden" name="hours" value={String(hours)} />
      <div className="e-info">
        <p>
          <strong>
            {fmtDate(date)}, {time}, {formatHours(hours)} ώρες
          </strong>
        </p>
        {rescheduleId ? (
          <p>Το γύρισμα μετακινείται εδώ· μετράει όπως πριν στο πακέτο σου.</p>
        ) : (
          <>
            <p>Μετράει ως γύρισμα του πακέτου σου («{props.kindLabel}»).</p>
            <p>
              <strong>
                Αλλάζεις ή ακυρώνεις μόνος σου μέχρι {formatDateTime(deadline)}
              </strong>{" "}
              ({cancelHours} ώρες πριν). Μετά, μπορείς μόνο να μας ζητήσεις
              αλλαγή. Αν ακυρώσεις αργά, το γύρισμα μετράει σαν να έγινε.
            </p>
          </>
        )}
      </div>
      {rescheduleId ? (
        <input type="hidden" name="filmingId" value={rescheduleId} />
      ) : (
        <>
          <input type="hidden" name="agreementId" value={props.agreementId} />
          <input type="hidden" name="kindId" value={props.kindId} />
          <label>
            Πού (προαιρετικά)
            <input
              className="input"
              name="location"
              maxLength={200}
              placeholder="Π.χ. το στούντιο ή η διεύθυνση"
            />
          </label>
          <label>
            Σημείωση για την ομάδα (προαιρετικά)
            <textarea className="input" name="note" rows={2} maxLength={500} />
          </label>
        </>
      )}
      {state.error && (
        <p className="e-warn" role="alert">
          {state.error}
        </p>
      )}
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending}
        >
          {isPending
            ? "Αποστολή…"
            : rescheduleId
              ? "Επιβεβαίωση μετάθεσης"
              : "Επιβεβαίωση κράτησης"}
        </button>
      </div>
      {!rescheduleId && (
        <p className="muted">
          {props.needsApproval
            ? "Θα περιμένει έγκριση από την ομάδα."
            : "Θα προγραμματιστεί αμέσως."}
        </p>
      )}
    </form>
  );
}
