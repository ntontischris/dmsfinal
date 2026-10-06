"use client";

import { useState } from "react";

import { findAgreement } from "@/data/agreements";
import { PERSON_OF_ROLE, personName, type Filming } from "@/data/filming";
import { productionOf, type FilmingCaps } from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import {
  TODAY,
  actorOf,
  hoursLabel,
  liveBalance,
  termsOf,
  withFilming,
  withLog,
  type Live,
  type UpdateLive,
} from "@/screens/e3-model";
import { ReasonForm } from "@/screens/e3-ui";

interface ActionsProps {
  role: RoleId;
  caps: FilmingCaps;
  live: Live;
  initial: Filming;
  update: UpdateLive;
}

type Form = "reject" | "cancel" | "undo" | "done" | "noshow" | null;

const billableOf = (filming: Filming, initial: Filming): string => {
  const balance = liveBalance(initial, filming);
  const agreement = findAgreement(productionOf(filming)?.agreementId);
  const hasMilestone = agreement?.terms.milestones.some(
    (milestone) => milestone.trigger === "Γύρισμα έγινε",
  );
  if (balance && balance.left < 0)
    return "Τιμολογητέο γεννήθηκε: έξτρα Γύρισμα πέρα από τις Παροχές.";
  if (hasMilestone)
    return "Τιμολογητέο γεννήθηκε: ορόσημο «Γύρισμα έγινε» της εφάπαξ Συμφωνίας.";
  return "Δεν γεννήθηκε Τιμολογητέο: το Γύρισμα ήταν μέσα στις Παροχές.";
};

interface DoneFormProps extends ActionsProps {
  onClose: () => void;
}

