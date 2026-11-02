import { SaveRow, SettingsCard, SettingsForm } from "@/modules/settings";

import { saveFormRouting } from "../actions-settings";
import { routingValue } from "../helpers";
import { FORM_ROUTING_OWNER_LABEL, FORM_ROUTING_QUEUE_LABEL } from "../labels";
import type { AssignableUser, SalesSettings } from "../types";

// Κάρτα «Νέες Ευκαιρίες από τη φόρμα» (prototype `screens/o2-basics.tsx`) με το πραγματικό action της δρομολόγησης.
export function O2Routing({
  settings,
  assignable,
}: {
  settings: SalesSettings;
  assignable: readonly AssignableUser[];
}) {
  const current = routingValue(settings);
  // Το πρόσωπο που ορίστηκε μπορεί να μην αναλαμβάνει πια Πελάτες: φαίνεται, ώστε η επιλογή να μη γράφει ψέματα.
  const isCurrentUnlisted =
    settings.formRouting === "person" &&
    !assignable.some((user) => user.userId === current);
  return (
    <SettingsForm action={saveFormRouting}>
      <SettingsCard title="Νέες Ευκαιρίες από τη φόρμα">
        <span className="stack o-field">
          <label htmlFor="o2-assignee">
            Νέες Ευκαιρίες από τη φόρμα πάνε σε
          </label>
          <select
            id="o2-assignee"
            name="value"
            className="select"
            defaultValue={current}
          >
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
          </select>
          <span className="muted o-hint">
            Με «Χωρίς υπεύθυνο» μπαίνουν σε κοινή ουρά μέχρι να τις αναλάβει
            κάποιος. Όσο αναθέτει ένας μόνο άνθρωπος, η ουρά δεν φαίνεται και η
            Ευκαιρία πάει σε αυτόν.
          </span>
        </span>
        <SaveRow card="assignee" />
      </SettingsCard>
    </SettingsForm>
  );
}
