import { getViewer } from "@/modules/access";
import {
  ProvisionKindsEditor,
  getKindUsage,
  listProvisionKinds,
} from "@/modules/catalogue";
import {
  RecentChanges,
  SpacesSettingsTabs,
  recentChanges,
} from "@/modules/settings";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { PolicyCard } from "../components/policy-card";
import { PricingCard } from "../components/pricing-card";
import { RevisionLimitsCard } from "../components/revision-limits-card";
import { TermsCard } from "../components/terms-card";
import { agreementCaps } from "../helpers";
import { listProvisionKinds as listKindsWithLimits } from "../queries-agreements";
import { getDefaults } from "../queries-settings";
import type { AgreementKind } from "../types";

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

const EMAIL_PENDING =
  "Η αποστολή email δεν έχει συνδεθεί ακόμα: οι Σύνδεσμοι και οι κωδικοί υπογραφής παραδίδονται από τη Σελίδα Συμφωνίας.";
const EMAIL_ACTIVE = "Η αποστολή email είναι ενεργή.";

// O3 Ρυθμίσεις › Συμφωνίες στη νέα εμφάνιση: οι καρτέλες Ρυθμίσεων του prototype (`screens/O3.tsx`)· οι κάρτες
// (Όροι, πολιτική, τιμολόγηση, είδη Παροχής, όρια αλλαγών, τελευταίες αλλαγές) είναι οι σημερινές, ως [data-tw].
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
    recentChanges(["provision_kinds", "agreement_defaults"]),
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
          <div data-tw>
            <div className="grid gap-4">
              <TermsCard defaults={defaults.data} set={set} />
              <PolicyCard defaults={defaults.data} />
              <PricingCard defaults={defaults.data} />
              <ProvisionKindsEditor
                kinds={kinds.data}
                usage={usage.data}
                showRetired={showRetired}
              />
              <RevisionLimitsCard kinds={kindsWithLimits.data} />
              {changes.ok && (
                <RecentChanges
                  changes={changes.data}
                  labelOf={(field) => FIELD_LABELS[field] ?? field}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
