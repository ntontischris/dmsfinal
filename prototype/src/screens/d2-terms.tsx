"use client";

import {
  DEFAULT_TERMS,
  STANDARD_DISCOUNT,
  type Renewal,
  type Terms,
  type UnusedProvisions,
} from "@/data/agreements";
import { endOfDuration } from "@/screens/d2-model";
import {
  FilmingTerms,
  MilestoneTerms,
  RevisionLimitTerms,
} from "@/screens/d2-terms-more";
import { TermRow, termsSetter } from "@/screens/d2-term-row";
import { NumberInput, type SectionProps } from "@/screens/d2-ui";
import { fmtDate, fmtMoney } from "@/screens/shared";

export const UNUSED_TEXT: Readonly<Record<UnusedProvisions, string>> = {
  χάνονται: "Χάνονται στο τέλος κάθε Περιόδου",
  "επόμενη Περίοδο": "Περνούν στην επόμενη Περίοδο",
  μαζεύονται: "Μαζεύονται ως τη λήξη",
};
const RENEWAL_TEXT: Readonly<Record<Renewal, string>> = {
  "νέα Ευκαιρία": "Στη λήξη ανοίγει νέα Ευκαιρία «ανανέωση»",
  "αυτόματη συνέχιση": "Αυτόματη συνέχιση για άλλη μία Διάρκεια",
};
const dissolutionText = ({ noticeDays, fee }: Terms["dissolution"]): string =>
  `Ειδοποίηση ${noticeDays} μέρες πριν · ${fee > 0 ? `ρήτρα ${fmtMoney(fee)}` : "χωρίς ρήτρα"}`;
const discountText = ({
  percent,
  months,
}: Terms["firstMonthsDiscount"]): string =>
  percent > 0 && months > 0
    ? `${percent}% τους πρώτους ${months} μήνες`
    : "Καμία";

function DurationTerms(props: SectionProps) {
  const { draft, update } = props;
  const base = DEFAULT_TERMS[draft.kind];
  const setTerms = termsSetter(props);
  const months = draft.terms.durationMonths ?? 6;
  const setDuration = (durationMonths: number) =>
    update((d) => ({
      ...d,
      terms: { ...d.terms, durationMonths },
      end: d.start ? endOfDuration(d.start, durationMonths) : d.end,
    }));
  const renewal = draft.terms.renewal ?? "νέα Ευκαιρία";
  return (
    <>
      <TermRow
        id="t-duration"
        label="Διάρκεια"
        props={props}
        text={`${months} μήνες`}
        defaultText={`${base.durationMonths ?? 6} μήνες`}
        input={
          <NumberInput
            id="t-duration"
            value={months}
            min={1}
            onChange={setDuration}
            suffix="μήνες"
          />
        }
      />
      <TermRow
        id="t-renewal"
        label="Ανανέωση"
        props={props}
        text={RENEWAL_TEXT[renewal]}
        defaultText={RENEWAL_TEXT[base.renewal ?? "νέα Ευκαιρία"]}
        input={
          <select
            id="t-renewal"
            className="select"
            value={renewal}
            onChange={(e) => setTerms({ renewal: e.target.value as Renewal })}
          >
            <option value="νέα Ευκαιρία">νέα Ευκαιρία</option>
            <option value="αυτόματη συνέχιση">αυτόματη συνέχιση</option>
          </select>
        }
      />
    </>
  );
}

