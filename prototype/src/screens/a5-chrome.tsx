import Link from "next/link";

import type { CalendarCaps } from "@/data/calendar-access";
import { CALENDAR_TODAY } from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import {
  A5_VIEWS,
  a5Href,
  shiftAnchor,
  titleOf,
  type A5Params,
} from "@/screens/a5-dates";
import { screenHref } from "@/screens/shared";

interface ChromeProps {
  role: RoleId;
  caps: CalendarCaps;
  params: A5Params;
}

const SCOPE_NOTES: Readonly<Partial<Record<RoleId, string>>> = {
  owner: "Βλέπεις όλα: Γυρίσματα, Κλεισμένο χρόνο όλων, προθεσμίες και αργίες.",
  admin: "Βλέπεις όλα: Γυρίσματα, Κλεισμένο χρόνο όλων, προθεσμίες και αργίες.",
  production:
    "Βλέπεις τα δικά σου Γυρίσματα, τον δικό σου Κλεισμένο χρόνο και τις προθεσμίες σου. Οι υπόλοιποι της ομάδας φαίνονται ως «Απασχολημένος», χωρίς λεπτομέρειες.",
  sales:
    "Βλέπεις τα δικά σου Γυρίσματα, τον δικό σου Κλεισμένο χρόνο και τις προθεσμίες σου. Οι υπόλοιποι της ομάδας φαίνονται ως «Απασχολημένος», χωρίς λεπτομέρειες.",
  accountant:
    "Βλέπεις μόνο τον δικό σου Κλεισμένο χρόνο και τις αργίες της εταιρείας.",
  client:
    "Βλέπεις τα Γυρίσματά σου και, για κάθε μέρα, αν είναι ελεύθερη, γεμάτη ή κλειστή. Σε ελεύθερη μέρα μπορείς να κλείσεις Γύρισμα.",
};

export function A5RoleNote({ role }: { role: RoleId }) {
  const text = SCOPE_NOTES[role];
  return text ? <p className="note">{text}</p> : null;
}

export function A5Toolbar({ role, caps }: Omit<ChromeProps, "params">) {
  return (
    <div className="toolbar">
      {caps.canBlock && (
        <Link className="button" href={screenHref(role, "A6", { new: "1" })}>
          Κλεισμένος χρόνος
        </Link>
      )}
      {caps.canConvert && (
        <Link
          className="button"
          data-primary="true"
          href={screenHref(role, "E4", {})}
        >
          Νέο Γύρισμα
        </Link>
      )}
      {caps.isClient && (
        <Link
          className="button"
          data-primary="true"
          href={screenHref(role, "E5", {})}
        >
          Κλείσε Γύρισμα
        </Link>
      )}
    </div>
  );
}

export function A5Tabs({ role, params }: Omit<ChromeProps, "caps">) {
  return (
    <nav className="tabs" aria-label="Προβολή">
      {A5_VIEWS.map((view) => (
        <Link
          key={view.id}
          className="tab"
          href={a5Href(role, params, { view: view.id })}
          aria-current={view.id === params.view ? "page" : undefined}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}

export function A5Nav({ role, params }: Omit<ChromeProps, "caps">) {
  const go = (d: string) => a5Href(role, params, { d });
  return (
    <div className="a5-nav">
      <Link
        className="button"
        href={go(shiftAnchor(params.view, params.d, -1))}
      >
        ‹ Προηγούμενη
      </Link>
      <Link className="button" href={go(CALENDAR_TODAY)}>
        Σήμερα
      </Link>
      <Link className="button" href={go(shiftAnchor(params.view, params.d, 1))}>
        Επόμενη ›
      </Link>
      <strong className="a5-range">{titleOf(params.view, params.d)}</strong>
    </div>
  );
}
