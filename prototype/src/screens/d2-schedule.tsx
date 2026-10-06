"use client";

import {
  endOfTerm,
  isPartialPeriod,
  periodAmount,
  type AgreementRecord,
} from "@/data/agreements";
import { TODAY } from "@/data/sales";
import {
  addDays,
  periodSchedule,
  type ScheduledPeriod,
} from "@/screens/d2-model";
import { Field, type SectionProps } from "@/screens/d2-ui";
import { Badge, fmtDate, fmtMoney } from "@/screens/shared";

const range = (p: ScheduledPeriod): string =>
  `${fmtDate(p.starts)} – ${fmtDate(p.ends)}`;

// Έναρξη: κενή = «με την υπογραφή», ή μελλοντική ημερομηνία που ορίζει ο συντάκτης.
function StartInput({ draft, update }: SectionProps) {
  const months = draft.terms.durationMonths ?? 6;
  const endFor = (start: string | null) =>
    start && draft.kind === "μηνιαία" ? endOfTerm(start, months) : null;
  const setStart = (start: string | null) =>
    update((d) => ({ ...d, start, end: endFor(start) }));
  const withSignature = draft.start === null;
  return (
    <span className="stack">
      <label>
        <input
          type="checkbox"
          checked={withSignature}
          onChange={(e) =>
            setStart(e.target.checked ? null : addDays(TODAY, 14))
          }
        />{" "}
        με την υπογραφή
      </label>
      {!withSignature && (
        <input
          id="d2-start"
          className="input"
          type="date"
          min={TODAY}
          value={draft.start ?? ""}
          onChange={(e) => e.target.value && setStart(e.target.value)}
        />
      )}
    </span>
  );
}

function PreviewRow({
  draft,
  period,
  label,
  note,
}: {
  draft: AgreementRecord;
  period: ScheduledPeriod;
  label: string;
  note: string;
}) {
  return (
    <li>
      {range(period)} <Badge tone="attention">σπασμένη</Badge> {label} ·{" "}
      {fmtMoney(periodAmount(draft, period))}{" "}
      <span className="muted">· {note}</span>
    </li>
  );
}

// Προεπισκόπηση των Περιόδων: ημερολογιακοί μήνες, με σπασμένη πρώτη και τελευταία αν η έναρξη δεν είναι 1η.
function PeriodPreview({ draft }: { draft: AgreementRecord }) {
  const start = draft.start ?? TODAY;
  const periods = periodSchedule(
    start,
    endOfTerm(start, draft.terms.durationMonths ?? 6),
  );
  const first = periods[0];
  const last = periods.at(-1);
  const hasFirst = first !== undefined && isPartialPeriod(first);
  const hasLast = last !== undefined && last !== first && isPartialPeriod(last);
  const whole = periods.filter((p) => !isPartialPeriod(p));
  return (
    <>
      <h3>Περίοδοι</h3>
      {draft.start === null && (
        <p className="muted">Π.χ. αν υπογραφεί σήμερα, {fmtDate(TODAY)}:</p>
      )}
      <ul className="list">
        {hasFirst && (
          <PreviewRow
            draft={draft}
            period={first}
            label="πρώτη"
            note="ολόκληρες Παροχές"
          />
        )}
        {whole.length > 0 && (
          <li>
            {whole.length} ολόκληροι μήνες ({fmtDate(whole[0].starts)} –{" "}
            {fmtDate(whole[whole.length - 1].ends)}) ·{" "}
            {fmtMoney(periodAmount(draft, whole[0]))} τον μήνα
          </li>
        )}
        {hasLast && last && (
          <PreviewRow
            draft={draft}
            period={last}
            label="τελευταία"
            note="χωρίς νέες Παροχές· κλείνει ό,τι είναι ανοιχτό"
          />
        )}
      </ul>
      <p className="muted">
        Η σπασμένη Περίοδος χρεώνεται αναλογικά με τις μέρες. Αν η έναρξη είναι
        1η, καμία δεν είναι σπασμένη.
      </p>
    </>
  );
}

export function ScheduleSection(props: SectionProps) {
  const { draft, isEditing } = props;
  const isMonthly = draft.kind === "μηνιαία";
  const isProposal = draft.state === "πρόταση";
  const months = draft.terms.durationMonths ?? 6;
  const monthlyEnd =
    draft.end ?? (draft.start ? endOfTerm(draft.start, months) : null);
  return (
    <section className="card">
      <h2>Έναρξη και διάρκεια</h2>
      <dl className="dl">
        <Field
          id="d2-start"
          label="Έναρξη"
          isEditing={isEditing}
          value={draft.start ? fmtDate(draft.start) : "με την υπογραφή"}
          input={<StartInput {...props} />}
        />
        {isMonthly && (
          <>
            <dt>Διάρκεια</dt>
            <dd>{months} μήνες</dd>
            <dt>Λήξη</dt>
            <dd>
              {monthlyEnd
                ? fmtDate(monthlyEnd)
                : `${months} μήνες από την υπογραφή, μείον μία μέρα`}
            </dd>
          </>
        )}
        {!isMonthly && !isProposal && (
          <>
            <dt>Τέλος</dt>
            <dd>
              {draft.end ? fmtDate(draft.end) : "Όταν παραδοθεί η Παραγωγή"}
            </dd>
          </>
        )}
      </dl>
      {isProposal && (
        <p className="note">
          Αν η υπογραφή έρθει μετά την ημερομηνία έναρξης, η έναρξη γίνεται η
          μέρα της υπογραφής.
        </p>
      )}
      {isMonthly && isProposal && <PeriodPreview draft={draft} />}
    </section>
  );
}