function DoneForm({
  role,
  caps,
  live,
  initial,
  update,
  onClose,
}: DoneFormProps) {
  const [hours, setHours] = useState(String(live.filming.hours));
  const crewCount = live.filming.crew.length;
  const me = PERSON_OF_ROLE[role] ?? "";
  const people = Math.max(crewCount, 1);
  const actual = Number(hours.replace(",", "."));
  const isValid = Number.isFinite(actual) && actual > 0;

  const confirm = () => {
    update((current) => {
      const crew =
        current.filming.crew.length > 0
          ? current.filming.crew
          : [{ personId: me, response: "επιβεβαιώνω" as const }];
      const done = withFilming(current, {
        state: "έγινε",
        crew,
        outcome: { by: actorOf(role), when: TODAY, actualHours: actual },
      });
      const billable = billableOf(done.filming, initial);
      return withLog(
        { ...done, billable },
        `Σημειώθηκε «έγινε» (${hoursLabel(actual)}). Η Παροχή καταναλώθηκε. ${billable}`,
      );
    });
    onClose();
  };

  return (
    <div className="stack e3-form">
      <label>
        Πραγματική διάρκεια (ώρες)
        <input
          className="input"
          inputMode="decimal"
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />
      </label>
      <p className="muted">
        Άτομα συνεργείου: {people}
        {crewCount === 0 &&
          ` (δεν υπάρχει Συνεργείο· προτείνεται όποιος το σημειώνει: ${personName(me)})`}
      </p>
      {caps.canSeeHours && isValid && (
        <p className="note">
          Πρόταση Πραγματικών ωρών γυρίσματος: {hoursLabel(actual)} × {people}{" "}
          άτομα = {actual * people} ώρες. Τις επιβεβαιώνει ο Ιδιοκτήτης στην
          Παραγωγή.
        </p>
      )}
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!isValid}
          onClick={confirm}
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

export function E3Actions(props: ActionsProps) {
  const { role, caps, live, initial, update } = props;
  const [form, setForm] = useState<Form>(null);
  const f = live.filming;
  const terms = termsOf(initial);
  const close = () => setForm(null);
  const actor = actorOf(role);
  const canCancel = caps.canCancel || caps.canApprove;
  const isOpenState =
    f.state === "προγραμματισμένο" || f.state === "αναμένει έγκριση";

  const approve = () =>
    update((l) =>
      withLog(
        withFilming(l, {
          state: "προγραμματισμένο",
          approval: { by: actor, when: TODAY },
        }),
        "Εγκρίθηκε. Ο πελάτης ενημερώθηκε με email.",
      ),
    );
  const reject = (reason: string) => {
    update((l) =>
      withLog(
        withFilming(l, {
          state: "απορρίφθηκε",
          rejection: { by: actor, when: TODAY, reason },
        }),
        `Απορρίφθηκε: ${reason}. Η Παροχή επέστρεψε.`,
      ),
    );
    close();
  };
  const cancel = (reason: string) => {
    update((l) =>
      withLog(
        withFilming(l, {
          state: "ακυρώθηκε",
          cancellation: {
            by: actor,
            when: TODAY,
            reason,
            side: "ομάδα",
            burns: false,
          },
        }),
        `Ακυρώθηκε από την ομάδα: ${reason}. Η Παροχή επέστρεψε.`,
      ),
    );
    close();
  };
  const noShow = () => {
    update((l) =>
      withLog(
        withFilming(l, {
          state: "δεν έγινε",
          outcome: { by: actor, when: TODAY },
        }),
        `Σημειώθηκε «δεν έγινε». ${terms.noShowBurns ? "Η Παροχή κάηκε." : "Η Παροχή επέστρεψε."}`,
      ),
    );
    close();
  };
  const acceptRequest = () =>
    update((l) =>
      withLog(
        withFilming(l, {
          state: "ακυρώθηκε",
          cancelRequest: undefined,
          cancellation: {
            by: l.filming.cancelRequest?.by ?? "Πελάτης",
            when: TODAY,
            reason: l.filming.cancelRequest?.reason ?? "",
            side: "πελάτης",
            burns: terms.lateCancelBurns,
          },
        }),
        `Δεκτό το αίτημα ακύρωσης. ${terms.lateCancelBurns ? "Η Παροχή κάηκε (εκπρόθεσμη ακύρωση)." : "Η Παροχή επέστρεψε."}`,
      ),
    );
  const refuseRequest = () =>
    update((l) =>
      withLog(
        withFilming(l, { cancelRequest: undefined }),
        "Αρνήθηκες το αίτημα ακύρωσης· το Γύρισμα μένει.",
      ),
    );
  const undo = (reason: string) => {
    update((l) =>
      withLog(
        {
          ...withFilming(l, { state: "προγραμματισμένο", outcome: undefined }),
          billable: null,
        },
        `Αναίρεση: ${reason}. Το Γύρισμα ξαναγίνεται προγραμματισμένο. Το Τιμολογητέο σβήνεται αν δεν έχει τιμολογηθεί, αλλιώς διορθώνεται με πιστωτικό.`,
      ),
    );
    close();
  };
  const approveReschedule = () =>
    update((l) =>
      l.reschedule
        ? withLog(
            {
              ...withFilming(l, {
                date: l.reschedule.date,
                start: l.reschedule.start,
              }),
              reschedule: null,
            },
            "Εγκρίθηκε η μετάθεση· η παλιά ώρα αφέθηκε. Αν είχε σταλεί Δελτίο, θέλει νέα έκδοση.",
          )
        : l,
    );
  const rejectReschedule = () =>
    update((l) =>
      withLog(
        { ...l, reschedule: null },
        "Απορρίφθηκε η μετάθεση· το Γύρισμα μένει στην παλιά ώρα.",
      ),
    );

  return (
    <section className="card">
      <div className="card-title">
        <h2>Ενέργειες</h2>
      </div>
      {f.state === "αναμένει έγκριση" && caps.canApprove && form === null && (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={approve}
          >
            Έγκριση
          </button>
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setForm("reject")}
          >
            Απόρριψη
          </button>
        </div>
      )}
      {form === "reject" && (
        <ReasonForm
          label="Λόγος απόρριψης"
          confirmLabel="Απόρριψη"
          isDanger
          onConfirm={reject}
          onClose={close}
        />
      )}
      {f.state === "αναμένει έγκριση" && !caps.canApprove && (
        <p className="muted">Περιμένει έγκριση από τη Διαχείριση.</p>
      )}

      {f.state === "προγραμματισμένο" &&
        form === null &&
        caps.canMarkOutcome && (
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              onClick={() => setForm("done")}
            >
              Έγινε
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setForm("noshow")}
            >
              Δεν έγινε
            </button>
          </div>
        )}
      {form === "done" && <DoneForm {...props} onClose={close} />}
      {form === "noshow" && (
        <div className="stack">
          <p className="note">
            Ο πελάτης δεν εμφανίστηκε. Κατά τους Όρους Συμφωνίας η Παροχή{" "}
            {terms.noShowBurns ? "καίγεται" : "επιστρέφει"}.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-danger="true"
              onClick={noShow}
            >
              Επιβεβαίωση «δεν έγινε»
            </button>
            <button type="button" className="button" onClick={close}>
              Άκυρο
            </button>
          </div>
        </div>
      )}

      {live.reschedule && caps.canApprove && (
        <div className="stack">
          <p className="note">
            Ο πελάτης ζητά μετάθεση στις {live.reschedule.date}{" "}
            {live.reschedule.start}. Η παλιά ώρα κρατιέται μέχρι την απάντηση· η
            Παροχή μένει μία.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              onClick={approveReschedule}
            >
              Έγκριση μετάθεσης
            </button>
            <button type="button" className="button" onClick={rejectReschedule}>
              Απόρριψη μετάθεσης
            </button>
          </div>
        </div>
      )}

      {f.cancelRequest && caps.canApprove && (
        <div className="stack">
          <p className="note">
            Αίτημα ακύρωσης από {f.cancelRequest.by}: «{f.cancelRequest.reason}
            ». Αν το δεχτείς, η Παροχή{" "}
            {terms.lateCancelBurns ? "καίγεται" : "επιστρέφει"} (εκπρόθεσμη
            ακύρωση, Όριο {terms.cancelHours} ώρες).
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-danger="true"
              onClick={acceptRequest}
            >
              Δέχομαι
            </button>
            <button type="button" className="button" onClick={refuseRequest}>
              Αρνούμαι
            </button>
          </div>
        </div>
      )}
      {f.cancelRequest && !caps.canApprove && (
        <p className="muted">
          Υπάρχει αίτημα ακύρωσης από τον πελάτη· το αποφασίζει η Διαχείριση.
        </p>
      )}

      {isOpenState && canCancel && form === null && (
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
          onConfirm={cancel}
          onClose={close}
        />
      )}

      {(f.state === "έγινε" || f.state === "δεν έγινε") &&
        caps.canApprove &&
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
          onConfirm={undo}
          onClose={close}
        />
      )}
      {(f.state === "ακυρώθηκε" || f.state === "απορρίφθηκε") && (
        <p className="muted">Το Γύρισμα είναι τελικό.</p>
      )}
      {live.billable && <p className="note">{live.billable}</p>}
    </section>
  );
}
