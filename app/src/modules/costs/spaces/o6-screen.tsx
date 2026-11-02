import { can, getViewer } from "@/modules/access";
import {
  CostMonthsCard,
  MultipliersCard,
  athensMonthStart,
  catalogueCaps,
  getCostHint,
  listCostMonths,
} from "@/modules/catalogue";
import {
  PaymentMethodsCard,
  financeCaps,
  listPaymentMethods,
  type PaymentMethod,
} from "@/modules/finance";
import { recentChanges } from "@/modules/settings";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  O6_AUDIT_ENTITIES,
  changeRowsOf,
  hourCostOf,
  methodItemsOf,
} from "./o6-adapter";
import {
  AdminCost,
  MethodsList,
  RecentChanges,
  SettingsTabs,
} from "./o6-parts";

import "./o6.css";

// O6 Ρυθμίσεις Οικονομικών στη νέα εμφάνιση (prototype `screens/O6.tsx`). Η σελίδα ανοίγει σε όποιον «Βλέπει κόστος»·
// τα έξοδα, οι ώρες και το Εύρος τιμής φαίνονται και αλλάζουν μόνο με «Διαχειρίζεται κόστος».
// Οι φόρμες (Κόστος ώρας, Εύρος τιμής, Τρόποι είσπραξης) είναι τα πραγματικά components των modules με [data-tw]: τα
// actions τους δεν εξάγονται, οπότε δεν γίνεται να τα καλέσει φόρμα του prototype.

function Methods({
  methods,
  canManage,
}: {
  methods: readonly PaymentMethod[];
  canManage: boolean;
}) {
  if (!canManage) return <MethodsList items={methodItemsOf(methods)} />;
  return (
    <div className="o-card" data-tw>
      <PaymentMethodsCard methods={methods} canManage />
    </div>
  );
}

async function O6Body({ canManageCost }: { canManageCost: boolean }) {
  const viewer = await getViewer();
  const [months, hint, changes, methods] = await Promise.all([
    canManageCost ? listCostMonths() : null,
    getCostHint(),
    recentChanges(O6_AUDIT_ENTITIES),
    listPaymentMethods(),
  ]);
  if ((months && !months.ok) || !hint.ok || !hint.data)
    return <ErrorNotice what="τις Ρυθμίσεις Οικονομικών" />;
  const canSeeAudit = can(viewer, "audit.view");
  return (
    <>
      {/* Οι Τρόποι είσπραξης έχουν δικό τους Δικαίωμα· αν δεν φορτώσουν, μένει η υπόλοιπη σελίδα. */}
      {methods.ok ? (
        <Methods
          methods={methods.data}
          canManage={financeCaps(viewer).canManageMethods}
        />
      ) : (
        <ErrorNotice what="οι Τρόποι είσπραξης" />
      )}
      {months?.ok ? (
        <>
          <div className="o-card" data-tw>
            <CostMonthsCard
              months={months.data}
              hint={hint.data}
              current={athensMonthStart()}
              canManage
            />
          </div>
          <div className="o-card" data-tw>
            <MultipliersCard
              multipliers={hint.data.multipliers}
              overrunPercent={hint.data.overrunPercent}
              canManage
            />
          </div>
        </>
      ) : (
        <AdminCost glance={hourCostOf(hint.data)} />
      )}
      {changes.ok && (changes.data.length > 0 || canSeeAudit) && (
        <RecentChanges
          rows={changeRowsOf(changes.data)}
          canSeeAudit={canSeeAudit}
        />
      )}
    </>
  );
}

export async function SpacesFinanceSettings() {
  const caps = catalogueCaps(await getViewer());
  return (
    <div data-spaces>
      <SettingsTabs code="O6" />
      {caps.canSeeCost ? (
        <O6Body canManageCost={caps.canManageCost} />
      ) : (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τα στοιχεία κόστους τα βλέπει όποιος «Βλέπει κόστος και κερδοφορία».
        </StateNotice>
      )}
    </div>
  );
}
