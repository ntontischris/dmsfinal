import Link from "next/link";

import { TODAY, financeCapsOf, revenueOf } from "@/data/finance-access";
import {
  INVOICE_FILTERS,
  parseFilter,
  standingsFor,
  sumRemaining,
  visibleStandings,
} from "@/screens/i2-model";
import { Segmented } from "@/kit/segmented";
import { StatGrid } from "@/kit/panel";
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
import "./i2.css";

function Totals({
  all,
  role,
  state,
}: {
  all: ReturnType<typeof standingsFor>;
  role: ScreenProps["role"];
  state?: string;
}) {
  const month = TODAY.slice(0, 7);
  const overdue = all.filter((s) => s.status === "ληξιπρόθεσμο");
  const overdueSum = sumRemaining(overdue);
  const open = all.filter((s) => s.remaining > 0);
  const to = (filter?: string) => screenHref(role, "I2", { filter, state });
  return (
    <StatGrid
      items={[
        {
          label: "Τζίρος μήνα",
          value: fmtMoney(revenueOf(`${month}-01`, `${month}-31`)),
        },
        {
          label: "Ανεξόφλητα",
          value: fmtMoney(sumRemaining(all)),
          hint: `${open.length} Τιμολόγια`,
          href: to("ανεξόφλητα"),
        },
        {
          label: "Ληξιπρόθεσμα",
          value: fmtMoney(overdueSum),
          hint: `${overdue.length} Τιμολόγια`,
          tone: overdueSum > 0 ? "attention" : undefined,
          href: to("ληξιπρόθεσμα"),
        },
      ]}
    />
  );
}

function FilterTabs(props: {
  role: ScreenProps["role"];
  filter: string;
  state?: string;
  all: ReturnType<typeof standingsFor>;
}) {
  return (
    <Segmented
      label="Φίλτρο Τιμολογίων"
      options={INVOICE_FILTERS.map((f) => ({
        label: f,
        isCurrent: f === props.filter,
        count: visibleStandings(props.all, f).length,
        href: screenHref(props.role, "I2", {
          filter: f === "όλα" ? undefined : f,
          state: props.state,
        }),
      }))}
    />
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
      {!caps.isClient && <Totals all={all} role={role} state={query.state} />}
      <FilterTabs role={role} filter={filter} state={query.state} all={all} />
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
