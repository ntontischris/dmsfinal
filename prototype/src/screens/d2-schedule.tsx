"use client";

import { endOfDuration, monthLabel } from "@/screens/d2-model";
import { Field, type SectionProps } from "@/screens/d2-ui";
import { fmtDate } from "@/screens/shared";

function MonthlySchedule({ draft, update, isEditing }: SectionProps) {
  const months = draft.terms.durationMonths ?? 6;
  const start = draft.start;
  const setStart = (month: string) => {
    if (!month) return;
    const iso = `${month}-01`;
    update((d) => ({ ...d, start: iso, end: endOfDuration(iso, months) }));
  };
  return (
    <>
      <dl className="dl">
        <Field
          id="d2-start"
          label="Έναρξη"
          isEditing={isEditing}
          value={start ? `${fmtDate(start)} (${monthLabel(start)})` : "—"}
          input={
            <input
              id="d2-start"
              className="input"
              type="month"
              value={start?.slice(0, 7) ?? ""}
              onChange={(event) => setStart(event.target.value)}
            />
          }
          hint={isEditing ? "Πάντα η 1η του μήνα." : undefined}
        />
        <dt>Διάρκεια</dt>
        <dd>{months} μήνες</dd>
        <dt>Λήξη</dt>
        <dd>{draft.end ? fmtDate(draft.end) : "—"}</dd>
      </dl>
      {draft.state === "πρόταση" && (
        <p className="note">
          Αν η υπογραφή έρθει μετά την έναρξη, η έναρξη πάει στην επόμενη 1η του
          μήνα.
        </p>
      )}
    </>
  );
}

function OneOffSchedule({ draft }: SectionProps) {
  if (draft.state === "πρόταση")
    return <p className="muted">Ξεκινά με την υπογραφή.</p>;
  return (
    <dl className="dl">
      <dt>Έναρξη</dt>
      <dd>{draft.start ? fmtDate(draft.start) : "—"}</dd>
      <dt>Τέλος</dt>
      <dd>{draft.end ? fmtDate(draft.end) : "Όταν παραδοθεί η Παραγωγή"}</dd>
    </dl>
  );
}

export function ScheduleSection(props: SectionProps) {
  return (
    <section className="card">
      <h2>Έναρξη και διάρκεια</h2>
      {props.draft.kind === "μηνιαία" ? (
        <MonthlySchedule {...props} />
      ) : (
        <OneOffSchedule {...props} />
      )}
    </section>
  );
}
