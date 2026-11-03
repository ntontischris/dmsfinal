import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";

import { CALENDAR_VIEWS, rangeOf, shiftAnchor, titleOf } from "../date-range";
import { personLabel, type PersonOption } from "../person-filter";
import { calendarHref, type CalendarParams } from "../url-state";
import {
  filtersSummary,
  fmtLong,
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
}

export function A5Toolbar(props: A5ToolbarProps) {
  return (
    <div className="toolbar">
      {props.isTeam && (
        <Link className="button" href={hrefOf("A6", { date: props.date })}>
          {props.canBlockOthers
            ? "Ρεπό / Άδεια / Μη διαθέσιμος"
            : "Ρεπό / Άδεια / Δεν είμαι διαθέσιμος"}
        </Link>
      )}
      {props.isTeam && props.canNewFilming && (
        <Link className="button" data-primary="true" href={hrefOf("E4")}>
          Νέο Γύρισμα
        </Link>
      )}
      {!props.isTeam && props.canBook && (
        <Link className="button" data-primary="true" href={hrefOf("E5")}>
          Κλείσε νέο Γύρισμα
        </Link>
      )}
    </div>
  );
}

export function A5Tabs({ params }: { params: CalendarParams }) {
  return (
    <nav className="tabs" aria-label="Προβολή">
      {CALENDAR_VIEWS.map((view) => (
        <Link
          key={view.id}
          className="tab"
          href={calendarHref(params, { view: view.id })}
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
      <Link
        className="button"
        href={go(shiftAnchor(params.view, params.date, -1))}
      >
        ‹ Προηγούμενη
      </Link>
      <Link className="button" href={go(today)}>
        Σήμερα
      </Link>
      <Link
        className="button"
        href={go(shiftAnchor(params.view, params.date, 1))}
      >
        Επόμενη ›
      </Link>
      <strong className="a5-range">{titleOf(params.view, params.date)}</strong>
      {isTodayOut && (
        <span className="muted a5-today-note">
          Σήμερα είναι {fmtLong(today)}.
        </span>
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
      <span className="muted">Άτομο:</span>
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
      <span className="muted">Δείξε:</span>
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
        <span className="muted">
          ({filtersSummary(props.options, props.params.layers, person)})
        </span>
      </summary>
      {hasPeople && <PersonFilter {...props} />}
      <LayerFilter {...props} />
    </details>
  );
}
