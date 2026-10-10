import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/segmented";

import { saveTerms } from "../actions-settings";
import { formatNumber } from "../helpers";
import { AUTO_RENEWAL_NOTE, RENEWAL_LABELS, UNUSED_LABELS } from "../labels";
import type {
  AgreementDefaults,
  AgreementKind,
  Renewal,
  UnusedProvisions,
} from "../types";

import { ActionForm } from "./action-form";
import { CardNote, decimalText } from "./terms-card-parts";

// O3 · Όροι Συμφωνίας: οι προεπιλογές που αντιγράφονται σε κάθε νέα πρόταση, δύο σετ (μηνιαίες, εφάπαξ).
// Κάθε Συμφωνία αλλάζει τους Όρους της στη D2· εδώ αλλάζουν μόνο οι προεπιλογές για τις επόμενες.

interface TermsCardProps {
  defaults: AgreementDefaults;
  set: AgreementKind;
}

const HINT =
  "Αυτές είναι οι προεπιλογές. Κάθε Συμφωνία αλλάζει τους Όρους της στη D2· ό,τι είναι πιο χαλαρό από την προεπιλογή γράφεται ως Παρέκκλιση.";

const TABS: readonly { set: AgreementKind; label: string }[] = [
  { set: "monthly", label: "Μηνιαίες Συμφωνίες" },
  { set: "one_off", label: "Εφάπαξ Συμφωνίες" },
];

const UNUSED_VALUES: readonly UnusedProvisions[] = [
  "lost",
  "next_period",
  "accumulate",
];
const RENEWAL_VALUES: readonly Renewal[] = ["new_opportunity", "auto"];

function MonthlyFields({ defaults }: { defaults: AgreementDefaults }) {
  return (
    <>
      <Field label="Μέρες πληρωμής">
        <Input
          name="paymentDays"
          inputMode="numeric"
          required
          defaultValue={String(defaults.paymentDaysMonthly)}
        />
      </Field>
      <Field label="Αχρησιμοποίητες Παροχές">
        <Select
          name="unusedProvisions"
          defaultValue={defaults.unusedProvisions}
        >
          {UNUSED_VALUES.map((value) => (
            <option key={value} value={value}>
              {UNUSED_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Περίοδος χάριτος (μέρες)">
        <Input
          name="graceDays"
          inputMode="numeric"
          required
          defaultValue={String(defaults.graceDays)}
        />
      </Field>
      <Field label="Διάρκεια (μήνες)">
        <Input
          name="durationMonths"
          inputMode="numeric"
          required
          defaultValue={String(defaults.durationMonths)}
        />
      </Field>
      <Field
        label="Ανανέωση"
        hint={defaults.renewal === "auto" ? AUTO_RENEWAL_NOTE : undefined}
      >
        <Select name="renewal" defaultValue={defaults.renewal}>
          {RENEWAL_VALUES.map((value) => (
            <option key={value} value={value}>
              {RENEWAL_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ρήτρα λύσης (μέρες προειδοποίηση)">
        <Input
          name="dissolutionNoticeDays"
          inputMode="numeric"
          required
          defaultValue={String(defaults.dissolutionNoticeDays)}
        />
      </Field>
      {defaults.dissolutionFee !== null && (
        <Field label="Ρήτρα λύσης (€)">
          <Input
            name="dissolutionFee"
            inputMode="decimal"
            required
            defaultValue={decimalText(defaults.dissolutionFee)}
          />
        </Field>
      )}
    </>
  );
}

function OneOffFields({ defaults }: { defaults: AgreementDefaults }) {
  const rest = 100 - defaults.advancePercent;
  return (
    <>
      <Field label="Μέρες πληρωμής">
        <Input
          name="paymentDays"
          inputMode="numeric"
          required
          defaultValue={String(defaults.paymentDaysOneOff)}
        />
      </Field>
      <dl className="m-0 grid gap-1 text-sm text-muted-foreground">
        {[
          "Αχρησιμοποίητες Παροχές",
          "Περίοδος χάριτος",
          "Διάρκεια",
          "Ανανέωση",
          "Ρήτρα λύσης",
        ].map((label) => (
          <div key={label} className="flex flex-wrap gap-x-3">
            <dt>{label}</dt>
            <dd className="m-0">— δεν ισχύει</dd>
          </div>
        ))}
      </dl>
      <CardNote>
        Δόσεις σε ορόσημα: {formatNumber(defaults.advancePercent)}% Υπογραφή /{" "}
        {formatNumber(rest)}% Παράδοση. Αλλάζουν στις Προεπιλογές τιμολόγησης.
      </CardNote>
    </>
  );
}

export function TermsCard({ defaults, set }: TermsCardProps) {
  return (
    <Panel label="Όροι Συμφωνίας">
      <div className="grid gap-4">
        <Tabs
          label="Σετ Όρων"
          options={TABS.map((tab) => ({
            label: tab.label,
            href: `/app/settings/agreements?set=${tab.set}`,
            isCurrent: tab.set === set,
          }))}
        />
        <CardNote>{HINT}</CardNote>
        {/* Το key είναι μόνο το σετ: αλλάζοντας καρτέλα η φόρμα ξαναφτιάχνεται· η αποθήκευση δεν την ξαναφτιάχνει. */}
        <ActionForm key={set} action={saveTerms} onlyWhenChanged submitLabel="Αποθήκευση">
          <input type="hidden" name="set" value={set} />
          {set === "monthly" ? (
            <MonthlyFields defaults={defaults} />
          ) : (
            <OneOffFields defaults={defaults} />
          )}
        </ActionForm>
        <CardNote>
          Αφορά {defaults.openProposals} ανοιχτές προτάσεις και{" "}
          {defaults.liveAgreements} Συμφωνίες· ισχύει μόνο για νέες.
        </CardNote>
      </div>
    </Panel>
  );
}
