import Link from "next/link";

import { DELIVERABLE_RULES } from "@/data/deliverables";
import {
  canOpenDeliverable,
  deliverableCapsOf,
  findDeliverable,
  meOf,
  productionOf,
} from "@/data/deliverables-access";
import { findProduction } from "@/data/filming";
import { canOpenProduction, isInternal } from "@/data/productions-access";
import {
  contextOf,
  filmingOptionsOf,
  kindRowsOf,
  liveOf,
  peopleOf,
} from "@/screens/h2-context";
import { H2Live } from "@/screens/h2-live";
import { H2New } from "@/screens/h2-new";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./h2.css";

const DEFAULT_ID = "d-kypseli-09-3";

function Denied({ children }: { children: React.ReactNode }) {
  return (
    <StateNotice kind="denied" title="Χωρίς δικαίωμα">
      {children}
    </StateNotice>
  );
}

function NewMode({ role, query }: ScreenProps) {
  const production = findProduction(query.production ?? "");
  const caps = deliverableCapsOf(role);
  if (!production)
    return (
      <StateNotice kind="empty" title="Η Παραγωγή δεν βρέθηκε">
        <p>Δεν υπάρχει Παραγωγή για νέο Παραδοτέο.</p>
      </StateNotice>
    );
  if (!canOpenProduction(role, production))
    return (
      <Denied>
        <p>Χωρίς δικαίωμα: δεν είσαι Μέλος αυτής της Παραγωγής.</p>
      </Denied>
    );
  const isEmpty = query.state === "empty";
  const filmings = isEmpty ? [] : filmingOptionsOf(production);
  return (
    <H2New
      production={{
        id: production.id,
        title: production.title,
        isInternal: isInternal(production),
        href: screenHref(role, "G2", { id: production.id }),
      }}
      kinds={kindRowsOf(production)}
      people={peopleOf(production)}
      filmings={filmings.map((f) => ({
        id: f.id,
        date: f.date,
        isDone: f.state === "έγινε",
        state: f.state,
      }))}
      deadlineDays={DELIVERABLE_RULES.deadlineDays}
      canSeeAmounts={caps.canSeeAmounts}
      defaultAssigneeId={meOf(role) || production.ownerId}
    />
  );
}

function Existing({ role, query }: ScreenProps) {
  const deliverable = findDeliverable(query.id ?? DEFAULT_ID);
  const production = deliverable ? productionOf(deliverable) : undefined;
  if (!deliverable || !production)
    return (
      <StateNotice kind="empty" title="Το Παραδοτέο δεν βρέθηκε">
        <p>
          <Link href={screenHref(role, "H1", {})}>
            Πίσω στην ουρά Παραδοτέων
          </Link>
        </p>
      </StateNotice>
    );
  if (!canOpenDeliverable(role, deliverable))
    return (
      <Denied>
        <p>Χωρίς δικαίωμα: δεν είσαι Μέλος αυτής της Παραγωγής.</p>
      </Denied>
    );
  const isEmpty = query.state === "empty";
  const version = Number(query.v);
  return (
    <>
      <H2Live
        ctx={contextOf(role, deliverable, production)}
        initial={liveOf(deliverable, isEmpty)}
        initialVersion={
          Number.isInteger(version) && version > 0 ? version : undefined
        }
      />
    </>
  );
}

export function H2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = deliverableCapsOf(role);
  const switcher = (
    <StateSwitcher
      role={role}
      code="H2"
      state={state}
      keep={{ id: query.id, production: query.production, v: query.v }}
    />
  );
  if (!caps.canWork)
    return (
      <>
        {switcher}
        <Denied>
          <p>Αυτή η σελίδα είναι για την ομάδα.</p>
          {caps.isClient && (
            <p>
              <Link href={screenHref(role, "H4", { id: query.id })}>
                Δες το Παραδοτέο σου
              </Link>
            </p>
          )}
        </Denied>
      </>
    );
  if (state === "error")
    return (
      <>
        {switcher}
        <ErrorNotice what="το Παραδοτέο" />
      </>
    );
  return (
    <>
      {switcher}
      {query.production && !query.id ? (
        <NewMode role={role} query={query} />
      ) : (
        <Existing role={role} query={query} />
      )}
    </>
  );
}
