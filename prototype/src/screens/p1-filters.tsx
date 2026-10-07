import Link from "next/link";

import { AREA_LABELS, type AuditArea, type AuditEntry } from "@/data/audit";
import type { RoleId } from "@/data/roles";
import { TODAY } from "@/data/settings-access";
import { screenHref, type ScreenQuery } from "@/screens/shared";

// Φίλτρα του Ίχνους: όλα στη διεύθυνση (?who, ?area, ?action, ?from, ?to, ?q).
export interface AuditFilters {
  who?: string;
  area?: AuditArea;
  action?: string;
  from?: string;
  to?: string;
  q?: string;
}

const FILTER_KEYS = ["who", "area", "action", "from", "to", "q"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const KEY_LABELS: Readonly<Record<FilterKey, string>> = {
  who: "Ποιος",
  area: "Περιοχή",
  action: "Ενέργεια",
  from: "Από",
  to: "Έως",
  q: "Αναζήτηση",
};

const isArea = (value: string | undefined): value is AuditArea =>
  !!value && value in AREA_LABELS;

export const readFilters = (query: ScreenQuery): AuditFilters => ({
  who: query.who || undefined,
  area: isArea(query.area) ? query.area : undefined,
  action: query.action || undefined,
  from: query.from || undefined,
  to: query.to || undefined,
  q: query.q || undefined,
});

export const applyFilters = (
  entries: readonly AuditEntry[],
  f: AuditFilters,
): readonly AuditEntry[] =>
  entries.filter((e) => {
    const day = e.at.slice(0, 10);
    return (
      (!f.who || e.actor === f.who) &&
      (!f.area || e.area === f.area) &&
      (!f.action || e.action === f.action) &&
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to) &&
      (!f.q || e.subject.toLowerCase().includes(f.q.toLowerCase()))
    );
  });

const daysBefore = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

const PRESETS: readonly { label: string; days?: number }[] = [
  { label: "7 μέρες", days: 7 },
  { label: "30 μέρες", days: 30 },
  { label: "Όλα" },
];

const chipText = (key: FilterKey, filters: AuditFilters): string => {
  const value = filters[key] ?? "";
  return `${KEY_LABELS[key]}: ${isArea(value) ? AREA_LABELS[value] : value}`;
};

interface Props {
  role: RoleId;
  query: ScreenQuery;
  filters: AuditFilters;
  actors: readonly string[];
  actions: readonly string[];
}

export function AuditFilterBar({
  role,
  query,
  filters,
  actors,
  actions,
}: Props) {
  const without = (...keys: FilterKey[]) =>
    screenHref(role, "P1", {
      ...query,
      ...Object.fromEntries(keys.map((k) => [k, undefined])),
    });
  const active = FILTER_KEYS.filter((k) => filters[k]);
  return (
    <section className="card" aria-label="Φίλτρα">
      <div className="btn-row">
        <span className="muted">Περίοδος:</span>
        {PRESETS.map((p) => (
          <Link
            key={p.label}
            className="button"
            href={screenHref(role, "P1", {
              ...query,
              from: p.days ? daysBefore(TODAY, p.days) : undefined,
              to: p.days ? TODAY : undefined,
            })}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <form className="p1-form" method="get" action={`/${role}/P1`}>
        {query.state && (
          <input type="hidden" name="state" value={query.state} />
        )}
        <label>
          Ποιος
          <select
            className="select"
            name="who"
            defaultValue={filters.who ?? ""}
          >
            <option value="">Όλοι</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          Περιοχή
          <select
            className="select"
            name="area"
            defaultValue={filters.area ?? ""}
          >
            <option value="">Όλες</option>
            {(Object.keys(AREA_LABELS) as AuditArea[]).map((a) => (
              <option key={a} value={a}>
                {AREA_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ενέργεια
          <select
            className="select"
            name="action"
            defaultValue={filters.action ?? ""}
          >
            <option value="">Όλες</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label>
          Από
          <input
            className="input"
            type="date"
            name="from"
            defaultValue={filters.from}
          />
        </label>
        <label>
          Έως
          <input
            className="input"
            type="date"
            name="to"
            defaultValue={filters.to}
          />
        </label>
        <label>
          Στοιχείο
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="π.χ. Συμφωνία, Τιμολόγιο"
          />
        </label>
        <button type="submit" className="button" data-primary="true">
          Εφαρμογή
        </button>
      </form>
      {active.length > 0 && (
        <ul className="chips p1-chips" aria-label="Ενεργά φίλτρα">
          {active.map((k) => (
            <li key={k} className="chip">
              {chipText(k, filters)}{" "}
              <Link
                href={without(k)}
                aria-label={`Αφαίρεση φίλτρου ${KEY_LABELS[k]}`}
              >
                ✕
              </Link>
            </li>
          ))}
          <li>
            <Link href={without(...FILTER_KEYS)}>Καθαρισμός</Link>
          </li>
        </ul>
      )}
    </section>
  );
}
