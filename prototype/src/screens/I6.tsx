import Link from "next/link";

import { MONTH_COSTS } from "@/data/finance";
import {
  TODAY,
  financeCapsOf,
  findMonthCost,
  isClosedMonth,
} from "@/data/finance-access";
import type { RoleId } from "@/data/roles";
import { I6Editor } from "@/screens/i6-editor";
import { HourCostHistory } from "@/screens/i6-history";
import { fmtMonth } from "@/screens/i6-model";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./i67.css";

const CURRENT = TODAY.slice(0, 7);

interface TabsProps {
  role: RoleId;
  month: string;
  state: string | undefined;
}

function MonthTabs({ role, month, state }: TabsProps) {
  return (
    <nav className="tabs" aria-label="Μήνας">
      {MONTH_COSTS.map((m) => (
        <Link
          key={m.month}
          className="tab"
          aria-current={m.month === month ? "page" : undefined}
          href={screenHref(role, "I6", {
            month: m.month === CURRENT ? undefined : m.month,
            state,
          })}
        >
          {fmtMonth(m.month)}
        </Link>
      ))}
    </nav>
  );
}

function Body({ role, query, isEmpty }: ScreenProps & { isEmpty: boolean }) {
  const caps = financeCapsOf(role);
  const month = query.month ?? CURRENT;
  const cost = isEmpty ? undefined : findMonthCost(month);
  const closed = isClosedMonth(month);
  return (
    <>
      <MonthTabs role={role} month={month} state={query.state} />
      <p className="note">
        Ένας μήνας κλείνει αυτόματα όταν τελειώσει. Ο νέος μήνας ξεκινά ως
        αντίγραφο του προηγούμενου.
      </p>
      {!cost ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν έξοδα για αυτόν τον μήνα">
          Δεν έχει καταχωρηθεί κόστος για τον μήνα που διάλεξες.
        </StateNotice>
      ) : (
        <>
          {closed && <Badge>κλεισμένος μήνας: μόνο ανάγνωση</Badge>}
          {!closed && !caps.canManageCost && (
            <p className="note">Βλέπεις τα έξοδα χωρίς επεξεργασία.</p>
          )}
          <I6Editor
            key={month}
            categories={cost.categories}
            productiveHours={cost.productiveHours}
            editable={caps.canManageCost && !closed}
          />
        </>
      )}
      <HourCostHistory />
    </>
  );
}

export function I6({ role, query }: ScreenProps) {
  const caps = financeCapsOf(role);
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="I6"
      state={state}
      keep={{ month: query.month }}
    />
  );
  if (!caps.canSeeCost) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τα έξοδα και το Κόστος ώρας τα βλέπουν όσοι βλέπουν κόστος.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τα Έξοδα και το Κόστος ώρας" />
      </>
    );
  }
  return (
    <>
      {header}
      <Body role={role} query={query} isEmpty={state === "empty"} />
    </>
  );
}
