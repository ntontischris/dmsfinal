import Link from "next/link";

import {
  balanceOf,
  clientScope,
  financeCapsOf,
  ledgerOf,
  openBillables,
  overdueOf,
  toInvoiceOf,
} from "@/data/finance-access";
import { KYPSELI_ID, SALES_CLIENTS, findClient } from "@/data/sales";
import { BalanceCards, PaymentCard, ToInvoiceCard } from "@/screens/i5-cards";
import { LedgerTable } from "@/screens/i5-ledger";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./i245.css";

const clientIdOf = (role: ScreenProps["role"], query: ScreenProps["query"]) =>
  clientScope(role) ??
  (findClient(query.client) ? (query.client ?? KYPSELI_ID) : KYPSELI_ID);

function ClientPicker(props: {
  role: ScreenProps["role"];
  current: string;
  state?: string;
}) {
  return (
    <nav className="tabs" aria-label="Πελάτης">
      {SALES_CLIENTS.map((c) => (
        <Link
          key={c.id}
          className="tab"
          aria-current={c.id === props.current ? "page" : undefined}
          href={screenHref(props.role, "I5", {
            client: c.id,
            state: props.state,
          })}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

export function I5({ role, query }: ScreenProps) {
  const caps = financeCapsOf(role);
  const state = parseState(query.state);
  const clientId = clientIdOf(role, query);
  const header = (
    <StateSwitcher
      role={role}
      code="I5"
      state={state}
      keep={{ client: caps.isClient ? undefined : clientId }}
    />
  );
  if (!caps.canSee) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Η Καρτέλα Πελάτη δεν είναι διαθέσιμη για τον ρόλο σου.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="την Καρτέλα Πελάτη" />
      </>
    );
  }
  return (
    <>
      {header}
      {!caps.isClient && (
        <ClientPicker role={role} current={clientId} state={query.state} />
      )}
      <I5Body role={role} clientId={clientId} isEmpty={state === "empty"} />
    </>
  );
}

function I5Body(props: {
  role: ScreenProps["role"];
  clientId: string;
  isEmpty: boolean;
}) {
  const { role, clientId, isEmpty } = props;
  const isClient = financeCapsOf(role).isClient;
  const rows = isEmpty ? [] : ledgerOf(clientId);
  return (
    <>
      <h2>{findClient(clientId)?.name}</h2>
      <BalanceCards
        balance={isEmpty ? 0 : balanceOf(clientId)}
        overdue={isEmpty ? 0 : overdueOf(clientId)}
        isClient={isClient}
      />
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Καμία κίνηση">
          Δεν υπάρχουν Τιμολόγια ή Εισπράξεις για αυτόν τον Πελάτη.
        </StateNotice>
      ) : (
        <LedgerTable rows={rows} />
      )}
      <p className="note">
        Μόνο το Τιμολόγιο δημιουργεί οφειλή. Αρνητικό υπόλοιπο σημαίνει υπόλοιπο
        υπέρ του πελάτη (π.χ. προκαταβολή), που συμψηφίζεται με το επόμενο
        Τιμολόγιο.
      </p>
      <div className="grid2">
        <PaymentCard />
        {!isClient && (
          <ToInvoiceCard
            role={role}
            amount={toInvoiceOf(clientId)}
            count={openBillables(clientId).length}
          />
        )}
      </div>
    </>
  );
}
