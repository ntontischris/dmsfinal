import Link from "next/link";

import { findClient } from "@/data/sales";
import { roleNames } from "@/data/team-access";
import { CalendarCard, RolesCard } from "@/screens/a3-calendar";
import { DetailsCard, LoginCard, PreferencesCard } from "@/screens/a3-account";
import { profileOf } from "@/screens/a3-model";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./a3.css";

// A3 «Προφίλ και προτιμήσεις»: όλη η ομάδα και ο πελάτης· ο Επισκέπτης δεν έχει λογαριασμό.
export function A3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="A3"
      state={state}
      keep={{ ...query, state: undefined }}
    />
  );
  const profile = profileOf(role);
  if (!profile)
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Το Προφίλ το έχουν μόνο όσοι έχουν λογαριασμό.
        </StateNotice>
      </>
    );
  if (state === "error")
    return (
      <>
        {header}
        <ErrorNotice what="το προφίλ σου" />
      </>
    );
  const isEmpty = state === "empty";
  const props = { role, query, profile, isEmpty };
  return (
    <>
      {header}
      <div className="stack">
        <DetailsCard {...props} />
        <LoginCard {...props} />
        <PreferencesCard {...props} />
        <CalendarCard role={role} query={query} profile={profile} />
        <section className="card o-card">
          <h2>Ειδοποιήσεις</h2>
          <p>
            <Link href={screenHref(role, "A2", { tab: "prefs" })}>
              Προτιμήσεις Ειδοποιήσεων (A2)
            </Link>
          </p>
        </section>
        <RolesCard profile={profile} />
        {profile.isClient && (
          <section className="card o-card">
            <h2>Οι Πελάτες μου</h2>
            <ul className="list">
              {profile.memberships.map((m) => (
                <li key={m.clientId}>
                  {findClient(m.clientId)?.name ?? m.clientId} ·{" "}
                  {roleNames([m.roleId])}
                </li>
              ))}
            </ul>
            <Link href={screenHref(role, "A4", {})}>Εναλλαγή Πελάτη (A4)</Link>
          </section>
        )}
      </div>
    </>
  );
}
