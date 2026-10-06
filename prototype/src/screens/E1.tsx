import Link from "next/link";

import { findAgreement } from "@/data/agreements";
import { NOW, PRODUCTIONS, type Filming } from "@/data/filming";
import {
  filmingCapsOf,
  needsOutcome,
  shootBalance,
  startsAt,
  visibleFilmings,
} from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import { KYPSELI_ID } from "@/data/sales";
import { E1Table } from "@/screens/e1-table";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./e1.css";

type View = "open" | "pending" | "outcome" | "closed" | "all";

const VIEWS: readonly { id: View; label: string }[] = [
  { id: "open", label: "Ανοιχτά" },
  { id: "pending", label: "Αναμένουν έγκριση" },
  { id: "outcome", label: "Θέλουν «έγινε»" },
  { id: "closed", label: "Κλεισμένα" },
  { id: "all", label: "Όλα" },
];

const CLOSED: readonly string[] = [
  "έγινε",
  "δεν έγινε",
  "ακυρώθηκε",
  "απορρίφθηκε",
];

const matches = (view: View, filming: Filming): boolean => {
  switch (view) {
    case "open":
      return (
        filming.state === "αναμένει έγκριση" ||
        filming.state === "προγραμματισμένο"
      );
    case "pending":
      return filming.state === "αναμένει έγκριση";
    case "outcome":
      return needsOutcome(filming);
    case "closed":
      return CLOSED.includes(filming.state);
    case "all":
      return true;
  }
};

const parseView = (value: string | undefined): View =>
  VIEWS.find((view) => view.id === value)?.id ?? "open";

// Ανοιχτά: πρώτα τα επόμενα (το πιο κοντινό πρώτο), μετά όσα πέρασαν· κλεισμένα και όλα: πιο πρόσφατο πρώτο.
const sortFor = (view: View, filmings: readonly Filming[]): Filming[] => {
  const now = Date.parse(NOW);
  const isFuture = (f: Filming) => startsAt(f) >= now;
  const newestFirst = view === "closed" || view === "all";
  return [...filmings].sort((a, b) => {
    if (newestFirst) return startsAt(b) - startsAt(a);
    if (isFuture(a) !== isFuture(b)) return isFuture(a) ? -1 : 1;
    return startsAt(a) - startsAt(b);
  });
};

const SCOPE_NOTES: Readonly<Partial<Record<RoleId, string>>> = {
  production:
    "«Με αφορά» για την Παραγωγή: Γυρίσματα Παραγωγών όπου είσαι Μέλος ή Γυρίσματα όπου είσαι γραμμένος στο Συνεργείο.",
  sales:
    "«Με αφορά» για τις Πωλήσεις: Γυρίσματα των Πελατών των οποίων είσαι Υπεύθυνος.",
};

const EMPTY_TEXT: Readonly<Partial<Record<RoleId, string>>> = {
  production: "Κανένα Γύρισμα δεν σε αφορά σε αυτή την προβολή.",
  sales: "Κανένα Γύρισμα των Πελατών σου σε αυτή την προβολή.",
  client: "Δεν έχεις Γυρίσματα σε αυτή την προβολή. Μπορείς να κλείσεις ένα.",
};

function ClientBalance({ role }: { role: RoleId }) {
  const agreement = findAgreement("ag-kypseli-social");
  const rows = (agreement?.periods ?? [])
    .filter((period) => period.state !== "κλειστή")
    .map((period) => {
      const production = PRODUCTIONS.find(
        (p) => p.clientId === KYPSELI_ID && p.periodLabel === period.label,
      );
      const anyFilming = visibleFilmings(role).find(
        (f) => f.productionId === production?.id,
      );
      return { period, balance: anyFilming ? shootBalance(anyFilming) : null };
    });
  return (
    <section className="card">
      <div className="card-title">
        <h2>Τα Γυρίσματα της Συμφωνίας σου</h2>
        <Link
          className="button"
          data-primary="true"
          href={screenHref(role, "E5", {})}
        >
          Κλείσε Γύρισμα
        </Link>
      </div>
      <div className="e1-balance">
        {rows.map(({ period, balance }) => (
          <div key={period.label}>
            <strong>{period.label}</strong>
            <p className="muted">
              {balance
                ? `${balance.left} από ${balance.total} διαθέσιμα (${balance.used} έγιναν, ${balance.reserved} κρατημένα)`
                : "Δεν υπάρχουν στοιχεία."}
            </p>
            {balance && balance.left <= 0 && (
              <p className="note">
                Δεν έμεινε Γύρισμα σε αυτή την Περίοδο. Για επιπλέον, στείλε{" "}
                <Link href={screenHref(role, "J3", {})}>
                  Αίτημα στα Μηνύματα
                </Link>
                .
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="note">
        Αν ακυρώσεις Γύρισμα που περιμένει έγκριση, επιστρέφει αμέσως στη
        Συμφωνία σου· τίποτα δεν έχει επιβεβαιωθεί ακόμα.
      </p>
    </section>
  );
}

export function E1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = filmingCapsOf(role);
  const view = parseView(query.view);
  const all = state === "empty" ? [] : visibleFilmings(role);
  const shown = sortFor(
    view,
    all.filter((f) => matches(view, f)),
  );
  const visibleViews = caps.isClient
    ? VIEWS.filter((v) => v.id !== "outcome")
    : VIEWS;

  return (
    <>
      <StateSwitcher
        role={role}
        code="E1"
        state={state}
        keep={{ view: query.view }}
      />
      {state === "error" ? (
        <ErrorNotice what="τα Γυρίσματα" />
      ) : (
        <>
          {caps.isScoped && <p className="note">{SCOPE_NOTES[role]}</p>}
          {caps.isClient && <ClientBalance role={role} />}
          {caps.canCreate && (
            <div className="toolbar">
              <Link
                className="button"
                data-primary="true"
                href={screenHref(role, "E4", {})}
              >
                Νέο Γύρισμα
              </Link>
            </div>
          )}
          <nav className="tabs" aria-label="Προβολή Γυρισμάτων">
            {visibleViews.map((item) => (
              <Link
                key={item.id}
                className="tab"
                aria-current={item.id === view ? "page" : undefined}
                href={screenHref(role, "E1", {
                  view: item.id === "open" ? undefined : item.id,
                  state: query.state,
                })}
              >
                {item.label} ({all.filter((f) => matches(item.id, f)).length})
              </Link>
            ))}
          </nav>
          {shown.length === 0 ? (
            <StateNotice kind="empty" title="Κανένα Γύρισμα εδώ.">
              {EMPTY_TEXT[role] ?? "Δεν υπάρχει Γύρισμα σε αυτή την προβολή."}
            </StateNotice>
          ) : (
            <E1Table role={role} filmings={shown} isClient={caps.isClient} />
          )}
        </>
      )}
    </>
  );
}
