import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";

import { CALENDAR_VIEWS, rangeOf, shiftAnchor, titleOf } from "../date-range";
import { personLabel, type PersonOption } from "../person-filter";
import type { BlockedKind } from "../types";
import { calendarHref, type CalendarParams } from "../url-state";
import {
  filtersSummary,
  fmtLong,
  quickAddsOf,
  toggledLayers,
  type LayerOption,
} from "./a5-model";

// Η «κορνίζα» του Ημερολογίου από το prototype (`screens/a5-chrome.tsx`, `a5-filters.tsx`): κουμπιά, προβολή, πλοήγηση, φίλτρα.

export interface A5ToolbarProps {
  isTeam: boolean;
  canBlockOthers: boolean;
  canNewFilming: boolean;
  canBook: boolean;
  date: string;
  // Τα Είδη κλεισμένου χρόνου (μόνο για την ομάδα): ένα κουμπί «+ <Είδος>» ανά ενεργό Είδος.
  kinds: readonly BlockedKind[];
}

// Σχέδιο «3B»: τα κουμπιά γρήγορης προσθήκης ανά Είδος, στο χρώμα του. Χωρίς ενεργά Είδη μένει το ένα κουμπί.
function QuickAdds({ kinds, date, canBlockOthers }: A5ToolbarProps) {
  const adds = quickAddsOf(kinds, date);
  if (adds.length === 0)
    return (
      <Link href={hrefOf("A6", { date })}>
        {canBlockOthers
          ? "Ρεπό / Άδεια / Μη διαθέσιμος"
          : "Ρεπό / Άδεια / Δεν είμαι διαθέσιμος"}
      </Link>
    );
  return adds.map((add) => (
    <Link
      key={add.id}
      className="kind-add"
      data-tone={add.tone ?? undefined}
      href={add.href}
    >
      {add.label}
    </Link>
  ));
}

export function A5Toolbar(props: A5ToolbarProps) {
  return (
    <div className="ml-quick a5-acts">
      {props.isTeam && <QuickAdds {...props} />}
      {props.isTeam && props.canNewFilming && (
        <Link className="ml-cta" href={hrefOf("E4")}>
          + Γύρισμα
        </Link>
      )}
      {!props.isTeam && props.canBook && (
        <Link className="ml-cta" href={hrefOf("E5")}>
          Κλείσε νέο Γύρισμα
        </Link>
      )}
    </div>
  );
}

export function A5Tabs({ params }: { params: CalendarParams }) {
  return (
    <nav className="page-filters" aria-label="Προβολή">
      {CALENDAR_VIEWS.map((view) => (
        <Link
          key={view.id}
          href={calendarHref(params, { view: view.id })}
          scroll={false}
          aria-current={view.id === params.view ? "page" : undefined}
        >
          {view.label}
        </Link>
      ))}
    </nav>
  );
}

export function A5Nav({
  params,
  today,
}: {
  params: CalendarParams;
  today: string;
}) {
  const go = (date: string) => calendarHref(params, { date });
  const { from, to } = rangeOf(params.view, params.date);
  const isTodayOut = today < from || today > to;
  return (
    <div className="a5-nav">
      <span className="ml-quick a5-steps">
        <Link href={go(shiftAnchor(params.view, params.date, -1))}>
          ‹ Προηγούμενη
        </Link>
        <Link href={go(today)} data-primary>
          Σήμερα
        </Link>
        <Link href={go(shiftAnchor(params.view, params.date, 1))}>
          Επόμενη ›
        </Link>
      </span>
      <strong className="a5-range">{titleOf(params.view, params.date)}</strong>
      {isTodayOut && (
        <small className="a5-today-note">Σήμερα είναι {fmtLong(today)}.</small>
      )}
    </div>
  );
}

interface A5FiltersProps {
  params: CalendarParams;
  options: readonly LayerOption[];
  // Κενό για όσους βλέπουν μόνο τον εαυτό τους: τότε δεν φαίνεται φίλτρο ατόμου.
  people: readonly PersonOption[];
}

// Το φίλτρο ατόμου του prototype (`screens/a5-filters.tsx` PersonFilter): «Εγώ», «Όλοι», ένα μέλος.
function PersonFilter({ params, people }: A5FiltersProps) {
  return (
    <div className="a5-filter">
      <small>Άτομο:</small>
      {people.map((option) => (
        <Link
          key={option.id ?? "all"}
          className="a5-chip"
          href={calendarHref(params, { person: option.id })}
          aria-current={params.person === option.id}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

function LayerFilter({ params, options }: A5FiltersProps) {
  return (
    <div className="a5-filter">
      <small>Δείξε:</small>
      {options.map((layer) => {
        const isOn = params.layers.includes(layer.key);
        return (
          <Link
            key={layer.key}
            className="a5-chip"
            href={calendarHref(params, {
              layers: toggledLayers(params.layers, layer.key),
            })}
            aria-pressed={isOn}
            data-on={isOn}
          >
            {isOn ? "✓ " : ""}
            {layer.label}
          </Link>
        );
      })}
    </div>
  );
}

// Τα φίλτρα σε κλειστό μενού, για να φαίνονται πρώτα οι μέρες. Μόνο για την ομάδα.
export function A5Filters(props: A5FiltersProps) {
  const hasPeople = props.people.length > 0;
  const person = hasPeople
    ? personLabel(props.people, props.params.person)
    : null;
  return (
    <details className="a5-filters">
      <summary>
        Φίλτρα{" "}
        <small>
          ({filtersSummary(props.options, props.params.layers, person)})
        </small>
      </summary>
      {hasPeople && <PersonFilter {...props} />}
      <LayerFilter {...props} />
    </details>
  );
}
