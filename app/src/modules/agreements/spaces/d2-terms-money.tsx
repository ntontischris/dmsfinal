"use client";

import { formatMoney, formatNumber } from "../helpers";
import type { AgreementDetail } from "../types";
import { Field, NumberInput, decimalInput, moneyInput } from "./d2-ui";

// Έκπτωση πρώτων μηνών και ρήτρα λύσης (μηνιαία): όρος τιμής, γι' αυτό πεδία μόνο για όποιον «Βλέπει ποσά».

type Baseline = AgreementDetail["baseline"];
type MoneyTerms = NonNullable<AgreementDetail["moneyTerms"]>;

const discountText = (m: MoneyTerms): string =>
  m.discountPercent > 0 && m.discountMonths > 0
    ? `${formatNumber(m.discountPercent)}% τους πρώτους ${m.discountMonths} μήνες`
    : "Καμία";

export function MoneyRows({
  money,
  baseline,
  isEditing,
}: {
  money: MoneyTerms;
  baseline: Baseline;
  isEditing: boolean;
}) {
  const standard =
    baseline === null
      ? undefined
      : `τυπική: ${formatNumber(baseline.standardDiscountPercent)}% για ${baseline.standardDiscountMonths} μήνες, πάνω από αυτήν είναι Παρέκκλιση`;
  const feeDefault =
    baseline === null ||
    baseline.dissolutionFee === null ||
    baseline.dissolutionFee === money.dissolutionFee
      ? undefined
      : `προεπιλογή: ${formatMoney(baseline.dissolutionFee)}`;
  return (
    <dl className="dl">
      <Field
        id="t-disc"
        label="Έκπτωση πρώτων μηνών"
        isEditing={isEditing}
        value={discountText(money)}
        hint={isEditing ? standard : undefined}
        input={
          <span className="btn-row">
            <NumberInput
              id="t-disc"
              name="discountPercent"
              inputMode="decimal"
              defaultValue={decimalInput(money.discountPercent)}
              suffix="%"
            />
            <NumberInput
              name="discountMonths"
              label="Μήνες έκπτωσης"
              defaultValue={String(money.discountMonths)}
              suffix="μήνες"
            />
          </span>
        }
      />
      <Field
        id="t-fee"
        label="Ρήτρα λύσης"
        isEditing={isEditing}
        value={
          money.dissolutionFee > 0
            ? formatMoney(money.dissolutionFee)
            : "χωρίς ρήτρα"
        }
        hint={feeDefault}
        input={
          <NumberInput
            id="t-fee"
            name="dissolutionFee"
            inputMode="decimal"
            defaultValue={moneyInput(money.dissolutionFee)}
            suffix="€"
          />
        }
      />
    </dl>
  );
}
