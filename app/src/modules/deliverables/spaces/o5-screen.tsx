import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import {
  SaveRow,
  SettingsCard,
  SettingsForm,
  SpacesSettingsTabs,
} from "@/modules/settings";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { saveDeliverableRules } from "../actions-rules";
import { getDeliverableRules } from "../queries-rules";
import type { DeliverableRules } from "../rules-types";

// O5 «Ρυθμίσεις: Παραδοτέα» στη νέα εμφάνιση (prototype `screens/O5.tsx`, `o5-rules.tsx`), πάνω στο πραγματικό
// `saveDeliverableRules`: μία φόρμα για όλους τους Κανόνες, με ένα κουμπί σε κάθε κάρτα όπως στο prototype.
// Η βάση δεν έχει εξαιρέσεις ελέγχου ανά είδος, αγγλικό όνομα ούτε πλήθος ανοιχτών Παραδοτέων ανά είδος: λείπουν.

const AGREEMENTS_SETTINGS = "/app/settings/agreements";
const CLIENT_WAITING_AUTOMATION =
  "/app/settings/automations/deliverable.client_waiting";

function ReviewCard({ rules }: { rules: DeliverableRules }) {
  return (
    <SettingsCard title="Εσωτερικός έλεγχος και αλλαγές">
      <div className="o-fields">
        <span className="stack o-field">
          <label htmlFor="o5-review">Εσωτερικός έλεγχος πριν τον πελάτη</label>
          <select
            id="o5-review"
            className="select"
            name="internalReview"
            defaultValue={rules.internalReview ? "on" : "off"}
          >
            <option value="on">ναι</option>
            <option value="off">όχι</option>
          </select>
          <span className="muted o-hint">
            Όταν είναι κλειστός, η Έκδοση μιας Παραγωγής πελάτη πάει κατευθείαν
            στον πελάτη. Η Εσωτερική Παραγωγή περνά πάντα από έλεγχο.
          </span>
        </span>
        <span className="stack o-field">
          <label htmlFor="o5-rework">
            Νέα προθεσμία μετά από «χρειάζεται αλλαγές» (εργάσιμες)
          </label>
          <input
            id="o5-rework"
            className="input"
            name="changesDays"
            type="number"
            min={0}
            max={30}
            required
            defaultValue={rules.changesDays}
          />
        </span>
      </div>
      <SaveRow card="review" />
    </SettingsCard>
  );
}

function KindRows({ rules }: { rules: DeliverableRules }) {
  return (
    <RowList>
      {rules.kinds.map((kind) => (
        <ListRow
          key={kind.id}
          title={
            <>
              <input type="hidden" name="kindId" value={kind.id} />
              {kind.label}
            </>
          }
          sub={
            <>
              Όριο αλλαγών: {kind.revisionLimit ?? "—"}{" "}
              <Badge>μόνο ανάγνωση</Badge>{" "}
              <Link href={AGREEMENTS_SETTINGS}>αλλάζει στις Συμφωνίες</Link>
            </>
          }
          aside={
            <label className="o5-days">
              <span className="part-sub">Προθεσμία (εργάσιμες)</span>
              <input
                className="input"
                aria-label={`Προθεσμία ${kind.label}`}
                name={`deadline-${kind.id}`}
                type="number"
                min={1}
                max={90}
                required
                defaultValue={kind.deadlineDays}
              />
            </label>
          }
        />
      ))}
    </RowList>
  );
}

function DeadlinesCard({
  rules,
  canManageAutomations,
}: {
  rules: DeliverableRules;
  canManageAutomations: boolean;
}) {
  return (
    <SettingsCard title="Προθεσμία ανά είδος Παροχής">
      <p className="muted o-hint">
        Σε εργάσιμες μέρες, από το δεμένο Γύρισμα όταν γίνει, αλλιώς από τη
        δημιουργία. Οι αργίες δεν μετρούν ως εργάσιμες.
      </p>
      {rules.kinds.length === 0 ? (
        <p className="muted">
          Δεν υπάρχουν είδη Παροχής ακόμα. Ορίζονται στις{" "}
          <Link href={AGREEMENTS_SETTINGS}>Συμφωνίες</Link>.
        </p>
      ) : (
        <KindRows rules={rules} />
      )}
      <p className="muted o-hint">
        Οι υπενθυμίσεις στον πελάτη για Έκδοση που περιμένει είναι Αυτοματισμοί:
        ρυθμίζονται στους{" "}
        {canManageAutomations ? (
          <Link href={CLIENT_WAITING_AUTOMATION}>Αυτοματισμούς</Link>
        ) : (
          "Αυτοματισμούς"
        )}
        .
      </p>
      <SaveRow card="deadlines" />
    </SettingsCard>
  );
}

async function O5Body() {
  const viewer = await getViewer();
  const rules = await getDeliverableRules();
  if (!rules.ok) return <ErrorNotice what="τις ρυθμίσεις των Παραδοτέων" />;
  return (
    <SettingsForm action={saveDeliverableRules}>
      <ReviewCard rules={rules.data} />
      <DeadlinesCard
        rules={rules.data}
        canManageAutomations={can(viewer, "automations.manage")}
      />
    </SettingsForm>
  );
}

// Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις», όπως η σημερινή.
export async function SpacesDeliverableSettings() {
  const viewer = await getViewer();
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="O5" />
      {can(viewer, "settings.manage") ? (
        <O5Body />
      ) : (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
        </StateNotice>
      )}
    </div>
  );
}
