import Link from "next/link";

import { getViewer } from "@/modules/access";
import { athensMonthStart } from "@/modules/catalogue";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { costsCaps } from "../caps";
import { listProfitability } from "../queries-expenses";
import { firstMonthOf } from "./i7-adapter";
import { allRows, byClient, byMonth, type ProductionRow } from "./i7-model";
import { GroupTable, ProductionTable } from "./i7-tables";

import "./i67.css";

// I7 Κερδοφορία στη νέα εμφάνιση (prototype `screens/I7.tsx`): τιμή απέναντι στο πραγματικό κόστος, ανά Παραγωγή, Πελάτη
// και μήνα, για τους τελευταίους μήνες ως τον τρέχοντα. Μόνο όσοι «Βλέπουν κόστος και κερδοφορία»· η βάση ξαναελέγχει.

const VIEWS = ["παραγωγή", "πελάτης", "μήνας"] as const;
type View = (typeof VIEWS)[number];
const MONTHS_BACK = 12;

const parseView = (value: string | undefined): View =>
  VIEWS.find((v) => v === value) ?? VIEWS[0];

function ViewTabs({ view }: { view: View }) {
  return (
    <nav className="tabs" aria-label="Προβολή κερδοφορίας">
      {VIEWS.map((v) => (
        <Link
          key={v}
          className="tab"
          aria-current={v === view ? "page" : undefined}
          href={hrefOf("I7", { view: v === VIEWS[0] ? undefined : v })}
        >
          {v}
        </Link>
      ))}
    </nav>
  );
}

function Body({ view, rows }: { view: View; rows: readonly ProductionRow[] }) {
  if (rows.length === 0) {
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Παραγωγές για κερδοφορία">
        Όταν υπάρξουν Παραγωγές με τιμή και κόστος, θα εμφανιστούν εδώ.
      </StateNotice>
    );
  }
  if (view === "παραγωγή") {
    return <ProductionTable rows={rows} />;
  }
  return view === "πελάτης" ? (
    <GroupTable groups={byClient(rows)} isMonth={false} />
  ) : (
    <GroupTable groups={byMonth(rows)} isMonth />
  );
}

async function I7Body({ view }: { view: View }) {
  const current = athensMonthStart();
  const result = await listProfitability(
    firstMonthOf(current, MONTHS_BACK),
    current,
  );
  if (!result.ok) return <ErrorNotice what="την Κερδοφορία" />;
  return (
    <>
      <p className="note">
        Ο Τζίρος (Τιμολόγια) είναι στις Αναφορές· εδώ μετρά η τιμή της
        Παραγωγής.
      </p>
      <ViewTabs view={view} />
      <Body view={view} rows={allRows(result.data)} />
    </>
  );
}

export async function SpacesProfitability({ view }: { view?: string }) {
  const viewer = await getViewer();
  return (
    <div data-spaces>
      {costsCaps(viewer).canView ? (
        <I7Body view={parseView(view)} />
      ) : (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την Κερδοφορία τη βλέπουν όσοι βλέπουν κόστος.
        </StateNotice>
      )}
    </div>
  );
}
