"use client";

import {
  DEFAULT_TERMS,
  type Milestone,
  type MilestoneTrigger,
  type Terms,
} from "@/data/agreements";
import {
  PROVISION_KINDS,
  provisionKind,
  type ProvisionKindId,
} from "@/data/catalogue";
import { TODAY } from "@/data/sales";
import { TermRow, termsSetter } from "@/screens/d2-term-row";
import { NumberInput, type SectionProps } from "@/screens/d2-ui";
import { Badge, fmtDate } from "@/screens/shared";

const yesNo = (value: boolean, yes: string, no: string): string =>
  value ? yes : no;

export function FilmingTerms(props: SectionProps) {
  const { terms, kind } = props.draft;
  const base = DEFAULT_TERMS[kind].filming;
  const filming = terms.filming;
  const setTerms = termsSetter(props);
  const setFilming = (change: Partial<Terms["filming"]>) =>
    setTerms({ filming: { ...filming, ...change } });
  const lateText = (v: boolean) =>
    yesNo(v, "Η αργή ακύρωση καίει Παροχή", "Η αργή ακύρωση δεν καίει Παροχή");
  const noShowText = (v: boolean) =>
    yesNo(v, "Το «δεν έγινε» καίει Παροχή", "Το «δεν έγινε» δεν καίει Παροχή");
  return (
    <>
      <TermRow
        id="t-fnotice"
        label="Γυρίσματα: προειδοποίηση"
        props={props}
        text={`Κράτηση τουλάχιστον ${filming.noticeDays * 24} ώρες πριν`}
        defaultText={`Κράτηση τουλάχιστον ${base.noticeDays * 24} ώρες πριν`}
        input={
          <NumberInput
            id="t-fnotice"
            value={filming.noticeDays * 24}
            onChange={(hours) => setFilming({ noticeDays: hours / 24 })}
            suffix="ώρες"
          />
        }
      />
      <TermRow
        id="t-fcancel"
        label="Γυρίσματα: όριο ακύρωσης"
        props={props}
        text={`Ακύρωση έως ${filming.cancelHours} ώρες πριν`}
        defaultText={`Ακύρωση έως ${base.cancelHours} ώρες πριν`}
        input={
          <NumberInput
            id="t-fcancel"
            value={filming.cancelHours}
            onChange={(cancelHours) => setFilming({ cancelHours })}
            suffix="ώρες"
          />
        }
      />
      <TermRow
        id="t-flate"
        label="Γυρίσματα: αργή ακύρωση"
        props={props}
        text={lateText(filming.lateCancelBurns)}
        defaultText={lateText(base.lateCancelBurns)}
        input={
          <label>
            <input
              id="t-flate"
              type="checkbox"
              checked={filming.lateCancelBurns}
              onChange={(e) =>
                setFilming({ lateCancelBurns: e.target.checked })
              }
            />{" "}
            η αργή ακύρωση καίει Παροχή
          </label>
        }
      />
      <TermRow
        id="t-fnoshow"
        label="Γυρίσματα: «δεν έγινε»"
        props={props}
        text={noShowText(filming.noShowBurns)}
        defaultText={noShowText(base.noShowBurns)}
        input={
          <label>
            <input
              id="t-fnoshow"
              type="checkbox"
              checked={filming.noShowBurns}
              onChange={(e) => setFilming({ noShowBurns: e.target.checked })}
            />{" "}
            το «δεν έγινε» καίει Παροχή
          </label>
        }
      />
    </>
  );
}

const limitKinds = (terms: Terms): readonly ProvisionKindId[] =>
  PROVISION_KINDS.map((k) => k.id).filter(
    (id) => terms.revisionLimit[id] !== undefined,
  );
const limitText = (terms: Terms): string =>
  limitKinds(terms)
    .map((id) => `${provisionKind(id).unit}: ${terms.revisionLimit[id]} γύροι`)
    .join(" · ") || "—";

