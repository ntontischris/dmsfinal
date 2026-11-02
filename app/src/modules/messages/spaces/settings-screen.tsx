import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import {
  SaveRow,
  SettingsCard,
  SettingsForm,
  SpacesSettingsTabs,
  TextField,
} from "@/modules/settings";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { saveMessageSettings } from "../actions-settings";
import { getMessageSettings } from "../queries-settings";
import { MESSAGE_SETTINGS_LIMITS } from "../settings-schemas";

const AUTOMATION_HREF = "/app/settings/automations/message.unread_waiting";

// Ρυθμίσεις › Μηνύματα στη νέα εμφάνιση, με τα κοινά των καρτελών Ρυθμίσεων του prototype (`screens/o-shared.tsx`):
// οι δύο χρόνοι της Συνομιλίας. Μόνο όποιος «Διαχειρίζεται Ρυθμίσεις»· το link στους Αυτοματισμούς μόνο με «Διαχειρίζεται
// Αυτοματισμούς».
export async function SpacesMessageSettings() {
  const viewer = await getViewer();
  if (!can(viewer, "settings.manage"))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
        </StateNotice>
      </div>
    );
  const settings = await getMessageSettings();
  const { editMinutes, requestOpenDays } = MESSAGE_SETTINGS_LIMITS;
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="messages" />
      {!settings.ok ? (
        <ErrorNotice what="οι Ρυθμίσεις Μηνυμάτων" />
      ) : (
        <SettingsForm action={saveMessageSettings}>
          <SettingsCard title="Χρόνοι Συνομιλίας">
            <TextField
              id="ms-edit-minutes"
              name="editMinutes"
              label="Διόρθωση Μηνύματος (λεπτά)"
              type="number"
              inputMode="numeric"
              min={editMinutes.min}
              max={editMinutes.max}
              value={String(settings.data.editMinutes)}
              hint="Όσο μπορεί να διορθώσει ή να σβήσει κάποιος το Μήνυμά του."
            />
            <TextField
              id="ms-request-days"
              name="requestOpenDays"
              label="Ανοιχτό Αίτημα (μέρες)"
              type="number"
              inputMode="numeric"
              min={requestOpenDays.min}
              max={requestOpenDays.max}
              value={String(settings.data.requestOpenDays)}
              hint="Από πόσες μέρες και μετά ένα ανοιχτό Αίτημα σημαίνεται ως καθυστερημένο."
            />
            <p className="muted o-hint">
              Οι αλλαγές ισχύουν από εκεί και πέρα. Η σύνοψη αδιάβαστων προς τον
              πελάτη αλλάζει στους{" "}
              {can(viewer, "automations.manage") ? (
                <Link href={AUTOMATION_HREF}>Αυτοματισμούς</Link>
              ) : (
                "Αυτοματισμούς"
              )}
              .
            </p>
            <SaveRow card="times" label="Αποθήκευση Ρυθμίσεων" />
          </SettingsCard>
        </SettingsForm>
      )}
    </div>
  );
}
