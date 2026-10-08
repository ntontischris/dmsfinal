import { Field, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveFormRouting } from "../actions-settings";
import { routingValue } from "../helpers";
import { FORM_ROUTING_OWNER_LABEL, FORM_ROUTING_QUEUE_LABEL } from "../labels";
import type { AssignableUser, SalesSettings } from "../types";

import { ActionForm } from "./action-form";

interface SalesRoutingCardProps {
  settings: SalesSettings;
  assignable: readonly AssignableUser[];
}

const HINT =
  "Με «Χωρίς υπεύθυνο» μπαίνουν σε κοινή ουρά μέχρι να τις αναλάβει κάποιος. Όσο αναθέτει ένας μόνο άνθρωπος, η ουρά δεν φαίνεται και η Ευκαιρία πάει σε αυτόν.";

// Πού πάνε οι νέες Ευκαιρίες από τη φόρμα της Ιστοσελίδας: Ιδιοκτήτης, συγκεκριμένο πρόσωπο ή η ουρά «Χωρίς υπεύθυνο».
export function SalesRoutingCard({
  settings,
  assignable,
}: SalesRoutingCardProps) {
  const current = routingValue(settings);
  // Το πρόσωπο που ορίστηκε μπορεί να μην αναλαμβάνει πια Πελάτες: φαίνεται, ώστε η επιλογή να μη γράφει ψέματα.
  const isCurrentUnlisted =
    settings.formRouting === "person" &&
    !assignable.some((user) => user.userId === current);
  return (
    <Panel label="Νέες Ευκαιρίες από τη φόρμα">
      <ActionForm action={saveFormRouting} submitLabel="Αποθήκευση">
        <Field label="Νέες Ευκαιρίες από τη φόρμα πάνε σε" hint={HINT}>
          <Select name="value" defaultValue={current}>
            <option value="owner">{FORM_ROUTING_OWNER_LABEL}</option>
            {assignable.map((user) => (
              <option key={user.userId} value={user.userId}>
                {user.name}
              </option>
            ))}
            {isCurrentUnlisted && (
              <option value={current}>
                Πρόσωπο που δεν αναλαμβάνει πια Πελάτες
              </option>
            )}
            <option value="queue">{FORM_ROUTING_QUEUE_LABEL}</option>
          </Select>
        </Field>
      </ActionForm>
    </Panel>
  );
}
