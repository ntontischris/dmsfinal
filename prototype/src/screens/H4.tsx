import Link from "next/link";

import { provisionKind } from "@/data/catalogue";
import { deliverableForClient, viewOf } from "@/screens/h3-model";
import { H4Workspace } from "@/screens/h4-workspace";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./h34.css";

export function H4({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const switcher = (
    <StateSwitcher
      role={role}
      code="H4"
      state={state}
      keep={{ id: query.id, v: query.v }}
    />
  );

  if (role !== "client")
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Αυτή η οθόνη είναι για τον πελάτη. Η ομάδα δουλεύει το Παραδοτέο στη{" "}
            <Link href={screenHref(role, "H2", { id: query.id })}>
              Σελίδα Παραδοτέου
            </Link>{" "}
            και βλέπει την <Link href={screenHref(role, "H1", {})}>Ουρά</Link>.
          </p>
        </StateNotice>
      </>
    );
  if (state === "error")
    return (
      <>
        {switcher}
        <ErrorNotice what="το Παραδοτέο" />
      </>
    );

  const deliverable = deliverableForClient(role, query.id);
  if (!deliverable)
    return (
      <>
        {switcher}
        <StateNotice kind="empty" title="Το Παραδοτέο δεν βρέθηκε">
          <p>
            <Link href={screenHref(role, "H3", {})}>Πίσω στα Παραδοτέα</Link>
          </p>
        </StateNotice>
      </>
    );

  const view = viewOf(
    deliverable,
    provisionKind(deliverable.kindId).name,
    state === "empty",
  );
  const requested = Number(query.v);
  const selected = view.versions.some((v) => v.number === requested)
    ? requested
    : (view.versions.at(-1)?.number ?? 0);

  return (
    <>
      {switcher}
      <H4Workspace
        key={`${view.id}-${state}`}
        role={role}
        view={view}
        selected={selected}
        stateParam={query.state}
      />
      <p className="note">Δεν εγκρίνεται τίποτα αυτόματα.</p>
    </>
  );
}
