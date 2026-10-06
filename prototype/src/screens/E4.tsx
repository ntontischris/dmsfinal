import { PRODUCTIONS, findBlockedTime } from "@/data/filming";
import { filmingCapsOf, toMinutes } from "@/data/filming-access";
import { SALES_USER_ID, findClient } from "@/data/sales";
import {
  E4Form,
  type BlockedSource,
  type E4Client,
} from "@/screens/e4-form";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./e5.css";

// Πελάτες με ενεργή μηνιαία Συμφωνία (στο prototype: τα τρία παραδείγματα).
const MONTHLY: readonly E4Client[] = [
  { id: "kypseli", agreementId: "ag-kypseli-social" },
  { id: "kinisi", agreementId: "ag-kinisi-social" },
  { id: "athina", agreementId: "ag-athina-social" },
].map((item) => ({
  ...item,
  name: findClient(item.id)?.name ?? item.id,
}));

const CREW_EXAMPLE_ID = "f-kypseli-1002";
const BLOCKED_EXAMPLE_ID = "bt-dimitris-1009";

// Ο Κλεισμένος χρόνος της μετατροπής (?blocked=id από το A6), ή το παράδειγμα.
const blockedSourceOf = (id: string | undefined): BlockedSource => {
  const blocked = findBlockedTime(id) ?? findBlockedTime(BLOCKED_EXAMPLE_ID);
  return {
    title: blocked?.label ?? "—",
    date: blocked?.date ?? "2026-10-09",
    start: blocked?.from ?? "10:00",
    hours: blocked
      ? Math.max(1, (toMinutes(blocked.to) - toMinutes(blocked.from)) / 60)
      : 3,
  };
};

// Νέο Γύρισμα από την ομάδα: Ιδ · Δι · Πω (μόνο δικοί του πελάτες για τις Πωλήσεις).
export function E4({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = filmingCapsOf(role);
  const fromBlocked = query.from === "blocked";
  const clients = MONTHLY.filter(
    (item) => !caps.isScoped || findClient(item.id)?.ownerId === SALES_USER_ID,
  );
  const clientIds = clients.map((item) => item.id);
  const productions = PRODUCTIONS.filter((item) =>
    clientIds.includes(item.clientId),
  );
  return (
    <div className="e">
      <StateSwitcher
        role={role}
        code="E4"
        state={state}
        keep={{ from: query.from, blocked: query.blocked }}
      />
      <h1>{fromBlocked ? "Μετατροπή σε Γύρισμα" : "Νέο Γύρισμα"}</h1>
      {!caps.canCreate ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Νέο Γύρισμα για λογαριασμό πελάτη κλείνει όποιος «Κλείνει Γύρισμα».
          </p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="η φόρμα νέου Γυρίσματος" />
      ) : state === "empty" || clients.length === 0 ? (
        <StateNotice
          kind="empty"
          title="Κανένας πελάτης με ενεργή μηνιαία Συμφωνία"
        >
          <p>
            Γύρισμα κλείνεται για πελάτη με ενεργή μηνιαία Συμφωνία
            {caps.isScoped && " και Υπεύθυνο εσένα"}.
          </p>
        </StateNotice>
      ) : (
        <E4Form
          key={fromBlocked ? `blocked-${query.blocked ?? ""}` : "new"}
          clients={clients}
          productions={productions}
          fromBlocked={fromBlocked}
          blocked={blockedSourceOf(query.blocked)}
          crewHref={screenHref(role, "E3", { id: CREW_EXAMPLE_ID })}
        />
      )}
      <p className="note">
        Παραδείγματα: <a href={screenHref(role, "E4", {})}>νέο Γύρισμα</a> ·{" "}
        <a href={screenHref(role, "E4", { from: "blocked" })}>
          μετατροπή από Κλεισμένο χρόνο
        </a>
      </p>
    </div>
  );
}