export function RevisionLimitTerms(props: SectionProps) {
  const { terms, kind } = props.draft;
  const setTerms = termsSetter(props);
  const setLimit = (id: ProvisionKindId, value: number) =>
    setTerms({ revisionLimit: { ...terms.revisionLimit, [id]: value } });
  return (
    <TermRow
      id="t-limit"
      label="Όριο αλλαγών"
      props={props}
      text={limitText(terms)}
      defaultText={limitText(DEFAULT_TERMS[kind])}
      input={
        <span className="stack">
          {limitKinds(terms).map((id) => (
            <NumberInput
              key={id}
              label={`Όριο αλλαγών ${provisionKind(id).unit}`}
              value={terms.revisionLimit[id] ?? 0}
              onChange={(value) => setLimit(id, value)}
              suffix={`γύροι · ${provisionKind(id).unit}`}
            />
          ))}
        </span>
      }
    />
  );
}

const TRIGGERS: readonly MilestoneTrigger[] = [
  "υπογραφή",
  "ημερομηνία",
  "Γύρισμα έγινε",
  "Παραγωγή παραδόθηκε",
];
const TRIGGER_TEXT: Readonly<Record<MilestoneTrigger, string>> = {
  υπογραφή: "με την υπογραφή",
  ημερομηνία: "στην ημερομηνία",
  "Γύρισμα έγινε": "όταν γίνει το Γύρισμα",
  "Παραγωγή παραδόθηκε": "όταν παραδοθεί η Παραγωγή",
};
const milestoneText = (m: Milestone): string =>
  `${m.percent}% ${TRIGGER_TEXT[m.trigger]}${m.trigger === "ημερομηνία" && m.date ? ` ${fmtDate(m.date)}` : ""}`;

function MilestoneRow({
  milestone,
  isEditing,
  onChange,
  onRemove,
}: {
  milestone: Milestone;
  isEditing: boolean;
  onChange: (m: Milestone) => void;
  onRemove: () => void;
}) {
  if (!isEditing) return <li>{milestoneText(milestone)}</li>;
  return (
    <li className="btn-row">
      <NumberInput
        label="Ποσοστό δόσης"
        value={milestone.percent}
        max={100}
        onChange={(percent) => onChange({ ...milestone, percent })}
        suffix="%"
      />
      <select
        className="select"
        aria-label="Ορόσημο"
        value={milestone.trigger}
        onChange={(e) =>
          onChange({
            ...milestone,
            trigger: e.target.value as MilestoneTrigger,
            date:
              e.target.value === "ημερομηνία"
                ? (milestone.date ?? TODAY)
                : undefined,
          })
        }
      >
        {TRIGGERS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {milestone.trigger === "ημερομηνία" && (
        <input
          className="input"
          type="date"
          aria-label="Ημερομηνία δόσης"
          value={milestone.date ?? TODAY}
          onChange={(e) => onChange({ ...milestone, date: e.target.value })}
        />
      )}
      <button
        type="button"
        className="button"
        aria-label="Αφαίρεση δόσης"
        onClick={onRemove}
      >
        ×
      </button>
    </li>
  );
}

// Δόσεις σε ορόσημα: μόνο στην εφάπαξ. Πρέπει να κάνουν 100%.
export function MilestoneTerms(props: SectionProps) {
  const { draft, isEditing } = props;
  const milestones = draft.terms.milestones;
  const setTerms = termsSetter(props);
  const sum = milestones.reduce((total, m) => total + m.percent, 0);
  const setAt = (index: number, next: Milestone) =>
    setTerms({
      milestones: milestones.map((m, i) => (i === index ? next : m)),
    });
  return (
    <>
      <h3>Δόσεις σε ορόσημα</h3>
      <ul className="list">
        {milestones.map((milestone, index) => (
          <MilestoneRow
            key={index}
            milestone={milestone}
            isEditing={isEditing}
            onChange={(m) => setAt(index, m)}
            onRemove={() =>
              setTerms({ milestones: milestones.filter((_, i) => i !== index) })
            }
          />
        ))}
      </ul>
      {isEditing && (
        <button
          type="button"
          className="button"
          onClick={() =>
            setTerms({
              milestones: [
                ...milestones,
                { trigger: "υπογραφή", percent: Math.max(0, 100 - sum) },
              ],
            })
          }
        >
          + Δόση
        </button>
      )}
      {sum !== 100 && (
        <p>
          <Badge tone="attention">Οι δόσεις κάνουν {sum}%, όχι 100%</Badge>
        </p>
      )}
    </>
  );
}
