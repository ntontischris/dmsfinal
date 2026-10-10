import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { savePolicy } from "../actions-settings";
import type { AgreementDefaults } from "../types";

import { ActionForm } from "./action-form";
import { CardNote, YesNoField } from "./terms-card-parts";

// O3 · Πολιτική Γυρισμάτων του πελάτη: οι προεπιλογές που αντιγράφονται σε κάθε νέα πρόταση.
// Δεν υπάρχει Γύρισμα ακόμα (module Γυρισμάτων)· εδώ ορίζονται μόνο οι τιμές που θα διαβάσει.
export function PolicyCard({ defaults }: { defaults: AgreementDefaults }) {
  return (
    <Panel label="Πολιτική Γυρισμάτων του πελάτη">
      <div className="grid gap-4">
        <CardNote>
          Ισχύει για νέες προτάσεις· οι υπάρχουσες Συμφωνίες κρατούν τις τιμές
          τους.
        </CardNote>
        <ActionForm action={savePolicy} onlyWhenChanged submitLabel="Αποθήκευση">
          <Field label="Ελάχιστη προειδοποίηση (ώρες πριν)">
            <Input
              name="filmingNoticeHours"
              inputMode="numeric"
              required
              defaultValue={String(defaults.filmingNoticeHours)}
            />
          </Field>
          <Field label="Όριο ακύρωσης (ώρες πριν)">
            <Input
              name="filmingCancelHours"
              inputMode="numeric"
              required
              defaultValue={String(defaults.filmingCancelHours)}
            />
          </Field>
          <YesNoField
            name="lateCancelBurns"
            label="Αργή ακύρωση καίει Παροχή"
            isYes={defaults.lateCancelBurns}
          />
          <YesNoField
            name="noShowBurns"
            label="«Δεν έγινε» καίει Παροχή"
            isYes={defaults.noShowBurns}
          />
        </ActionForm>
      </div>
    </Panel>
  );
}
