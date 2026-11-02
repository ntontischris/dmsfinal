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

const AUDITED = ["filming_settings", "booking_exceptions"];
const AUDIT_HREF = "/app/audit?area=settings";
const ENTITY_LABELS = {
  filming_settings: "Ρυθμίσεις Γυρισμάτων",
  booking_exceptions: "Εξαίρεση Ωραρίου",
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

async function Body({ part, google }: { part: O4Part; google: ReactNode }) {
  if (part === "google") return google;
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

// O4 Ρυθμίσεις › Γυρίσματα στη νέα εμφάνιση (prototype `screens/O4.tsx`): τέσσερα μέρη με ?part=, για όποιον
// «Διαχειρίζεται Ρυθμίσεις». Το μέρος του Google έρχεται έτοιμο από τη σελίδα (το Google εισάγει ήδη τα Γυρίσματα).
export async function SpacesFilmingSettings({
  part,
  google,
}: {
  part: string | undefined;
  google: ReactNode;
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
        <Body part={current} google={google} />
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
