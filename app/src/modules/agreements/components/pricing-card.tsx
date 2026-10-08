import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { savePricing } from "../actions-settings";
import type { AgreementDefaults } from "../types";

import { ActionForm } from "./action-form";
import { CardNote, decimalText } from "./terms-card-parts";

// O3 · Προεπιλογές τιμολόγησης και πρότασης. Η τυπική έκπτωση και η προκαταβολή είναι το baseline των Παρεκκλίσεων:
// ό,τι είναι βαθύτερο από αυτά θέλει Έγκριση.
export function PricingCard({ defaults }: { defaults: AgreementDefaults }) {
  return (
    <Panel label="Προεπιλογές τιμολόγησης και πρότασης">
      <div className="grid gap-4">
        <CardNote>
          Ισχύει για νέες προτάσεις· οι υπάρχουσες Συμφωνίες κρατούν τις τιμές
          τους.
        </CardNote>
        <ActionForm action={savePricing} submitLabel="Αποθήκευση">
          <Field label="Ισχύς πρότασης (μέρες)">
            <Input
              name="proposalValidityDays"
              inputMode="numeric"
              required
              defaultValue={String(defaults.proposalValidityDays)}
            />
          </Field>
          <Field
            label="Προκαταβολή εφάπαξ (%)"
            hint="Το ποσοστό της πρώτης δόσης, στην υπογραφή."
          >
            <Input
              name="advancePercent"
              inputMode="decimal"
              required
              defaultValue={decimalText(defaults.advancePercent)}
            />
          </Field>
          <Field
            label="Τυπική έκπτωση πρώτων μηνών (%)"
            hint="Μεγαλύτερη έκπτωση από αυτή είναι Παρέκκλιση."
          >
            <Input
              name="standardDiscountPercent"
              inputMode="decimal"
              required
              defaultValue={decimalText(defaults.standardDiscountPercent)}
            />
          </Field>
          <Field label="Τυπική έκπτωση πρώτων μηνών (μήνες)">
            <Input
              name="standardDiscountMonths"
              inputMode="numeric"
              required
              defaultValue={String(defaults.standardDiscountMonths)}
            />
          </Field>
        </ActionForm>
      </div>
    </Panel>
  );
}
