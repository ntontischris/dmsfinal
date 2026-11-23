import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { athensMonthStart } from "@/modules/catalogue";
import { ErrorNotice, StateNotice, fmtMoney } from "@/spaces/screens/shared";

import { costsCaps } from "../caps";
import { listProfitability } from "../queries-expenses";
import { firstMonthOf } from "./i7-adapter";
import { ProductionLines } from "./i7-lines";
import { allRows, byClient, byMonth, marginText, type ProductionRow } from "./i7-model";
import { GroupTable, ProductionTable } from "./i7-tables";
import { signOf, totalsOf } from "./i7-totals";

import "../../finance/spaces/money-lines.css";
import "./i67.css";

// I7 Κερδοφορία στη νέα εμφάνιση (prototype `screens/I7.tsx`): τιμή απέναντι στο πραγματικό κόστος, ανά Παραγωγή, Πελάτη
// και μήνα, για τους τελευταίους μήνες ως τον τρέχοντα. Μόνο όσοι «Βλέπουν κόστος και κερδοφορία»· η βάση ξαναελέγχει.
// Εμφάνιση «Χρημάτων» (όπως η I8): κεφαλίδα με το συνολικό κέρδος, κάθε Παραγωγή μία γραμμή, και οι αναλυτικοί πίνακες
// (ανά Παραγωγή, Πελάτη, μήνα) σε κλειστά κουτιά. Το ?view=πελάτης|μήνας|παραγωγή ανοίγει το αντίστοιχο κουτί.

const VIEWS = ["παραγωγή", "πελάτης", "μήνας"] as const;
type View = (typeof VIEWS)[number];
const MONTHS_BACK = 12;

const parseView = (value: string | undefined): View | null =>
  VIEWS.find((v) => v === value) ?? null;

const countText = (n: number): string =>
  n === 1 ? "1 Παραγωγή" : `${n} Παραγωγές`;

function Box(props: {
  title: string;
  hint: string;
  isOpen: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <details className="ml-box" open={props.isOpen || undefined}>
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div>{props.children}</div>
      </details>
    </section>
  );
}

function Hero({ rows }: { rows: readonly ProductionRow[] }) {
  const t = totalsOf(rows);
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        %
      </span>
      <div>
        <h1>Κέρδος ανά Παραγωγή</h1>
        <p>
          Τι έμεινε από κάθε δουλειά: η τιμή της Παραγωγής μείον το πραγματικό
          κόστος, τους τελευταίους {MONTHS_BACK} μήνες.
        </p>
        <p className="ml-hero-amount i7-profit" data-sign={signOf(t.profit)}>
          {fmtMoney(t.profit)}
          <small>
            κέρδος · περιθώριο {marginText(t.price, t.cost)} · τιμή{" "}
            {fmtMoney(t.price)} · κόστος {fmtMoney(t.cost)}
          </small>
        </p>
        <p>
          Μετρούν {countText(t.counted)} Πελατών
          {t.missing > 0 && ` · ${t.missing} χωρίς πραγματικές ώρες δεν μετρούν`}
          {t.internalCost > 0 &&
            ` · εσωτερική δουλειά ${fmtMoney(t.internalCost)}`}
        </p>
        <p className="note">
          Ο Τζίρος (Τιμολόγια) είναι στις Αναφορές· εδώ μετρά η τιμή της
          Παραγωγής.
        </p>
      </div>
    </header>
  );
}

function Tables({ rows, open }: { rows: readonly ProductionRow[]; open: View | null }) {
  const clients = byClient(rows);
  const months = byMonth(rows);
  return (
    <>
      <Box
        title="Πίνακας ανά Παραγωγή"
        hint={`${countText(rows.length)} · τιμή, εκτιμώμενο και πραγματικό κόστος, σήματα`}
        isOpen={open === "παραγωγή"}
      >
        <ProductionTable rows={rows} />
      </Box>
      <Box
        title="Ανά Πελάτη"
        hint={clients.length === 1 ? "1 Πελάτης" : `${clients.length} Πελάτες`}
        isOpen={open === "πελάτης"}
      >
        <GroupTable groups={clients} isMonth={false} />
      </Box>
      <Box
        title="Ανά μήνα"
        hint={`${new Set(rows.map((r) => r.month)).size} μήνες · η εσωτερική δουλειά χωριστά`}
        isOpen={open === "μήνας"}
      >
        <GroupTable groups={months} isMonth />
      </Box>
    </>
  );
}

async function I7Body({ open }: { open: View | null }) {
  const current = athensMonthStart();
  const result = await listProfitability(
    firstMonthOf(current, MONTHS_BACK),
    current,
  );
  if (!result.ok) return <ErrorNotice what="την Κερδοφορία" />;
  const rows = allRows(result.data);
  if (rows.length === 0)
    return (
      <StateNotice kind="empty" title="Δεν υπάρχουν Παραγωγές για κερδοφορία">
        Όταν υπάρξουν Παραγωγές με τιμή και κόστος, θα εμφανιστούν εδώ.
      </StateNotice>
    );
  return (
    <div className="ml-stack">
      <Hero rows={rows} />
      <ProductionLines rows={rows} />
      <Tables rows={rows} open={open} />
    </div>
  );
}

export async function SpacesProfitability({ view }: { view?: string }) {
  const viewer = await getViewer();
  return (
    <div data-spaces>
      {costsCaps(viewer).canView ? (
        <I7Body open={parseView(view)} />
      ) : (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την Κερδοφορία τη βλέπουν όσοι βλέπουν κόστος.
        </StateNotice>
      )}
    </div>
  );
}
