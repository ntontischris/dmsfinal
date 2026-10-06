import Link from "next/link";

import { TODAY, financeCapsOf, revenueOf } from "@/data/finance-access";
import {
  INVOICE_FILTERS,
  parseFilter,
  standingsFor,
  sumRemaining,
  visibleStandings,
} from "@/screens/i2-model";
import { InvoiceTable } from "@/screens/i2-table";
import { CsvButton } from "@/screens/i2-ui";
import { VoidedCard } from "@/screens/i2-voided";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtMoney,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./i245.css";

function Totals({ all }: { all: ReturnType<typeof standingsFor> }) {
  const month = TODAY.slice(0, 7);
  const items = [
    ["Τζίρος μήνα", revenueOf(`${month}-01`, `${month}-31`)],
    ["Ανεξόφλητα", sumRemaining(all)],
    [
      "Ληξιπρόθεσμα",
      sumRemaining(all.filter((s) => s.status === "ληξιπρόθεσμο")),
    ],
  ] as const;
  return (
    <div className="i245-totals">
      {items.map(([label, value]) => (
        <section key={label} className="card">
          <div className="muted">{label}</div>
          <div className="i245-big">{fmtMoney(value)}</div>
        </section>
      ))}
    </div>
  );
}

function FilterTabs(props: {
  role: ScreenProps["role"];
  filter: string;
  state?: string;
}) {
  return (
    <nav className="tabs" aria-label="Φίλτρο Τιμολογίων">
      {INVOICE_FILTERS.map((f) => (
        <Link
          key={f}
          className="tab"
          aria-current={f === props.filter ? "page" : undefined}
          href={screenHref(props.role, "I2", {
            filter: f === "όλα" ? undefined : f,
            state: props.state,
          })}
        >
          {f}
        </Link>
      ))}
    </nav>
  );
}

export function I2({ role, query }: ScreenProps) {
  const caps = financeCapsOf(role);
  const state = parseState(query.state);
  const filter = parseFilter(query.filter);
  const header = (
    <StateSwitcher
      role={role}
      code="I2"
      state={state}
      keep={{ filter: query.filter }}
    />
  );
  if (!caps.canSee) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τα Τιμολόγια δεν είναι διαθέσιμα για τον ρόλο σου.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τα Τιμολόγια" />
      </>
    );
  }
  return (
    <>
      {header}
      <I2Body role={role} query={query} filter={filter} isEmpty={state === "empty"} />
    </>
  );
}

interface I2BodyProps extends ScreenProps {
  filter: ReturnType<typeof parseFilter>;
  isEmpty: boolean;
}

function I2Body({ role, query, filter, isEmpty }: I2BodyProps) {
  const caps = financeCapsOf(role);
  const all = isEmpty ? [] : standingsFor(role);
  const rows = visibleStandings(all, filter);
  return (
    <>
      {!caps.isClient && <Totals all={all} />}
      <FilterTabs role={role} filter={filter} state={query.state} />
      <div className="toolbar">
        {caps.canRegisterInvoices && (
          <Link
            className="button"
            data-primary="true"
            href={screenHref(role, "I3", {})}
          >
            Καταχώρηση Τιμολογίου
          </Link>
        )}
        {role === "accountant" && <CsvButton />}
      </div>
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Κανένα Τιμολόγιο">
          Δεν υπάρχει Τιμολόγιο για αυτό το φίλτρο.
        </StateNotice>
      ) : (
        <InvoiceTable
          role={role}
          rows={rows}
          showClient={!caps.isClient}
          showTrail={!caps.isClient}
          canEdit={caps.canRegisterInvoices}
        />
      )}
      {!caps.isClient && !isEmpty && filter === "όλα" && (
        <VoidedCard />
      )}
    </>
  );
}
