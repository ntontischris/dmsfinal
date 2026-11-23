import { can, getViewer } from "@/modules/access";
import {
  catalogueCaps,
  formatMoney,
  formatMonth,
  getCostHint,
  listCostMonths,
  type CostHint,
} from "@/modules/catalogue";
import {
  financeCaps,
  listPaymentMethods,
  listWithholdingRates,
  restoreMethod,
  restoreWithholdingRate,
  retireMethod,
  retireWithholdingRate,
  saveMethod,
  saveWithholdingRate,
  type PaymentMethod,
} from "@/modules/finance";
import { SpacesSettingsTabs, recentChanges } from "@/modules/settings";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  O6_AUDIT_ENTITIES,
  changeRowsOf,
  hourCostOf,
  methodItemsOf,
} from "./o6-adapter";
import { CostMonthsGlance, RangeCard } from "./o6-cost";
import { MethodsEditor } from "./o6-methods";
import { WithholdingEditor } from "./o6-withholding";
import { AdminCost, MethodsList, RecentChanges } from "./o6-parts";

import "../../finance/spaces/money-lines.css";
import "./o6.css";

// O6 Ρυθμίσεις Οικονομικών στη νέα εμφάνιση (prototype `screens/O6.tsx`). Η σελίδα ανοίγει σε όποιον «Βλέπει κόστος»·
// τα έξοδα, οι ώρες και το Εύρος τιμής φαίνονται και αλλάζουν μόνο με «Διαχειρίζεται κόστος».
// Οι Τρόποι είσπραξης αλλάζουν με «Διαχειρίζεται Ρυθμίσεις» (όπως η κλασική), στη μορφή του ListEditor.
// Το «Προεπιλεγμένο περιθώριο» του prototype δεν υπάρχει στη βάση.
// Χάρτης d7: τα Έξοδα και οι ώρες του μήνα γράφονται σε ένα μόνο σημείο, την I6 «Έξοδα και Κόστος ώρας»· εδώ μένουν οι
// κανόνες (Τρόποι είσπραξης, παρακράτηση, Εύρος τιμής, όριο Υπέρβασης) και μια ματιά στους μήνες με σύνδεσμο στην I6.
function Methods({
  methods,
  canManage,
}: {
  methods: readonly PaymentMethod[];
  canManage: boolean;
}) {
  if (!canManage) return <MethodsList items={methodItemsOf(methods)} />;
  return (
    <MethodsEditor
      methods={methods}
      actions={{
        save: saveMethod,
        retire: retireMethod,
        restore: restoreMethod,
      }}
    />
  );
}

// Η παρακράτηση φόρου (d6) αλλάζει μόνο από όποιον «Διαχειρίζεται Ρυθμίσεις»· οι άλλοι δεν τη χρειάζονται εδώ.
function Withholding({
  rates,
  canManage,
}: {
  rates: Awaited<ReturnType<typeof listWithholdingRates>>;
  canManage: boolean;
}) {
  if (!canManage) return null;
  if (!rates.ok) return <ErrorNotice what="τα ποσοστά παρακράτησης" />;
  return (
    <WithholdingEditor
      rates={rates.data}
      actions={{
        save: saveWithholdingRate,
        retire: retireWithholdingRate,
        restore: restoreWithholdingRate,
      }}
    />
  );
}

// Η κεφαλίδα: τι κάνεις εδώ, και (για όποιον «Διαχειρίζεται κόστος») το Κόστος ώρας που ισχύει.
function O6Hero({ hint }: { hint: CostHint | null }) {
  const hourCost = hint?.hourCost ?? null;
  const month = hint?.hourCostMonth ?? null;
  return (
    <header className="ml-hero o6-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        €
      </span>
      <div>
        <Badge tone="strong">Ρυθμίσεις Οικονομικών</Badge>
        <p className="muted">
          Οι κανόνες των χρημάτων: πώς εισπράττεις, τι παρακρατείται και πόσο
          τιμολογείς πάνω από το κόστος.
        </p>
      </div>
      {hourCost !== null && month !== null && (
        <p className="ml-hero-amount">
          {formatMoney(hourCost)}
          <small>
            Κόστος ώρας που ισχύει: {formatMoney(hourCost)} (
            {formatMonth(month)})
          </small>
        </p>
      )}
    </header>
  );
}

async function O6Body({ canManageCost }: { canManageCost: boolean }) {
  const viewer = await getViewer();
  const canManageMethods = financeCaps(viewer).canManageMethods;
  const [months, hint, changes, methods, rates] = await Promise.all([
    canManageCost ? listCostMonths() : null,
    getCostHint(),
    recentChanges(O6_AUDIT_ENTITIES),
    listPaymentMethods(),
    listWithholdingRates(),
  ]);
  if ((months && !months.ok) || !hint.ok || !hint.data)
    return <ErrorNotice what="τις Ρυθμίσεις Οικονομικών" />;
  const canSeeAudit = can(viewer, "audit.view");
  return (
    <>
      <O6Hero hint={months?.ok ? hint.data : null} />
      <div className="ml-stack">
        {/* Οι Τρόποι είσπραξης έχουν δικό τους Δικαίωμα· αν δεν φορτώσουν, μένει η υπόλοιπη σελίδα. */}
        {methods.ok ? (
          <Methods methods={methods.data} canManage={canManageMethods} />
        ) : (
          <ErrorNotice what="οι Τρόποι είσπραξης" />
        )}
        <Withholding rates={rates} canManage={canManageMethods} />
        {months?.ok ? (
          <>
            <CostMonthsGlance months={months.data} />
            <RangeCard hint={hint.data} />
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
      </div>
    </>
  );
}

export async function SpacesFinanceSettings() {
  const caps = catalogueCaps(await getViewer());
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="O6" />
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
