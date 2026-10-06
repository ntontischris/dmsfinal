import Link from "next/link";

import { provisionKind } from "@/data/catalogue";
import { waitingForClient } from "@/data/deliverables-access";
import { ClientStatusBadge, PeriodCard } from "@/screens/h3-group";
import { groupsOf } from "@/screens/h3-model";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./h34.css";

export function H3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const switcher = <StateSwitcher role={role} code="H3" state={state} />;

  if (role !== "client")
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Αυτή η οθόνη είναι για τον πελάτη. Η ομάδα βλέπει τα Παραδοτέα στην{" "}
            <Link href={screenHref(role, "H1", {})}>Ουρά Παραδοτέων</Link>.
          </p>
        </StateNotice>
      </>
    );
  if (state === "error")
    return (
      <>
        {switcher}
        <ErrorNotice what="τα Παραδοτέα" />
      </>
    );

  const isEmpty = state === "empty";
  const groups = isEmpty ? [] : groupsOf(role);
  const waiting = isEmpty ? [] : waitingForClient(role);

  return (
    <div className="h34">
      {switcher}
      <header className="h34-header">
        <h1>Παραδοτέα</h1>
        <p className="note">Νέο Παραδοτέο ζητάς με Μήνυμα στην ομάδα.</p>
      </header>
      {groups.length === 0 ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν ακόμα Παραδοτέα">
          <p>Θα εμφανιστούν εδώ μόλις η ομάδα σου στείλει το πρώτο.</p>
        </StateNotice>
      ) : (
        <>
          <section className="card">
            <div className="card-title">
              <h2>Περιμένουν εσένα</h2>
              <span className="muted">{waiting.length}</span>
            </div>
            {waiting.length === 0 ? (
              <p className="muted">Τίποτα δεν περιμένει εσένα.</p>
            ) : (
              <ul className="list">
                {waiting.map((d) => (
                  <li key={d.id} className="h34-item">
                    <Link href={screenHref(role, "H4", { id: d.id })}>
                      {d.title}
                    </Link>
                    <div className="h34-signals">
                      <span className="muted">
                        {provisionKind(d.kindId).name}
                      </span>
                      <ClientStatusBadge state="περιμένει εσένα" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {groups.map((group) => (
            <PeriodCard key={group.production.id} role={role} group={group} />
          ))}
        </>
      )}
    </div>
  );
}