function MoneyTerms(props: SectionProps) {
  const { terms, kind } = props.draft;
  const base = DEFAULT_TERMS[kind];
  const setTerms = termsSetter(props);
  return (
    <>
      <TermRow
        id="t-pay"
        label="Μέρες πληρωμής"
        props={props}
        text={`${terms.paymentDays} μέρες από το Τιμολόγιο`}
        defaultText={`${base.paymentDays} μέρες από το Τιμολόγιο`}
        input={
          <NumberInput
            id="t-pay"
            value={terms.paymentDays}
            onChange={(paymentDays) => setTerms({ paymentDays })}
            suffix="μέρες"
          />
        }
      />
      <TermRow
        id="t-diss"
        label="Ρήτρα λύσης"
        props={props}
        text={dissolutionText(terms.dissolution)}
        defaultText={dissolutionText(base.dissolution)}
        input={
          <span className="btn-row">
            <NumberInput
              label="Ειδοποίηση λύσης σε μέρες"
              value={terms.dissolution.noticeDays}
              onChange={(noticeDays) =>
                setTerms({ dissolution: { ...terms.dissolution, noticeDays } })
              }
              suffix="μέρες ειδοποίηση"
            />
            <NumberInput
              label="Ποσό ρήτρας"
              value={terms.dissolution.fee}
              step={50}
              onChange={(fee) =>
                setTerms({ dissolution: { ...terms.dissolution, fee } })
              }
              suffix="€"
            />
          </span>
        }
      />
      {kind === "μηνιαία" && (
        <TermRow
          id="t-disc"
          label="Έκπτωση πρώτων μηνών"
          props={props}
          text={discountText(terms.firstMonthsDiscount)}
          defaultText={discountText(base.firstMonthsDiscount)}
          extraHint={
            props.isEditing
              ? `τυπική: ${STANDARD_DISCOUNT.percent}% για ${STANDARD_DISCOUNT.months} μήνες, πάνω από αυτήν είναι Παρέκκλιση`
              : undefined
          }
          input={
            <span className="btn-row">
              <NumberInput
                label="Ποσοστό έκπτωσης"
                value={terms.firstMonthsDiscount.percent}
                max={100}
                onChange={(percent) =>
                  setTerms({
                    firstMonthsDiscount: {
                      ...terms.firstMonthsDiscount,
                      percent,
                    },
                  })
                }
                suffix="%"
              />
              <NumberInput
                label="Μήνες έκπτωσης"
                value={terms.firstMonthsDiscount.months}
                onChange={(months) =>
                  setTerms({
                    firstMonthsDiscount: {
                      ...terms.firstMonthsDiscount,
                      months,
                    },
                  })
                }
                suffix="μήνες"
              />
            </span>
          }
        />
      )}
    </>
  );
}

function ProvisionTerms(props: SectionProps) {
  const { terms, kind } = props.draft;
  const base = DEFAULT_TERMS[kind];
  const setTerms = termsSetter(props);
  return (
    <>
      <TermRow
        id="t-unused"
        label="Αχρησιμοποίητες Παροχές"
        props={props}
        text={UNUSED_TEXT[terms.unusedProvisions]}
        defaultText={UNUSED_TEXT[base.unusedProvisions]}
        input={
          <select
            id="t-unused"
            className="select"
            value={terms.unusedProvisions}
            onChange={(e) =>
              setTerms({ unusedProvisions: e.target.value as UnusedProvisions })
            }
          >
            {(Object.keys(UNUSED_TEXT) as UnusedProvisions[]).map((option) => (
              <option key={option} value={option}>
                {UNUSED_TEXT[option]}
              </option>
            ))}
          </select>
        }
      />
      <TermRow
        id="t-grace"
        label="Περίοδος χάριτος"
        props={props}
        text={`${terms.graceDays} μέρες`}
        defaultText={`${base.graceDays} μέρες`}
        input={
          <NumberInput
            id="t-grace"
            value={terms.graceDays}
            onChange={(graceDays) => setTerms({ graceDays })}
            suffix="μέρες"
          />
        }
      />
    </>
  );
}

export function TermsSection(props: SectionProps) {
  const { draft } = props;
  const isSigned = draft.state !== "πρόταση" && draft.signature;
  return (
    <section className="card">
      <h2>Όροι</h2>
      {isSigned && draft.signature && (
        <p className="note">
          Οι όροι πάγωσαν με την υπογραφή στις {fmtDate(draft.signature.when)}.
        </p>
      )}
      <dl className="dl">
        <MoneyTerms {...props} />
        <ProvisionTerms {...props} />
        {draft.kind === "μηνιαία" && <DurationTerms {...props} />}
        <FilmingTerms {...props} />
        <RevisionLimitTerms {...props} />
      </dl>
      {draft.kind === "εφάπαξ" && <MilestoneTerms {...props} />}
    </section>
  );
}
