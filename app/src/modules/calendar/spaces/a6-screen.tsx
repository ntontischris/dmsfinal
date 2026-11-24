import Link from "next/link";

import { getViewer } from "@/modules/access";
import { athensDate, formatDateTime } from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { blockedFormValues, convertHref } from "../blocked-form";
import { calendarCaps } from "../caps";
import { getBlockedKinds, getBlockedTime, getCalendarView } from "../queries";
import type { BlockedKind, BlockedTime } from "../types";
import { parseCalendarParams } from "../url-state";
import { A6Delete } from "./a6-delete";
import { A6Form } from "./a6-form";
import { pickedKindOf } from "./a6-model";

import "../../finance/spaces/money-lines.css";
import "./a6.css";

type RawQuery = Readonly<Record<string, string | string[] | undefined>>;

const DEFAULT_FROM = "09:00";
const DEFAULT_TO = "10:00";

const weekOf = (day: string): string =>
  hrefOf("A5", { view: "week", date: day });

function Denied() {
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>Ρεπό και άδειες δηλώνει μόνο η ομάδα.</p>
      </StateNotice>
    </div>
  );
}

// Η κεφαλίδα της νέας δήλωσης: απλό h1 (οθόνη λεπτομέρειας) και μία πρόταση για το τι κάνει.
function NewHero({ canPickPerson }: { canPickPerson: boolean }) {
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        Ρ
      </span>
      <div>
        <h1>
          {canPickPerson
            ? "Ρεπό / Άδεια / Μη διαθέσιμος"
            : "Ρεπό / Άδεια / Δεν είμαι διαθέσιμος"}
        </h1>
        <p>
          Ρεπό, άδεια ή ραντεβού: δήλωσέ το εδώ και το Ημερολόγιο της ομάδας σε
          δείχνει μη διαθέσιμο.
        </p>
      </div>
    </header>
  );
}

// A6 νέος κλεισμένος χρόνος στη νέα εμφάνιση (prototype `screens/A6.tsx` με τη φόρμα ανοιχτή). Η λίστα Επόμενα/Περασμένα
// του prototype δεν έχει σελίδα στην εφαρμογή (ο κλεισμένος χρόνος φαίνεται στο Ημερολόγιο).
export async function SpacesNewBlockedTime({ query }: { query: RawQuery }) {
  const viewer = await getViewer();
  if (
    !calendarCaps(viewer).isTeam ||
    viewer.status !== "signed-in" ||
    viewer.team === null
  )
    return <Denied />;
  const today = athensDate(new Date());
  const { date } = parseCalendarParams(query, today);
  const [view, kinds] = await Promise.all([
    getCalendarView({ from: today, to: today }),
    getBlockedKinds(),
  ]);
  if (!view.ok || !kinds.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το Ημερολόγιο" />
      </div>
    );
  const canPickPerson = view.data.canBlockOthers;
  return (
    <div data-spaces>
      <div className="a6 ml-stack">
        <NewHero canPickPerson={canPickPerson} />
        <section className="a6-card">
          <A6Form
            id={null}
            values={{
              day: date,
              untilDay: null,
              allDay: false,
              from: DEFAULT_FROM,
              to: DEFAULT_TO,
              title: "",
              userId: viewer.userId,
              kindId: pickedKindOf(query.kind, kinds.data),
            }}
            people={canPickPerson ? view.data.team : []}
            personName={viewer.team.name}
            canPickPerson={canPickPerson}
            viewerId={viewer.userId}
            cancelHref={weekOf(date)}
            kinds={kinds.data}
          />
        </section>
      </div>
    </div>
  );
}

// Η κεφαλίδα του κλεισμένου χρόνου: τίτλος (h1 της σελίδας), ποιος και πότε, και οι δύο κινήσεις της σελίδας.
function Hero({ time, day }: { time: BlockedTime; day: string }) {
  const label = time.title ?? time.kindLabel ?? "Κλεισμένος χρόνος";
  const canConvert = time.canEdit && time.canConvert;
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        Ρ
      </span>
      <div>
        <h1 data-page-title>{label}</h1>
        <p>
          {time.userName ?? "Κλεισμένος χρόνος"} ·{" "}
          {time.kindLabel && `${time.kindLabel} · `}
          {formatDateTime(time.startsAt)} – {formatDateTime(time.endsAt)}
        </p>
        {canConvert && (
          <p>
            Με τη μετατροπή, ο κλεισμένος χρόνος σβήνει όταν αποθηκευτεί το
            Γύρισμα.
          </p>
        )}
      </div>
      <nav className="ml-quick" aria-label="Κινήσεις">
        <Link href={weekOf(day)}>← Ημερολόγιο</Link>
        {canConvert && (
          <Link href={convertHref(time)} data-primary>
            Μετατροπή σε Γύρισμα
          </Link>
        )}
      </nav>
    </header>
  );
}

function Details({
  time,
  viewerId,
  kinds,
}: {
  time: BlockedTime;
  viewerId: string | null;
  kinds: readonly BlockedKind[];
}) {
  const day = athensDate(time.startsAt);
  const values = {
    ...blockedFormValues(time),
    userId: time.userId,
    title: time.title ?? "",
    kindId: time.kindId ?? "",
  };
  const label = time.title ?? time.kindLabel ?? "Κλεισμένος χρόνος";
  return (
    <div className="a6 ml-stack">
      <Hero time={time} day={day} />
      {time.canEdit ? (
        <section className="a6-card">
          <A6Form
            id={time.id}
            values={values}
            people={[]}
            personName={time.userName}
            canPickPerson={false}
            viewerId={viewerId}
            cancelHref={weekOf(day)}
            kinds={kinds}
          />
        </section>
      ) : (
        <StateNotice kind="empty" title="Μόνο ανάγνωση">
          <p>Δεν μπορείς να αλλάξεις αυτόν τον κλεισμένο χρόνο.</p>
        </StateNotice>
      )}
      {time.canEdit && (
        <section className="a6-card">
          <h2 className="ml-box-title">Διαγραφή</h2>
          <A6Delete id={time.id} day={day} label={label} />
        </section>
      )}
    </div>
  );
}

// A6 επεξεργασία κλεισμένου χρόνου στη νέα εμφάνιση: φόρμα, μετατροπή σε Γύρισμα (αν το επιτρέπει η βάση), διαγραφή.
export async function SpacesBlockedTime({ id }: { id: string | null }) {
  const viewer = await getViewer();
  if (!calendarCaps(viewer).isTeam) return <Denied />;
  const missing = (
    <div data-spaces>
      <StateNotice kind="empty" title="Δεν βρέθηκε ο κλεισμένος χρόνος">
        <p>Ίσως σβήστηκε ή δεν έχεις πρόσβαση.</p>
      </StateNotice>
    </div>
  );
  if (id === null) return missing;
  const [time, kinds] = await Promise.all([
    getBlockedTime(id),
    getBlockedKinds(),
  ]);
  if (!time.ok || !kinds.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="ο κλεισμένος χρόνος" />
      </div>
    );
  if (time.data === null) return missing;
  return (
    <div data-spaces>
      <Details
        time={time.data}
        viewerId={viewer.status === "signed-in" ? viewer.userId : null}
        kinds={kinds.data}
      />
    </div>
  );
}
