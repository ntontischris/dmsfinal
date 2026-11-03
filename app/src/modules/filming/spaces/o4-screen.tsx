import Link from "next/link";
import type { ReactNode } from "react";

import { can, getViewer } from "@/modules/access";
import {
  SpacesRecentChanges,
  SpacesSettingsTabs,
  o1ChangesOf,
  recentChanges,
} from "@/modules/settings";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { filmingCaps } from "../caps";
import { getFilmingSettings } from "../queries";
import { getBookingHours } from "../queries-booking";
import { O4Holidays } from "./o4-holidays";
import { O4Hours } from "./o4-hours";
import { O4_PARTS, parsePart, partHref, type O4Part } from "./o4-model";
import { O4Rules } from "./o4-rules";

import "./o4.css";

const AUDITED = ["filming_settings", "booking_exceptions", "blocked_time_kinds"];
const AUDIT_HREF = "/app/audit?area=settings";
const ENTITY_LABELS = {
  filming_settings: "Ρυθμίσεις Γυρισμάτων",
  booking_exceptions: "Εξαίρεση Ωραρίου",
  blocked_time_kinds: "Είδος κλεισμένου χρόνου",
};

function Parts({ part }: { part: O4Part }) {
  return (
    <nav className="tabs o4-parts" aria-label="Μέρη των Ρυθμίσεων Γυρισμάτων">
      {O4_PARTS.map((item) => (
        <Link
          key={item.id}
          className="tab"
          href={partHref(item.id)}
          aria-current={item.id === part ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

interface Slots {
  google: ReactNode;
  calendar: ReactNode;
}

async function Body({ part, slots }: { part: O4Part; slots: Slots }) {
  if (part === "google") return slots.google;
  if (part === "calendar") return slots.calendar;
  if (part === "rules") {
    const settings = await getFilmingSettings();
    if (!settings.ok) return <ErrorNotice what="τις Ρυθμίσεις Γυρισμάτων" />;
    return <O4Rules settings={settings.data} />;
  }
  const hours = await getBookingHours();
  if (!hours.ok) return <ErrorNotice what="τις Ρυθμίσεις Γυρισμάτων" />;
  return part === "hours" ? (
    <O4Hours view={hours.data} />
  ) : (
    <O4Holidays holidays={hours.data.holidays} />
  );
}

// O4 Ρυθμίσεις › Γυρίσματα στη νέα εμφάνιση (prototype `screens/O4.tsx`): μέρη με ?part=, για όποιον
// «Διαχειρίζεται Ρυθμίσεις». Τα μέρη του Google και των Ειδών κλεισμένου χρόνου έρχονται έτοιμα από τη σελίδα
// (το Google και το Ημερολόγιο εισάγουν ήδη τα Γυρίσματα).
export async function SpacesFilmingSettings({
  part,
  google,
  calendar,
}: {
  part: string | undefined;
  google: ReactNode;
  calendar: ReactNode;
}) {
  const viewer = await getViewer();
  if (!filmingCaps(viewer).canManageSettings)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
        </StateNotice>
      </div>
    );
  const current = parsePart(part);
  const changes = await recentChanges(AUDITED);
  return (
    <div data-spaces>
      <SpacesSettingsTabs code="O4" />
      <div className="o4">
        <Parts part={current} />
        <Body part={current} slots={{ google, calendar }} />
      </div>
      {changes.ok && (
        <SpacesRecentChanges
          changes={o1ChangesOf(changes.data, { entities: ENTITY_LABELS })}
          auditHref={can(viewer, "audit.view") ? AUDIT_HREF : null}
          areaLabel="Ρυθμίσεις"
        />
      )}
    </div>
  );
}
