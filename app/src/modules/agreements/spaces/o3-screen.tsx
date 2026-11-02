import { can, getViewer } from "@/modules/access";
import {
  ProvisionKindsEditor,
  getKindUsage,
  listProvisionKinds,
} from "@/modules/catalogue";
import {
  SpacesRecentChanges,
  SpacesSettingsTabs,
  o1ChangesOf,
  recentChanges,
} from "@/modules/settings";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { agreementCaps } from "../helpers";
import { listProvisionKinds as listKindsWithLimits } from "../queries-agreements";
import { getDefaults } from "../queries-settings";
import type { AgreementKind } from "../types";
import { PolicyCard, PricingCard, TermsCard } from "./o3-cards";
import { RevisionLimitsCard } from "./o3-limits";

import "./o3.css";

const AUDIT_HREF = "/app/audit?area=settings";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  label: "Ετικέτα",
  label_en: "Ετικέτα (EN)",
  unit: "Μονάδα",
  unit_en: "Μονάδα (EN)",
  measure: "Τρόπος μέτρησης",
  default_hours: "Προεπιλεγμένη διάρκεια",
  sort: "Σειρά",
  retired_at: "Απόσυρση",
  revision_limit: "Όριο αλλαγών",
  payment_days_monthly: "Μέρες πληρωμής (μηνιαίες)",
  payment_days_one_off: "Μέρες πληρωμής (εφάπαξ)",
  unused_provisions: "Αχρησιμοποίητες Παροχές",
  grace_days: "Περίοδος χάριτος",
  duration_months: "Διάρκεια",
  renewal: "Ανανέωση",
  dissolution_notice_days: "Ειδοποίηση λύσης",
  dissolution_fee: "Ρήτρα λύσης",
  filming_notice_hours: "Ελάχιστη προειδοποίηση (ώρες)",
  filming_cancel_hours: "Όριο ακύρωσης (ώρες)",
  late_cancel_burns: "Αργή ακύρωση καίει Παροχή",
  no_show_burns: "«Δεν έγινε» καίει Παροχή",
  advance_percent: "Προκαταβολή",
  standard_discount_percent: "Τυπική έκπτωση",
  standard_discount_months: "Τυπική έκπτωση",
  proposal_validity_days: "Ισχύς πρότασης",
};

const ENTITY_LABELS: Readonly<Record<string, string>> = {
  provision_kinds: "Είδη Παροχής",
  agreement_defaults: "Προεπιλογές Συμφωνιών",
};

const EMAIL_PENDING =
  "Η αποστολή email δεν έχει συνδεθεί ακόμα: οι Σύνδεσμοι και οι κωδικοί υπογραφής παραδίδονται από τη Σελίδα Συμφωνίας.";
const EMAIL_ACTIVE = "Η αποστολή email είναι ενεργή.";

// O3 Ρυθμίσεις › Συμφωνίες στη νέα εμφάνιση (prototype `screens/O3.tsx`): Όροι σε δύο σετ, Πολιτική Γυρισμάτων,
// Προεπιλογές τιμολόγησης, Όριο αλλαγών και τελευταίες αλλαγές, με τα πραγματικά actions. Τα είδη Παροχής τα γράφει
// ο Κατάλογος και μπαίνουν ως έχουν ([data-tw]) μέχρι να δώσει δική του κάρτα στη νέα εμφάνιση.
export async function SpacesAgreementsSettings({
  showRetired,
  set,
}: {
  showRetired: boolean;
  set: AgreementKind;
}) {
  const viewer = await getViewer();
  if (!agreementCaps(viewer).canManageSettings)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Ρυθμίσεις τις αλλάζει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
        </StateNotice>
      </div>
    );
  const [defaults, kinds, kindsWithLimits, usage, changes] = await Promise.all([
    getDefaults(),
    listProvisionKinds(),
    listKindsWithLimits(),
    getKindUsage(),
    recentChanges(Object.keys(ENTITY_LABELS)),
  ]);
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="O3" />
      {!defaults.ok || !kinds.ok || !kindsWithLimits.ok || !usage.ok ? (
        <ErrorNotice what="τις Ρυθμίσεις των Συμφωνιών" />
      ) : (
        <>
          <p className="note">
            {defaults.data.emailSenderConnected ? EMAIL_ACTIVE : EMAIL_PENDING}
          </p>
          <TermsCard defaults={defaults.data} set={set} />
          <PolicyCard defaults={defaults.data} />
          <PricingCard defaults={defaults.data} />
          <div className="o-card" data-tw>
            <ProvisionKindsEditor
              kinds={kinds.data}
              usage={usage.data}
              showRetired={showRetired}
            />
          </div>
          <RevisionLimitsCard kinds={kindsWithLimits.data} />
          {changes.ok && (
            <SpacesRecentChanges
              changes={o1ChangesOf(changes.data, {
                entities: ENTITY_LABELS,
                fields: FIELD_LABELS,
              })}
              auditHref={can(viewer, "audit.view") ? AUDIT_HREF : null}
              areaLabel="Ρυθμίσεις"
            />
          )}
        </>
      )}
    </div>
  );
}
