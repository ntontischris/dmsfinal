import Link from "next/link";

import { NIKOS_EMAIL } from "@/data/profile";
import { findClient } from "@/data/sales";
import { CLIENT_MEMBERSHIPS, CURRENT_CLIENT_USER } from "@/data/team";
import { ClientCards, SwitchRules } from "@/screens/a4-cards";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

// A4 «Εναλλαγή Πελάτη»: μόνο Χρήστης πελάτη· χρήσιμη όταν ανήκει σε περισσότερους από έναν.
export function A4({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="A4"
      state={state}
      keep={{ ...query, state: undefined }}
    />
  );
  if (role !== "client")
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την εναλλαγή Πελάτη την έχουν μόνο οι Χρήστες πελάτη.
        </StateNotice>
      </>
    );
  if (state === "error")
    return (
      <>
        {header}
        <ErrorNotice what="τους Πελάτες σου" />
      </>
    );
  // Στο κενό (και χωρίς ?as) ο Χρήστης είναι η Μαρία, με έναν Πελάτη.
  const isNikos = query.as === "nikos" && state !== "empty";
  const email = isNikos ? NIKOS_EMAIL : CURRENT_CLIENT_USER;
  const memberships = CLIENT_MEMBERSHIPS.filter((m) => m.email === email);
  const lastUsed = [...memberships].sort((a, b) =>
    (b.lastSeen ?? "").localeCompare(a.lastSeen ?? ""),
  )[0];
  const target = memberships.find((m) => m.clientId === query.to);
  const currentId = target?.clientId ?? lastUsed?.clientId ?? "";
  const currentName = findClient(currentId)?.name ?? "";
  const hasMany = memberships.length > 1;
  const as = isNikos ? "nikos" : "";
  return (
    <>
      {header}
      <nav className="sw" aria-label="Χρήστης πελάτη">
        <span>Δες ως:</span>{" "}
        <Link
          href={screenHref(role, "A4", { state: query.state })}
          aria-current={!isNikos}
        >
          Μαρία (ένας Πελάτης)
        </Link>{" "}
        ·{" "}
        <Link
          href={screenHref(role, "A4", { as: "nikos", state: query.state })}
          aria-current={isNikos}
        >
          nikos@example.com (δύο Πελάτες)
        </Link>
      </nav>
      {!hasMany ? (
        <StateNotice kind="empty" title={`Ανήκεις μόνο στην ${currentName}`}>
          Η εναλλαγή φαίνεται όταν ανήκεις σε περισσότερους Πελάτες.
        </StateNotice>
      ) : (
        <>
          {target && (
            <p className="note" role="status">
              Άλλαξες σε {currentName}· βλέπεις μόνο τα δεδομένα της.
            </p>
          )}
          <ClientCards
            role={role}
            memberships={memberships}
            currentId={currentId}
            as={as}
          />
        </>
      )}
      <SwitchRules />
    </>
  );
}
