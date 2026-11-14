import Link from "next/link";
import type { ReactNode } from "react";

import { SaveRow, SettingsCard, SettingsForm } from "@/modules/settings";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { savePolicy, savePricing, saveTerms } from "../actions-settings";
import { formatNumber } from "../helpers";
import { AUTO_RENEWAL_NOTE, RENEWAL_LABELS, UNUSED_LABELS } from "../labels";
import type {
  AgreementDefaults,
  AgreementKind,
  Renewal,
  UnusedProvisions,
} from "../types";
import { decimalText, forwardText, termsHref } from "./o3-adapter";

// O3 κάρτες Όροι, Πολιτική Γυρισμάτων, Προεπιλογές τιμολόγησης (prototype `screens/o3-terms.tsx`) με τα πραγματικά actions.

const SET_LABELS: readonly { set: AgreementKind; label: string }[] = [
  { set: "monthly", label: "Μηνιαίες Συμφωνίες" },
  { set: "one_off", label: "Εφάπαξ Συμφωνίες" },
];
const UNUSED_VALUES: readonly UnusedProvisions[] = [
  "lost",
  "next_period",
  "accumulate",
];
const RENEWAL_VALUES: readonly Renewal[] = ["new_opportunity", "auto"];
const NOT_ONE_OFF = [
  "Αχρησιμοποίητες Παροχές",
  "Περίοδος χάριτος (μέρες)",
  "Διάρκεια (μήνες)",
  "Ανανέωση",
  "Ευκαιρία ανανέωσης (μέρες πριν τη Λήξη)",
  "Ρήτρα λύσης (μέρες προειδοποίηση)",
];
const NEW_ONLY =
  "Ισχύει για νέες προτάσεις· οι υπάρχουσες Συμφωνίες κρατούν τις τιμές τους.";

interface InputRowProps {
  label: string;
  name: string;
  value: string;
  inputMode?: "numeric" | "decimal";
}

function InputRow({
  label,
  name,
  value,
  inputMode = "numeric",
}: InputRowProps) {
  return (
    <ListRow
      title={label}
      aside={
        <input
          className="input"
          name={name}
          aria-label={label}
          inputMode={inputMode}
          required
          defaultValue={value}
        />
      }
    />
  );
}

interface SelectRowProps<T extends string> {
  label: string;
  name: string;
  value: T;
  options: readonly T[];
  labels: Readonly<Record<T, string>>;
  sub?: ReactNode;
}

function SelectRow<T extends string>({
  label,
  name,
  value,
  options,
  labels,
  sub,
}: SelectRowProps<T>) {
  return (
    <ListRow
      title={label}
      sub={sub}
      aside={
        <select
          className="select"
          name={name}
          aria-label={label}
          defaultValue={value}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {labels[option]}
            </option>
          ))}
        </select>
      }
    />
  );
}

function MonthlyRows({ defaults }: { defaults: AgreementDefaults }) {
  return (
    <>
      <SelectRow
        label="Αχρησιμοποίητες Παροχές"
        name="unusedProvisions"
        value={defaults.unusedProvisions}
        options={UNUSED_VALUES}
        labels={UNUSED_LABELS}
      />
      <InputRow
        label="Περίοδος χάριτος (μέρες)"
        name="graceDays"
        value={String(defaults.graceDays)}
      />
      <InputRow
        label="Διάρκεια (μήνες)"
        name="durationMonths"
        value={String(defaults.durationMonths)}
      />
      <SelectRow
        label="Ανανέωση"
        name="renewal"
        value={defaults.renewal}
        options={RENEWAL_VALUES}
        labels={RENEWAL_LABELS}
        sub={defaults.renewal === "auto" ? AUTO_RENEWAL_NOTE : undefined}
      />
      <InputRow
        label="Ευκαιρία ανανέωσης (μέρες πριν τη Λήξη)"
        name="renewalLeadDays"
        value={String(defaults.renewalLeadDays)}
      />
      <InputRow
        label="Ρήτρα λύσης (μέρες προειδοποίηση)"
        name="dissolutionNoticeDays"
        value={String(defaults.dissolutionNoticeDays)}
      />
      {defaults.dissolutionFee !== null && (
        <InputRow
          label="Ρήτρα λύσης (€)"
          name="dissolutionFee"
          inputMode="decimal"
          value={decimalText(defaults.dissolutionFee)}
        />
      )}
      <ListRow
        title="Δόσεις σε ορόσημα"
        aside={<span className="muted">— μόνο στις εφάπαξ</span>}
      />
    </>
  );
}

function OneOffRows({ defaults }: { defaults: AgreementDefaults }) {
  return (
    <>
      {NOT_ONE_OFF.map((label) => (
        <ListRow
          key={label}
          title={label}
          aside={<span className="muted">— δεν ισχύει</span>}
        />
      ))}
      <ListRow
        title="Δόσεις σε ορόσημα"
        sub="Αλλάζουν στις Προεπιλογές τιμολόγησης."
        aside={`${formatNumber(defaults.advancePercent)}% Υπογραφή / ${formatNumber(100 - defaults.advancePercent)}% Παράδοση`}
      />
    </>
  );
}

