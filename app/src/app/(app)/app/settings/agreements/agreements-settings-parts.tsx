import { Notice } from "@/components/ui/notice";
import {
  PolicyCard,
  PricingCard,
  RevisionLimitsCard,
  TermsCard,
  getDefaults,
  listProvisionKinds as listKindsWithLimits,
  type AgreementKind,
} from "@/modules/agreements";
import {
  ProvisionKindsEditor,
  getKindUsage,
  listProvisionKinds,
} from "@/modules/catalogue";
import { RecentChanges, recentChanges } from "@/modules/settings";

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
  "Η αποστολή email δεν έχει συνδεθεί ακόμα: οι Σύνδεσμοι και οι κωδικοί υπογραφής παραδίδονται από τη D2.";
const EMAIL_ACTIVE = "Η αποστολή email είναι ενεργή.";

interface ContentProps {
  showRetired: boolean;
  set: AgreementKind;
}

// Όλα όσα διαβάζει η σελίδα, μαζί: αν κάτι δεν φορτώσει, δεν δείχνουμε μισές Ρυθμίσεις.
export async function AgreementsSettingsContent({
  showRetired,
  set,
}: ContentProps) {
  const [defaults, kinds, kindsWithLimits, usage, changes] = await Promise.all([
    getDefaults(),
    listProvisionKinds(),
    listKindsWithLimits(),
    getKindUsage(),
    recentChanges(["provision_kinds", "agreement_defaults"]),
  ]);
  if (!defaults.ok || !kinds.ok || !kindsWithLimits.ok || !usage.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσαν οι Ρυθμίσεις">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );
  return (
    <>
      <TermsCard defaults={defaults.data} set={set} />
      <PolicyCard defaults={defaults.data} />
      <PricingCard defaults={defaults.data} />
      <ProvisionKindsEditor
        kinds={kinds.data}
        usage={usage.data}
        showRetired={showRetired}
      />
      <RevisionLimitsCard kinds={kindsWithLimits.data} />
      <p className="m-0 text-sm text-muted-foreground">
        {defaults.data.emailSenderConnected ? EMAIL_ACTIVE : EMAIL_PENDING}
      </p>
      {changes.ok && (
        <RecentChanges
          changes={changes.data}
          labelOf={(field) => FIELD_LABELS[field] ?? field}
        />
      )}
    </>
  );
}
