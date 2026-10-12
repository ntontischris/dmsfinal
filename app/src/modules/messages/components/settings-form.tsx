import Link from "next/link";

import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveMessageSettings } from "../actions-settings";
import {
  MESSAGE_SETTINGS_LIMITS,
  type MessageSettings,
} from "../settings-schemas";

import { ActionForm } from "./action-form";

// Ρυθμίσεις › Μηνύματα: οι δύο χρόνοι της Συνομιλίας. Ισχύουν από εκεί και πέρα.
// Το link στους Αυτοματισμούς φαίνεται μόνο σε όποιον «Διαχειρίζεται Αυτοματισμούς» (#173).
export function MessageSettingsForm({
  settings,
  canManageAutomations,
}: {
  settings: MessageSettings;
  canManageAutomations: boolean;
}) {
  const { editMinutes, requestOpenDays } = MESSAGE_SETTINGS_LIMITS;
  return (
    <ActionForm
      action={saveMessageSettings}
      onlyWhenChanged
      submitLabel="Αποθήκευση Ρυθμίσεων"
    >
      <Panel label="Χρόνοι Συνομιλίας">
        <div className="grid gap-4">
          <Field
            label="Διόρθωση Μηνύματος (λεπτά)"
            hint="Όσο μπορεί να διορθώσει ή να σβήσει κάποιος το Μήνυμά του."
          >
            <Input
              name="editMinutes"
              type="number"
              min={editMinutes.min}
              max={editMinutes.max}
              required
              defaultValue={settings.editMinutes}
            />
          </Field>
          <Field
            label="Ανοιχτό Αίτημα (μέρες)"
            hint="Από πόσες μέρες και μετά ένα ανοιχτό Αίτημα σημαίνεται ως καθυστερημένο."
          >
            <Input
              name="requestOpenDays"
              type="number"
              min={requestOpenDays.min}
              max={requestOpenDays.max}
              required
              defaultValue={settings.requestOpenDays}
            />
          </Field>
        </div>
      </Panel>
      <p className="m-0 text-sm text-muted-foreground">
        Οι αλλαγές ισχύουν από εκεί και πέρα. Η σύνοψη αδιάβαστων προς τον
        πελάτη αλλάζει στους{" "}
        {canManageAutomations ? (
          <Link href="/app/settings/automations/message.unread_waiting">
            Αυτοματισμούς
          </Link>
        ) : (
          "Αυτοματισμούς"
        )}
        .
      </p>
    </ActionForm>
  );
}
