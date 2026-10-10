import { Input } from "@/components/ui/field";

import { setMoneyTerms } from "../actions-draft";
import { formatMoney, formatNumber } from "../helpers";
import { RENEWAL_LABELS, UNUSED_LABELS } from "../labels";
import type { AgreementDetail } from "../types";

import { ActionForm } from "./action-form";
import {
  FieldGrid,
  FieldWithHint,
  ReadOnlyList,
  ReadOnlyRow,
  decimalInput,
  moneyInput,
  plural,
  yesNo,
} from "./terms-section-parts";

// Τα κομμάτια της ενότητας «Όροι» που δεν είναι η κύρια φόρμα: η ανάγνωση και η έκπτωση με τη ρήτρα λύσης.

export type Terms = AgreementDetail["terms"];
export type Baseline = AgreementDetail["baseline"];

export const numberInput = (name: string, value: number | null) => (
  <Input
    name={name}
    inputMode="numeric"
    autoComplete="off"
    defaultValue={value === null ? "" : String(value)}
  />
);

export function TermsReadOnly({
  terms,
  isMonthly,
}: {
  terms: Terms;
  isMonthly: boolean;
}) {
  return (
    <ReadOnlyList>
      <ReadOnlyRow label="Μέρες πληρωμής">{terms.paymentDays}</ReadOnlyRow>
      {isMonthly && (
        <>
          <ReadOnlyRow label="Αχρησιμοποίητες Παροχές">
            {UNUSED_LABELS[terms.unusedProvisions]}
          </ReadOnlyRow>
          <ReadOnlyRow label="Περίοδος χάριτος">
            {plural(terms.graceDays, "μέρα", "μέρες")}
          </ReadOnlyRow>
          <ReadOnlyRow label="Ανανέωση">
            {terms.renewal === null ? "—" : RENEWAL_LABELS[terms.renewal]}
          </ReadOnlyRow>
          <ReadOnlyRow label="Ειδοποίηση λύσης">
            {plural(terms.dissolutionNoticeDays, "μέρα", "μέρες")}
          </ReadOnlyRow>
        </>
      )}
      <ReadOnlyRow label="Ελάχιστη προειδοποίηση">
        {plural(terms.filmingNoticeHours, "ώρα", "ώρες")}
      </ReadOnlyRow>
      <ReadOnlyRow label="Όριο ακύρωσης">
        {plural(terms.filmingCancelHours, "ώρα", "ώρες")}
      </ReadOnlyRow>
      <ReadOnlyRow label="Η αργή ακύρωση καίει Παροχή">
        {yesNo(terms.lateCancelBurns)}
      </ReadOnlyRow>
      <ReadOnlyRow label="Το «δεν έγινε» καίει Παροχή">
        {yesNo(terms.noShowBurns)}
      </ReadOnlyRow>
    </ReadOnlyList>
  );
}

type MoneyTerms = NonNullable<AgreementDetail["moneyTerms"]>;

interface MoneyTermsProps {
  agreementId: string;
  money: MoneyTerms;
  baseline: Baseline;
  canEdit: boolean;
}

const discountHint = (baseline: Baseline): string | undefined =>
  baseline === null
    ? undefined
    : `τυπική: ${formatNumber(baseline.standardDiscountPercent)}% για ${baseline.standardDiscountMonths} μήνες· πάνω από αυτήν είναι Παρέκκλιση`;

export function MoneyTermsBlock({
  agreementId,
  money,
  baseline,
  canEdit,
}: MoneyTermsProps) {
  if (!canEdit)
    return (
      <ReadOnlyList>
        <ReadOnlyRow label="Έκπτωση πρώτων μηνών">
          {money.discountPercent > 0
            ? `${formatNumber(money.discountPercent)}% για ${money.discountMonths} μήνες`
            : "καμία"}
        </ReadOnlyRow>
        <ReadOnlyRow label="Ρήτρα λύσης">
          {formatMoney(money.dissolutionFee)}
        </ReadOnlyRow>
      </ReadOnlyList>
    );
  return (
    <ActionForm action={setMoneyTerms} onlyWhenChanged submitLabel="Αποθήκευση έκπτωσης">
      <input type="hidden" name="agreementId" value={agreementId} />
      <FieldGrid>
        <FieldWithHint
          label="Έκπτωση πρώτων μηνών (%)"
          hint={discountHint(baseline)}
        >
          <Input
            name="discountPercent"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={decimalInput(money.discountPercent)}
          />
        </FieldWithHint>
        <FieldWithHint label="Έκπτωση για (μήνες)">
          {numberInput("discountMonths", money.discountMonths)}
        </FieldWithHint>
        <FieldWithHint
          label="Ρήτρα λύσης (€)"
          hint={
            baseline === null || baseline.dissolutionFee === null
              ? undefined
              : `προεπιλογή: ${formatMoney(baseline.dissolutionFee)}`
          }
        >
          <Input
            name="dissolutionFee"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={moneyInput(money.dissolutionFee)}
          />
        </FieldWithHint>
      </FieldGrid>
    </ActionForm>
  );
}
