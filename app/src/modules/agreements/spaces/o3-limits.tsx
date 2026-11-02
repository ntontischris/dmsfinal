import { SaveRow, SettingsCard, SettingsForm } from "@/modules/settings";

import { saveRevisionLimits } from "../actions-settings";
import { activeKinds } from "../helpers";
import { FORWARD_NOTE } from "../labels";
import type { KindInfo } from "../types";
import { O3LimitsFields } from "./o3-limits-fields";

// Όριο αλλαγών: πόσοι γύροι αλλαγών ανήκουν σε κάθε είδος Παροχής. Κενό = χωρίς γύρους. Στο prototype ζει στη γραμμή
// του είδους Παροχής· εδώ χωριστή κάρτα, γιατί τα είδη Παροχής τα γράφει ο Κατάλογος.
export function RevisionLimitsCard({ kinds }: { kinds: readonly KindInfo[] }) {
  const active = activeKinds(kinds);
  if (active.length === 0)
    return (
      <SettingsCard title="Όριο αλλαγών">
        <p className="muted">Δεν υπάρχει ενεργό είδος Παροχής.</p>
      </SettingsCard>
    );
  return (
    <SettingsForm action={saveRevisionLimits}>
      <SettingsCard title="Όριο αλλαγών">
        <p className="muted o-hint">
          Πόσοι γύροι αλλαγών ανήκουν σε κάθε Παροχή του πελάτη. Αφήνεις κενό
          όταν το είδος δεν έχει γύρους αλλαγών. {FORWARD_NOTE}
        </p>
        <O3LimitsFields kinds={active} />
        <SaveRow card="limits" />
      </SettingsCard>
    </SettingsForm>
  );
}
