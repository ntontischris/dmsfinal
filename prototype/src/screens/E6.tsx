import Link from "next/link";

import {
  FILMINGS,
  OPEN_STATES,
  PERSON_OF_ROLE,
  findProduction,
  personName,
  CREW_PEOPLE,
  type Filming,
} from "@/data/filming";
import { clientNameOf, endTime, isPast } from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import { E6Sheet, type SheetView } from "@/screens/e6-sheet";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./e5.css";

const TEAM_ROLES: readonly RoleId[] = [
  "owner",
  "admin",
  "production",
  "sales",
  "accountant",
];

const whenOf = (filming: Filming): string =>
  `${fmtDate(filming.date)} ${filming.start}–${endTime(filming)}`;

const myUpcoming = (personId: string): readonly Filming[] =>
  FILMINGS.filter(
    (filming) =>
      OPEN_STATES.includes(filming.state) &&
      !isPast(filming) &&
      filming.crew.some((slot) => slot.personId === personId),
  ).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));

const toSheetView = (filming: Filming, personId: string): SheetView | null => {
  const latest = filming.sheet.at(-1);
  const mine = filming.crew.find((slot) => slot.personId === personId);
  if (!latest || !mine) return null;
  return {
    filmingId: filming.id,
    clientName: clientNameOf(filming),
    where: filming.location,
    when: whenOf(filming),
    version: latest.version,
    change: latest.change,
    sentAt: fmtDate(latest.sentAt),
    crew: filming.crew.map((slot) => ({
      name: personName(slot.personId),
      skill: CREW_PEOPLE.find((p) => p.id === slot.personId)?.skill ?? "—",
      isMe: slot.personId === personId,
    })),
    equipment: filming.equipment,
    shotList: filming.shotList,
    internalNote: filming.internalNote ?? null,
    myResponse: mine.response,
    myReason: mine.reason ?? null,
    ownerName: personName(findProduction(filming.productionId)?.ownerId ?? ""),
  };
};

function MyList({
  role,
  filmings,
  selectedId,
}: {
  role: RoleId;
  filmings: readonly Filming[];
  selectedId: string;
}) {
  return (
    <nav aria-label="Τα Γυρίσματά μου">
      {filmings.map((filming) => (
        <Link
          key={filming.id}
          className="e-list-link"
          href={screenHref(role, "E6", { id: filming.id })}
          aria-current={filming.id === selectedId}
        >
          {clientNameOf(filming)} · {whenOf(filming)}
          {filming.sheet.length === 0 && " · χωρίς Δελτίο"}
        </Link>
      ))}
    </nav>
  );
}

function Body({ role, id }: { role: RoleId; id: string | undefined }) {
  const personId = PERSON_OF_ROLE[role];
  const mine = personId ? myUpcoming(personId) : [];
  if (!personId || mine.length === 0)
    return (
      <StateNotice kind="empty" title="Δεν είσαι σε κανένα Συνεργείο">
        <p>
          Όταν σε βάλουν σε Συνεργείο Γυρίσματος, το Δελτίο θα εμφανίζεται εδώ.
        </p>
      </StateNotice>
    );
  const selected = mine.find((filming) => filming.id === id) ?? mine[0];
  const sheet = toSheetView(selected, personId);
  return (
    <>
      <MyList role={role} filmings={mine} selectedId={selected.id} />
      {sheet ? (
        <E6Sheet key={selected.id} sheet={sheet} />
      ) : (
        <StateNotice kind="empty" title="Το Δελτίο δεν έχει σταλεί ακόμα">
          <p>
            Είσαι στο Συνεργείο του Γυρίσματος {clientNameOf(selected)} (
            {whenOf(selected)}). Θα ειδοποιηθείς με email όταν σταλεί το Δελτίο.
          </p>
        </StateNotice>
      )}
    </>
  );
}

// Δελτίο γυρίσματος, όψη μέλους Συνεργείου. Ο πελάτης δεν το βλέπει ποτέ (Q16).
export function E6({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  return (
    <div className="e">
      <StateSwitcher
        role={role}
        code="E6"
        state={state}
        keep={{ id: query.id }}
      />
      <h1>Δελτίο γυρίσματος</h1>
      {!TEAM_ROLES.includes(role) ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Το Δελτίο είναι για το Συνεργείο. Ο πελάτης βλέπει πού, πότε και τι
            ζήτησε στα Γυρίσματά του.
          </p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="το Δελτίο γυρίσματος" />
      ) : state === "empty" ? (
        <StateNotice kind="empty" title="Δεν είσαι σε κανένα Συνεργείο">
          <p>
            Όταν σε βάλουν σε Συνεργείο Γυρίσματος, το Δελτίο θα εμφανίζεται
            εδώ.
          </p>
        </StateNotice>
      ) : (
        <Body role={role} id={query.id} />
      )}
    </div>
  );
}
