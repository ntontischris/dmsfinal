import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { SaveRow, SettingsForm } from "@/modules/settings";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { saveDeliverableRules } from "../actions-rules";
import { getDeliverableRules } from "../queries-rules";
import type { DeliverableRules } from "../rules-types";
import { H2Box } from "./h2-box";

import "../../finance/spaces/money-lines.css";
import "./h34.css";

// O5 «Ρυθμίσεις: Παραδοτέα» στη νέα εμφάνιση (prototype `screens/O5.tsx`, `o5-rules.tsx`), πάνω στο πραγματικό
// `saveDeliverableRules`: μία φόρμα για όλους τους Κανόνες, δύο ανοιχτά κουτιά (.ml-box) με ένα κουμπί το καθένα.
// Ο τίτλος (h1) είναι της κάρτας «Παραδοτέα» των Ρυθμίσεων: τον γράφει το κέλυφος.
// Η βάση δεν έχει εξαιρέσεις ελέγχου ανά είδος, αγγλικό όνομα ούτε πλήθος ανοιχτών Παραδοτέων ανά είδος: λείπουν.

const AGREEMENTS_SETTINGS = "/app/settings/agreements";
const CLIENT_WAITING_AUTOMATION =
  "/app/settings/automations/deliverable.client_waiting";

function ReviewCard({ rules }: { rules: DeliverableRules }) {
  return (
    <H2Box
      title="Εσωτερικός έλεγχος και αλλαγές"
      hint={rules.internalReview ? "με έλεγχο" : "χωρίς έλεγχο"}
      isOpen
    >
      <div className="ml-fields">
        <span className="ml-field">
          <label htmlFor="o5-review">Εσωτερικός έλεγχος πριν τον πελάτη</label>
          <select
            id="o5-review"
            className="input"
            name="internalReview"
            defaultValue={rules.internalReview ? "on" : "off"}
          >
            <option value="on">ναι</option>
            <option value="off">όχι</option>
          </select>
          <span className="muted">
            Όταν είναι κλειστός, η Έκδοση μιας Παραγωγής πελάτη πάει κατευθείαν
            στον πελάτη. Η Εσωτερική Παραγωγή περνά πάντα από έλεγχο.
          </span>
        </span>
        <span className="ml-field">
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
    </H2Box>
  );
}

function KindRows({ rules }: { rules: DeliverableRules }) {
  return (
    <ul className="ml-list">
      {rules.kinds.map((kind) => (
        <li key={kind.id} className="ml-line">
          <span className="ml-main">
            <strong>
              <input type="hidden" name="kindId" value={kind.id} />
              {kind.label}
            </strong>
            <small>
              Όριο αλλαγών: {kind.revisionLimit ?? "—"}{" "}
              <Badge>μόνο ανάγνωση</Badge>{" "}
              <Link href={AGREEMENTS_SETTINGS}>αλλάζει στις Συμφωνίες</Link>
            </small>
          </span>
          <span className="ml-quick">
            <label className="o5-days">
              <small>Προθεσμία (εργάσιμες)</small>
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
          </span>
        </li>
      ))}
    </ul>
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
    <H2Box
      title="Προθεσμία ανά είδος Παροχής"
      hint={`${rules.kinds.length} είδη`}
      isOpen
    >
      <p className="muted">
        Σε εργάσιμες μέρες, από το δεμένο Γύρισμα όταν γίνει, αλλιώς από τη
        δημιουργία. Οι αργίες δεν μετρούν ως εργάσιμες.
      </p>
      {rules.kinds.length === 0 ? (
        <p className="ml-empty">
          Δεν υπάρχουν είδη Παροχής ακόμα. Ορίζονται στις{" "}
          <Link href={AGREEMENTS_SETTINGS}>Συμφωνίες</Link>.
        </p>
      ) : (
        <KindRows rules={rules} />
      )}
      <p className="muted">
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
    </H2Box>
  );
}

async function O5Body() {
  const viewer = await getViewer();
  const rules = await getDeliverableRules();
  if (!rules.ok) return <ErrorNotice what="τις ρυθμίσεις των Παραδοτέων" />;
  return (
    <SettingsForm action={saveDeliverableRules}>
      <div className="ml-stack o5">
        <ReviewCard rules={rules.data} />
        <DeadlinesCard
          rules={rules.data}
          canManageAutomations={can(viewer, "automations.manage")}
        />
      </div>
    </SettingsForm>
  );
}

// Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις», όπως η σημερινή.
export async function SpacesDeliverableSettings() {
  const viewer = await getViewer();
  return (
    <div data-spaces>
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
