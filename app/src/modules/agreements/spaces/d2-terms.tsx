"use client";

import { Panel } from "@/spaces/kit/panel";

import { setMoneyTerms, updateTerms } from "../actions-draft";
import { formatDate } from "../helpers";
import { AUTO_RENEWAL_NOTE } from "../labels";
import type { AgreementDetail, Renewal, UnusedProvisions } from "../types";
import { FilmingRows, changedHint, days, type RowsProps } from "./d2-term-rows";
import { MoneyRows } from "./d2-terms-money";
import { MilestoneTerms, RevisionLimitTerms } from "./d2-terms-more";
import { D2Form, Field, IdField, NumberInput } from "./d2-ui";

// Οι Όροι της Συμφωνίας (prototype `screens/d2-terms.tsx`): πεδίο για όποιον γράφει την πρόταση, κείμενο για τους άλλους,
// και η προεπιλογή δίπλα όταν άλλαξε. Κάθε ομάδα πεδίων αποθηκεύεται με το δικό της πραγματικό action.


const UNUSED_TEXT: Readonly<Record<UnusedProvisions, string>> = {
  lost: "Χάνονται στο τέλος κάθε Περιόδου",
  next_period: "Περνούν στην επόμενη Περίοδο",
  accumulate: "Μαζεύονται ως τη λήξη",
};
const RENEWAL_TEXT: Readonly<Record<Renewal, string>> = {
  new_opportunity: "Στη λήξη ανοίγει νέα Ευκαιρία «ανανέωση»",
  auto: "Αυτόματη συνέχιση για άλλη μία Διάρκεια",
};

function MonthlyRows({ terms, baseline, isEditing }: RowsProps) {
  const renewal = terms.renewal ?? "new_opportunity";
  return (
    <>
      <Field
        id="t-unused"
        label="Αχρησιμοποίητες Παροχές"
        isEditing={isEditing}
        value={UNUSED_TEXT[terms.unusedProvisions]}
        hint={changedHint(
          baseline,
          (b) => b.unusedProvisions,
          terms.unusedProvisions,
          (v) => UNUSED_TEXT[v],
        )}
        input={
          <select
            id="t-unused"
            className="select"
            name="unusedProvisions"
            defaultValue={terms.unusedProvisions}
          >
            {(Object.keys(UNUSED_TEXT) as UnusedProvisions[]).map((code) => (
              <option key={code} value={code}>
                {UNUSED_TEXT[code]}
              </option>
            ))}
          </select>
        }
      />
      <Field
        id="t-grace"
        label="Περίοδος χάριτος"
        isEditing={isEditing}
        value={days(terms.graceDays)}
        hint={changedHint(baseline, (b) => b.graceDays, terms.graceDays, days)}
        input={
          <NumberInput
            id="t-grace"
            name="graceDays"
            defaultValue={String(terms.graceDays)}
            suffix="μέρες"
          />
        }
      />
      <Field
        id="t-renewal"
        label="Ανανέωση"
        isEditing={isEditing}
        value={RENEWAL_TEXT[renewal]}
        hint={renewal === "auto" ? AUTO_RENEWAL_NOTE : undefined}
        input={
          <select
            id="t-renewal"
            className="select"
            name="renewal"
            defaultValue={renewal}
          >
            {(Object.keys(RENEWAL_TEXT) as Renewal[]).map((code) => (
              <option key={code} value={code}>
                {RENEWAL_TEXT[code]}
              </option>
            ))}
          </select>
        }
      />
      <Field
        id="t-diss"
        label="Ειδοποίηση λύσης"
        isEditing={isEditing}
        value={`${days(terms.dissolutionNoticeDays)} πριν`}
        hint={changedHint(
          baseline,
          (b) => b.dissolutionNoticeDays,
          terms.dissolutionNoticeDays,
          days,
        )}
        input={
          <NumberInput
            id="t-diss"
            name="dissolutionNoticeDays"
            defaultValue={String(terms.dissolutionNoticeDays)}
            suffix="μέρες"
          />
        }
      />
    </>
  );
}

export function TermsRows(props: RowsProps) {
  const { terms, baseline, isEditing, isMonthly } = props;
  return (
    <dl className="dl">
      <Field
        id="t-pay"
        label="Μέρες πληρωμής"
        isEditing={isEditing}
        value={`${days(terms.paymentDays)} από το Τιμολόγιο`}
        hint={changedHint(
          baseline,
          (b) => b.paymentDays,
          terms.paymentDays,
          days,
        )}
        input={
          <NumberInput
            id="t-pay"
            name="paymentDays"
            defaultValue={String(terms.paymentDays)}
            suffix="μέρες"
          />
        }
      />
      {isMonthly && <MonthlyRows {...props} />}
      <FilmingRows {...props} />
    </dl>
  );
}

export function TermsSection({ agreement }: { agreement: AgreementDetail }) {
  const { can, terms, baseline, moneyTerms, signature } = agreement;
  const isMonthly = agreement.kind === "monthly";
  const rows = { terms, baseline, isMonthly, isEditing: can.edit };
  const canEditMoney = can.edit && can.editPrices;
  return (
    <Panel label="Όροι">
      {agreement.state !== "proposal" && signature && (
        <p className="note">
          Οι όροι πάγωσαν με την υπογραφή στις {formatDate(signature.signedOn)}.
        </p>
      )}
      {can.edit ? (
        <D2Form action={updateTerms} submitLabel="Αποθήκευση όρων">
          <IdField id={agreement.id} />
          <input
            type="hidden"
            name="kind"
            value={isMonthly ? "monthly" : "one_off"}
          />
          <TermsRows {...rows} />
        </D2Form>
      ) : (
        <TermsRows {...rows} />
      )}
      {isMonthly &&
        moneyTerms !== null &&
        (canEditMoney ? (
          <D2Form action={setMoneyTerms} submitLabel="Αποθήκευση έκπτωσης">
            <IdField id={agreement.id} />
            <MoneyRows money={moneyTerms} baseline={baseline} isEditing />
          </D2Form>
        ) : (
          <MoneyRows money={moneyTerms} baseline={baseline} isEditing={false} />
        ))}
      {agreement.revisionLimits.length > 0 && (
        <RevisionLimitTerms agreement={agreement} />
      )}
      {!isMonthly && <MilestoneTerms agreement={agreement} />}
      {can.edit && (
        <p className="muted">
          Ό,τι είναι πιο χαλαρό από την προεπιλογή γράφεται ως Παρέκκλιση και
          θέλει Έγκριση.
        </p>
      )}
    </Panel>
  );
}
