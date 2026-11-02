"use client";

import { useKeptForm } from "@/lib/use-kept-form";

import { createGdprRequest } from "../actions";
import { KIND_LABEL, SUBJECT_KIND_LABEL } from "../labels";
import { GDPR_KINDS, subjectRef, type GdprSubjects } from "../schemas";

// Οι επιλογές του «Ποιον αφορά», ανά είδος υποκειμένου.
const subjectGroups = (subjects: GdprSubjects) => [
  {
    label: SUBJECT_KIND_LABEL.team_user,
    options: subjects.teamUsers.map((user) => ({
      value: subjectRef("team_user", user.id),
      text: `${SUBJECT_KIND_LABEL.team_user}: ${user.name}`,
    })),
  },
  {
    label: SUBJECT_KIND_LABEL.client_user,
    options: subjects.clientUsers.map((user) => ({
      value: subjectRef("client_user", user.id),
      text: `${SUBJECT_KIND_LABEL.client_user}: ${user.name}`,
    })),
  },
  {
    label: SUBJECT_KIND_LABEL.contact,
    options: subjects.clients.map((client) => ({
      value: subjectRef("contact", client.id),
      text: `${SUBJECT_KIND_LABEL.contact}: ${client.contactName} (${client.name})`,
    })),
  },
  {
    label: SUBJECT_KIND_LABEL.client,
    options: subjects.clients.map((client) => ({
      value: subjectRef("client", client.id),
      text: `${SUBJECT_KIND_LABEL.client}: ${client.name}`,
    })),
  },
];

// Καταγραφή αιτήματος (createGdprRequest), στο ύφος των φορμών της N1. Η προθεσμία υπολογίζεται στη βάση.
export function RequestForm({ subjects }: { subjects: GdprSubjects }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    createGdprRequest,
    { resetOnSuccess: true },
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} className="n1-form">
      <div className="n1-field">
        <label htmlFor="gdpr-kind">Είδος</label>
        <select
          id="gdpr-kind"
          className="input"
          name="kind"
          defaultValue="export"
        >
          {GDPR_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>
      <div className="n1-field">
        <label htmlFor="gdpr-subject">Ποιον αφορά</label>
        <select
          id="gdpr-subject"
          className="input"
          name="subject"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Διάλεξε πρόσωπο ή Πελάτη
          </option>
          {subjectGroups(subjects).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="n1-field">
        <label htmlFor="gdpr-received">Ημερομηνία λήψης</label>
        <input
          id="gdpr-received"
          className="input"
          name="receivedOn"
          type="date"
        />
        <p className="muted">
          Κενό = σήμερα. Η προθεσμία είναι 1 μήνας από τη λήψη.
        </p>
      </div>
      <div className="n1-field">
        <label htmlFor="gdpr-note">Σημείωση</label>
        <input
          id="gdpr-note"
          className="input"
          name="note"
          maxLength={1000}
          autoComplete="off"
        />
      </div>
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary
          disabled={isPending}
        >
          {isPending ? "Καταγραφή…" : "Καταγραφή αιτήματος"}
        </button>
        {(state.error || state.notice) && (
          <p className="note" role={state.error ? "alert" : "status"}>
            {state.error ?? state.notice}
          </p>
        )}
      </div>
    </form>
  );
}
