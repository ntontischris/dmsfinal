import { Notice } from "@/components/ui/notice";
import {
  CostMonthsCard,
  MultipliersCard,
  athensMonthStart,
  getCostHint,
  listCostMonths,
} from "@/modules/catalogue";
import { PaymentMethodsCard, listPaymentMethods } from "@/modules/finance";
import { RecentChanges, recentChanges } from "@/modules/settings";

const FIELD_LABELS: Readonly<Record<string, string>> = {
  month: "Μήνας",
  expenses_total: "Έξοδα",
  productive_hours: "Παραγωγικές ώρες",
  hour_cost: "Κόστος ώρας",
  multiplier_min: "Ελάχιστη (×)",
  multiplier_target: "Στόχος (×)",
  multiplier_max: "Μέγιστη (×)",
  overrun_percent: "Ποσοστό υπέρβασης",
};

// Όλα όσα διαβάζει η σελίδα, μαζί: αν κάτι δεν φορτώσει, δεν δείχνουμε μισές Ρυθμίσεις.
export async function FinanceSettingsContent({
  canManage,
}: {
  canManage: boolean;
}) {
  const [months, hint, changes, methods] = await Promise.all([
    listCostMonths(),
    getCostHint(),
    recentChanges(["cost_months", "cost_settings"]),
    listPaymentMethods(),
  ]);
  // Χωρίς γραμμή από το cost_hint ο θεατής δεν «Βλέπει κόστος»· εδώ η σελίδα έχει ήδη περάσει αυτόν τον έλεγχο.
  if (!months.ok || !hint.ok || !hint.data || !methods.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσαν οι Ρυθμίσεις">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );
  return (
    <>
      <CostMonthsCard
        months={months.data}
        hint={hint.data}
        current={athensMonthStart()}
        canManage={canManage}
      />
      <MultipliersCard
        multipliers={hint.data.multipliers}
        overrunPercent={hint.data.overrunPercent}
        canManage={canManage}
      />
      <PaymentMethodsCard methods={methods.data} canManage={canManage} />
      <p className="m-0 text-sm text-muted-foreground">
        Έξοδα ανά κατηγορία και όριο Υπέρβασης κόστους έρχονται με τα modules Οικονομικά και Παραγωγές.
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
