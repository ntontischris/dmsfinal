import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import {
  athensMonthStart,
  catalogueCaps,
  formatHours,
  formatMoney,
  formatMonth,
  getCostHint,
  listCostMonths,
  saveMultipliers,
  type CostHint,
  type CostMonth,
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
import {
  SaveRow,
  SettingsCard,
  SettingsForm,
  SpacesSettingsTabs,
  recentChanges,
} from "@/modules/settings";
import { hrefOf } from "@/spaces/data/screens";
import { ListRow, RowList } from "@/spaces/kit/parts";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  fmtPercent,
} from "@/spaces/screens/shared";

import {
  O6_AUDIT_ENTITIES,
  changeRowsOf,
  hourCostOf,
  methodItemsOf,
  monthRowsOf,
  multiplierRowsOf,
} from "./o6-adapter";
import { decimalText } from "./o6-live";
import { MethodsEditor } from "./o6-methods";
import { WithholdingEditor } from "./o6-withholding";
import { AdminCost, MethodsList, RecentChanges } from "./o6-parts";

import "./o6.css";

// O6 Ρυθμίσεις Οικονομικών στη νέα εμφάνιση (prototype `screens/O6.tsx`). Η σελίδα ανοίγει σε όποιον «Βλέπει κόστος»·
// τα έξοδα, οι ώρες και το Εύρος τιμής φαίνονται και αλλάζουν μόνο με «Διαχειρίζεται κόστος».
// Οι Τρόποι είσπραξης αλλάζουν με «Διαχειρίζεται Ρυθμίσεις» (όπως η κλασική), στη μορφή του ListEditor.
// Το «Προεπιλεγμένο περιθώριο» του prototype δεν υπάρχει στη βάση.
// Χάρτης d7: τα Έξοδα και οι ώρες του μήνα γράφονται σε ένα μόνο σημείο, την I6 «Έξοδα και Κόστος ώρας»· εδώ μένουν οι
// κανόνες (Τρόποι είσπραξης, παρακράτηση, Εύρος τιμής, όριο Υπέρβασης) και μια ματιά στους μήνες με σύνδεσμο στην I6.
const RANGE_NOTE =
  "Είναι οδηγός δίπλα στην τιμή κάθε Πακέτου ή Υπηρεσίας (κόστος × πολλαπλασιαστής)· την τιμή τη γράφεις πάντα εσύ.";

const STATUS_TONE = {
  closed: undefined,
  current: "ok",
  future: "strong",
} as const;

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
      actions={{ save: saveMethod, retire: retireMethod, restore: restoreMethod }}
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

function MonthList({
  months,
  current,
}: {
  months: readonly CostMonth[];
  current: string;
}) {
  const rows = monthRowsOf(months, current, {
    money: formatMoney,
    hours: formatHours,
  });
  if (rows.length === 0) return null;
  return (
    <RowList>
      {rows.map((row) => (
        <ListRow
          key={row.month}
          isFaded={row.status === "closed"}
          title={row.label}
          sub={row.sub}
          aside={
            <>
              <strong>{formatMoney(row.expenses)}</strong>
              <Badge tone={STATUS_TONE[row.status]}>{row.statusLabel}</Badge>
            </>
          }
        />
      ))}
    </RowList>
  );
}

// «Έξοδα και ώρες»: μόνο ανάγνωση. Τα αλλάζει η I6, η μία θέση του κόστους (d7).
function CostMonthsGlance({ months }: { months: readonly CostMonth[] }) {
  return (
    <SettingsCard title="Έξοδα και ώρες">
      <MonthList months={months} current={athensMonthStart()} />
      <p className="btn-row">
        <Link className="button" data-primary="true" href={hrefOf("I6")}>
          Έξοδα και Κόστος ώρας
        </Link>
      </p>
      <p className="muted o-hint">
        Τα Έξοδα και οι Παραγωγικές ώρες κάθε μήνα γράφονται εκεί· από αυτά
        βγαίνει το Κόστος ώρας.
      </p>
    </SettingsCard>
  );
}

function InForce({ hint }: { hint: CostHint }) {
  if (hint.hourCostMonth === null || hint.hourCost === null) return null;
  return (
    <p className="muted o-hint">
      Κόστος ώρας που ισχύει: {formatMoney(hint.hourCost)} (
      {formatMonth(hint.hourCostMonth)})
    </p>
  );
}

function MultiplierRows({ hint }: { hint: CostHint }) {
  return (
    <RowList>
      {multiplierRowsOf(hint.multipliers).map((row) => (
        <ListRow
          key={row.name}
          title={row.label}
          sub={
            <>
              Ελάχιστο περιθώριο: {fmtPercent(row.margin)}
              <span className="muted"> (1 − 1/{decimalText(row.factor)})</span>
            </>
          }
          aside={
            <label className="o5-days">
              <span className="part-sub">Πολλαπλασιαστής</span>
              <input
                className="input"
                name={row.name}
                inputMode="decimal"
                required
                aria-label={`Πολλαπλασιαστής ${row.label}`}
                defaultValue={decimalText(row.factor)}
              />
            </label>
          }
        />
      ))}
    </RowList>
  );
}

// «Εύρος τιμής και Υπέρβαση κόστους»: οι τρεις πολλαπλασιαστές και το ποσοστό υπέρβασης, στο πραγματικό `saveMultipliers`.
function RangeCard({ hint }: { hint: CostHint }) {
  return (
    <SettingsForm action={saveMultipliers}>
      <SettingsCard title="Εύρος τιμής και Υπέρβαση κόστους">
        <MultiplierRows hint={hint} />
        <div className="o-fields">
          <span className="stack o-field">
            <label htmlFor="o6-overrun">Όριο Υπέρβασης κόστους (%)</label>
            <input
              id="o6-overrun"
              className="input"
              name="overrunPercent"
              inputMode="decimal"
              required
              defaultValue={decimalText(hint.overrunPercent)}
            />
            <span className="muted o-hint">
              Πάνω από αυτό, η Παραγωγή σημαίνεται «Υπέρβαση» στο Κόστος και
              ώρες· δεν μπλοκάρει τίποτα.
            </span>
          </span>
        </div>
        <SaveRow card="range" />
        <p className="muted o-hint">{RANGE_NOTE}</p>
      </SettingsCard>
    </SettingsForm>
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
      {/* Οι Τρόποι είσπραξης έχουν δικό τους Δικαίωμα· αν δεν φορτώσουν, μένει η υπόλοιπη σελίδα. */}
      {methods.ok ? (
        <Methods
          methods={methods.data}
          canManage={canManageMethods}
        />
      ) : (
        <ErrorNotice what="οι Τρόποι είσπραξης" />
      )}
      <Withholding rates={rates} canManage={canManageMethods} />
      {months?.ok ? (
        <>
          <CostMonthsGlance months={months.data} />
          <InForce hint={hint.data} />
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
