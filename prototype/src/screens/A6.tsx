import Link from "next/link";

import { TEAM_MEMBERS } from "@/data/calendar";
import {
  blockedTimesFor,
  calendarCapsOf,
  canConvertBlocked,
  canEditBlocked,
} from "@/data/calendar-access";
import { findBlockedTime } from "@/data/filming";
import { A6List } from "@/screens/a6-list";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./a6.css";

// Κλεισμένος χρόνος: η ομάδα (Ιδ/Δι όλων, οι άλλοι μόνο τον δικό τους).
export function A6({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = calendarCapsOf(role);
  const tab = query.tab === "past" ? "past" : "upcoming";
  const person = caps.seesAll ? query.person : undefined;
  const keep = {
    tab: query.tab,
    person: query.person,
    new: query.new,
    id: query.id,
  };
  const href = (params: Record<string, string | undefined>) =>
    screenHref(role, "A6", { ...params, state: query.state });

  if (!caps.canBlock)
    return (
      <div className="a6">
        <StateSwitcher role={role} code="A6" state={state} keep={keep} />
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Κλεισμένο χρόνο έχει μόνο η ομάδα.</p>
        </StateNotice>
      </div>
    );

  const all = blockedTimesFor(role);
  const items = person ? all.filter((b) => b.personId === person) : all;
  const target = findBlockedTime(query.id);
  const editId = target && canEditBlocked(role, target) ? target.id : null;
  const initialMode = editId
    ? { editId }
    : query.new === "1"
      ? ("new" as const)
      : ("none" as const);

  return (
    <div className="a6">
      <StateSwitcher role={role} code="A6" state={state} keep={keep} />
      <h1>Κλεισμένος χρόνος</h1>
      <nav className="tabs" aria-label="Επόμενα ή περασμένα">
        <Link
          className="tab"
          href={href({ person: query.person })}
          aria-current={tab === "upcoming" ? "page" : undefined}
        >
          Επόμενα
        </Link>
        <Link
          className="tab"
          href={href({ tab: "past", person: query.person })}
          aria-current={tab === "past" ? "page" : undefined}
        >
          Περασμένα
        </Link>
      </nav>
      {caps.seesAll && (
        <div className="toolbar" aria-label="Φίλτρο ατόμου">
          <span className="muted">Άτομο:</span>
          <Link
            className="button"
            href={href({ tab: query.tab })}
            data-primary={!person || undefined}
          >
            Όλοι
          </Link>
          {TEAM_MEMBERS.map((member) => (
            <Link
              key={member.id}
              className="button"
              href={href({ tab: query.tab, person: member.id })}
              data-primary={person === member.id || undefined}
            >
              {member.name}
            </Link>
          ))}
        </div>
      )}
      {state === "error" ? (
        <ErrorNotice what="τον Κλεισμένο χρόνο" />
      ) : (
        <A6List
          key={`${state}-${tab}-${person ?? ""}-${query.id ?? ""}-${query.new ?? ""}`}
          role={role}
          me={caps.me ?? ""}
          tab={tab}
          seesAll={caps.seesAll}
          canPickPerson={caps.canBlockOthers}
          initialItems={state === "empty" ? [] : items}
          initialMode={initialMode}
          editableIds={all
            .filter((b) => canEditBlocked(role, b))
            .map((b) => b.id)}
          convertibleIds={all
            .filter((b) => canConvertBlocked(role, b))
            .map((b) => b.id)}
          canConvertAny={caps.canConvert}
        />
      )}
    </div>
  );
}
