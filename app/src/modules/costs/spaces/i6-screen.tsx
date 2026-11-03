import Link from "next/link";

import { getViewer } from "@/modules/access";
import {
  athensMonthStart,
  catalogueCaps,
  listCostMonths,
} from "@/modules/catalogue";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import type { MonthExpenses } from "../expenses-schema";
import { getMonthExpenses } from "../queries-expenses";
import {
  historyRowsOf,
  monthOfParam,
  monthTabsOf,
  paramOfMonth,
  seedOf,
  type EditorSeed,
  type HistoryRow,
} from "./i6-adapter";
import { I6Editor } from "./i6-editor";
import { HourCostHistory } from "./i6-history";
import { fmtMonth } from "./i6-model";

import "./i67.css";

// I6 Έξοδα και Κόστος ώρας στη νέα εμφάνιση (prototype `screens/I6.tsx`). Τη βλέπει όποιος «Βλέπει κόστος και
// κερδοφορία»· τα έξοδα και τις ώρες τα αλλάζει όποιος «Διαχειρίζεται κόστος» (όπως η O6), μόνο σε τρέχοντα ή επόμενο μήνα.
// Το «Καταχωρεί Έξοδα» του prototype (Λογιστής) δεν υπάρχει ακόμα ως Δικαίωμα.

interface TabsProps {
  tabs: readonly string[];
  month: string;
  current: string;
}

function MonthTabs({ tabs, month, current }: TabsProps) {
  return (
    <nav className="tabs" aria-label="Μήνας">
      {tabs.map((m) => (
        <Link
          key={m}
          className="tab"
          aria-current={m === month ? "page" : undefined}
          href={hrefOf("I6", { month: paramOfMonth(m, current) })}
        >
          {fmtMonth(m)}
        </Link>
      ))}
    </nav>
  );
}

function SeedNote({ seed }: { seed: EditorSeed }) {
  if (seed.source === "copy" && seed.copiedFrom)
    return (
      <p className="note">
        Ο μήνας δεν έχει αποθηκευτεί ακόμα: ξεκινά ως αντίγραφο του{" "}
        {fmtMonth(seed.copiedFrom)}. Με την «Αποθήκευση» ισχύει.
      </p>
    );
  if (seed.source === "total")
    return (
      <p className="note">
        Ο μήνας έχει μόνο σύνολο εξόδων, χωρίς ανάλυση. Όταν προσθέσεις γραμμές,
        το σύνολο βγαίνει από αυτές.
      </p>
    );
  return null;
}

function MonthBody({ view }: { view: MonthExpenses }) {
  const seed = seedOf(view);
  const isUnsaved = view.saved === null;
  if (!seed || (isUnsaved && !view.canEdit))
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν έξοδα για αυτόν τον μήνα">
        Δεν έχει καταχωρηθεί κόστος για τον μήνα που διάλεξες.
      </StateNotice>
    );
  return (
    <>
      {view.isClosed && <Badge>κλεισμένος μήνας: μόνο ανάγνωση</Badge>}
      {!view.isClosed && !view.canEdit && (
        <p className="note">Βλέπεις τα έξοδα χωρίς επεξεργασία.</p>
      )}
      {view.canEdit && <SeedNote seed={seed} />}
      <I6Editor
        key={view.month}
        month={view.month}
        categories={seed.categories}
        productiveHours={seed.productiveHours}
        baseTotal={seed.baseTotal}
        editable={view.canEdit}
        canEditHours={view.canEdit}
      />
    </>
  );
}

interface BodyProps {
  view: MonthExpenses;
  tabs: readonly string[];
  current: string;
  history: readonly HistoryRow[];
}

function Body({ view, tabs, current, history }: BodyProps) {
  return (
    <>
      <MonthTabs tabs={tabs} month={view.month} current={current} />
      <p className="note">
        Ένας μήνας κλείνει αυτόματα όταν τελειώσει. Ο νέος μήνας ξεκινά ως
        αντίγραφο του προηγούμενου.
      </p>
      <MonthBody view={view} />
      <HourCostHistory rows={history} />
    </>
  );
}

async function I6Body({ monthParam }: { monthParam: string | undefined }) {
  const current = athensMonthStart();
  const month = monthOfParam(monthParam, current);
  const [view, months] = await Promise.all([
    getMonthExpenses(month),
    listCostMonths(),
  ]);
  if (!view.ok || !months.ok)
    return <ErrorNotice what="τα Έξοδα και το Κόστος ώρας" />;
  const saved = months.data.map((m) => m.month);
  return (
    <Body
      view={view.data}
      tabs={monthTabsOf(saved, current, month)}
      current={current}
      history={historyRowsOf(months.data, current)}
    />
  );
}

export async function SpacesExpenses({ month }: { month?: string }) {
  const caps = catalogueCaps(await getViewer());
  return (
    <div data-spaces>
      {caps.canSeeCost ? (
        <I6Body monthParam={month} />
      ) : (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τα έξοδα και το Κόστος ώρας τα βλέπουν όσοι «Βλέπουν κόστος και
          κερδοφορία».
        </StateNotice>
      )}
    </div>
  );
}
