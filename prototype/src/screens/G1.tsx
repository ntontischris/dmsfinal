import Link from "next/link";

import {
  CREW_PEOPLE,
  PERSON_OF_ROLE,
  type ProductionStub,
} from "@/data/filming";
import {
  isInternal,
  needsHours,
  productionCapsOf,
  recordOf,
  stateOf,
  visibleProductions,
} from "@/data/productions-access";
import type { RoleId } from "@/data/roles";
import { G1ClientCards } from "@/screens/g1-client";
import { toRow, sortKeyOf } from "@/screens/g1-rows";
import { G1Team } from "@/screens/g1-team";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./g1.css";

type View = "open" | "hours" | "delivered" | "internal" | "all";

const VIEWS: readonly { id: View; label: string }[] = [
  { id: "open", label: "Ανοιχτές" },
  { id: "hours", label: "Θέλουν ώρες" },
  { id: "delivered", label: "Παραδομένες" },
  { id: "internal", label: "Εσωτερικές" },
  { id: "all", label: "Όλες" },
];

const CLIENT_VIEWS: readonly View[] = ["open", "delivered", "all"];

const matches = (view: View, p: ProductionStub): boolean => {
  switch (view) {
    case "open":
      return stateOf(p) === "ανοιχτή";
    case "hours":
      return needsHours(p);
    case "delivered":
      return stateOf(p) === "παραδομένη";
    case "internal":
      return isInternal(p);
    case "all":
      return true;
  }
};

const parseView = (value: string | undefined): View =>
  VIEWS.find((view) => view.id === value)?.id ?? "open";

// Ανοιχτές: αρχή Περίοδου/δημιουργία αύξουσα· οι υπόλοιπες πιο πρόσφατη πρώτη.
const sortFor = (
  view: View,
  list: readonly ProductionStub[],
): ProductionStub[] =>
  [...list].sort((a, b) =>
    view === "open"
      ? sortKeyOf(a).localeCompare(sortKeyOf(b))
      : (recordOf(b).delivery?.when ?? sortKeyOf(b)).localeCompare(
          recordOf(a).delivery?.when ?? sortKeyOf(a),
        ),
  );

const EMPTY_TEXT: Readonly<Partial<Record<RoleId, string>>> = {
  production: "Καμία Παραγωγή δεν σε αφορά σε αυτή την προβολή.",
  client:
    "Δεν υπάρχουν Παραγωγές σε αυτή την προβολή. Ανοίγουν μόνες τους με τη Συμφωνία σου.",
};

export function G1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = productionCapsOf(role);
  const view = parseView(query.view);
  const all = state === "empty" ? [] : visibleProductions(role);
  const visibleViews = VIEWS.filter((v) =>
    caps.isClient
      ? CLIENT_VIEWS.includes(v.id)
      : v.id !== "hours" || caps.canSeeCost,
  );
  const activeView = visibleViews.some((v) => v.id === view) ? view : "open";
  const shown = sortFor(
    activeView,
    all.filter((p) => matches(activeView, p)),
  );
  const emptyText =
    EMPTY_TEXT[role] ?? "Δεν υπάρχει Παραγωγή σε αυτή την προβολή.";

  return (
    <>
      <StateSwitcher
        role={role}
        code="G1"
        state={state}
        keep={{ view: query.view }}
      />
      {state === "error" ? (
        <ErrorNotice what="τις Παραγωγές" />
      ) : (
        <>
          {caps.isScoped && (
            <p className="note">
              Με αφορά: Παραγωγές όπου είσαι Μέλος (Υπεύθυνος ή με ανάθεση σε
              εργασία, Παραδοτέο ή Συνεργείο).
            </p>
          )}
          <nav className="tabs" aria-label="Προβολή Παραγωγών">
            {visibleViews.map((item) => (
              <Link
                key={item.id}
                className="tab"
                aria-current={item.id === activeView ? "page" : undefined}
                href={screenHref(role, "G1", {
                  view: item.id === "open" ? undefined : item.id,
                  state: query.state,
                })}
              >
                {item.label} ({all.filter((p) => matches(item.id, p)).length})
              </Link>
            ))}
          </nav>
          {caps.isClient ? (
            shown.length === 0 ? (
              <StateNotice kind="empty" title="Καμία Παραγωγή εδώ.">
                {emptyText}
              </StateNotice>
            ) : (
              <G1ClientCards role={role} productions={shown} />
            )
          ) : (
            <G1Team
              role={role}
              rows={shown.map((p) => toRow(p, caps.canSeeCost))}
              people={CREW_PEOPLE.map((p) => ({ id: p.id, name: p.name }))}
              defaultOwnerId={PERSON_OF_ROLE[role] ?? CREW_PEOPLE[0].id}
              canCreate={caps.canCreateInternal}
              canManageCost={caps.canManageCost}
              showCreated={
                activeView === "open" ||
                activeView === "internal" ||
                activeView === "all"
              }
              emptyText={emptyText}
            />
          )}
        </>
      )}
    </>
  );
}