// Όροι Συμφωνίας σε δύο σετ, με εναλλαγή μέσω ?set=. Το key είναι το σετ: αλλάζοντας σετ η φόρμα ξαναφτιάχνεται.
export function TermsCard({
  defaults,
  set,
}: {
  defaults: AgreementDefaults;
  set: AgreementKind;
}) {
  const paymentDays =
    set === "monthly"
      ? defaults.paymentDaysMonthly
      : defaults.paymentDaysOneOff;
  return (
    <SettingsForm key={set} action={saveTerms}>
      <SettingsCard title="Όροι Συμφωνίας">
        <div className="o3-switch" aria-label="Σετ Όρων">
          {SET_LABELS.map((item) => (
            <Link
              key={item.set}
              className="button"
              data-primary={item.set === set ? "true" : undefined}
              aria-current={item.set === set ? "true" : undefined}
              href={termsHref(item.set)}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <input type="hidden" name="set" value={set} />
        <RowList>
          <InputRow
            label="Μέρες πληρωμής"
            name="paymentDays"
            value={String(paymentDays)}
          />
          {set === "monthly" ? (
            <MonthlyRows defaults={defaults} />
          ) : (
            <OneOffRows defaults={defaults} />
          )}
        </RowList>
        <p className="muted o-hint">
          Αυτές είναι οι προεπιλογές. Κάθε Συμφωνία αλλάζει τους Όρους της στη
          Σελίδα Συμφωνίας· ό,τι είναι πιο χαλαρό από την προεπιλογή γράφεται ως
          Παρέκκλιση.
        </p>
        <p className="muted o-hint">{forwardText(defaults)}</p>
        <SaveRow card={`terms-${set}`} />
      </SettingsCard>
    </SettingsForm>
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}

function Field({ id, label, hint, children }: FieldProps) {
  return (
    <span className="stack o-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="muted o-hint">{hint}</span>}
    </span>
  );
}

interface NumberFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  hint?: string;
  inputMode?: "numeric" | "decimal";
}

function NumberField({
  id,
  name,
  label,
  value,
  hint,
  inputMode = "numeric",
}: NumberFieldProps) {
  return (
    <Field id={id} label={label} hint={hint}>
      <input
        id={id}
        name={name}
        className="input"
        inputMode={inputMode}
        required
        defaultValue={value}
      />
    </Field>
  );
}

interface YesNoProps {
  id: string;
  name: string;
  label: string;
  isYes: boolean;
}

// «ναι»/«όχι» για τις ρυθμίσεις που είναι διακόπτες (στέλνει "yes" ή "no").
function YesNo({ id, name, label, isYes }: YesNoProps) {
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        name={name}
        className="select"
        defaultValue={isYes ? "yes" : "no"}
      >
        <option value="yes">ναι</option>
        <option value="no">όχι</option>
      </select>
    </Field>
  );
}

export function PolicyCard({ defaults }: { defaults: AgreementDefaults }) {
  return (
    <SettingsForm action={savePolicy}>
      <SettingsCard title="Πολιτική Γυρισμάτων του πελάτη">
        <div className="o-fields">
          <NumberField
            id="o3-notice"
            name="filmingNoticeHours"
            label="Ελάχιστη προειδοποίηση (ώρες πριν)"
            value={String(defaults.filmingNoticeHours)}
          />
          <NumberField
            id="o3-cutoff"
            name="filmingCancelHours"
            label="Όριο ακύρωσης (ώρες πριν)"
            value={String(defaults.filmingCancelHours)}
          />
          <YesNo
            id="o3-late"
            name="lateCancelBurns"
            label="Αργή ακύρωση καίει Παροχή"
            isYes={defaults.lateCancelBurns}
          />
          <YesNo
            id="o3-noshow"
            name="noShowBurns"
            label="«Δεν έγινε» καίει Παροχή"
            isYes={defaults.noShowBurns}
          />
        </div>
        <p className="muted o-hint">{NEW_ONLY}</p>
        <SaveRow card="policy" />
      </SettingsCard>
    </SettingsForm>
  );
}

export function PricingCard({ defaults }: { defaults: AgreementDefaults }) {
  return (
    <SettingsForm action={savePricing}>
      <SettingsCard title="Προεπιλογές τιμολόγησης">
        <div className="o-fields">
          <NumberField
            id="o3-validity"
            name="proposalValidityDays"
            label="Ισχύς πρότασης (μέρες)"
            value={String(defaults.proposalValidityDays)}
          />
          <NumberField
            id="o3-advance"
            name="advancePercent"
            label="Προκαταβολή εφάπαξ (%)"
            inputMode="decimal"
            value={decimalText(defaults.advancePercent)}
            hint="Το ποσοστό της πρώτης δόσης, στην υπογραφή."
          />
          <NumberField
            id="o3-discount"
            name="standardDiscountPercent"
            label="Τυπική έκπτωση πρώτων μηνών (%)"
            inputMode="decimal"
            value={decimalText(defaults.standardDiscountPercent)}
            hint="Μεγαλύτερη έκπτωση από αυτή είναι Παρέκκλιση."
          />
          <NumberField
            id="o3-discount-months"
            name="standardDiscountMonths"
            label="Τυπική έκπτωση πρώτων μηνών (μήνες)"
            value={String(defaults.standardDiscountMonths)}
          />
        </div>
        <p className="muted o-hint">{NEW_ONLY}</p>
        <SaveRow card="pricing" />
      </SettingsCard>
    </SettingsForm>
  );
}
