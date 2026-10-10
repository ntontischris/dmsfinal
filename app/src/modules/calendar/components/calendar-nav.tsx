import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { CALENDAR_VIEWS, shiftAnchor, titleOf } from "../date-range";
import { calendarHref, type CalendarParams, type LayerKey } from "../url-state";

// Η γραμμή της πλοήγησης: προβολές, προηγούμενο / σήμερα / επόμενο, και τα επίπεδα (μόνο για την ομάδα).

const LAYER_LABEL: Record<LayerKey, string> = {
  filmings: "Γυρίσματα",
  blocked: "Κλεισμένος χρόνος",
  busy: "Ομάδα",
};

const NAV_BUTTON = buttonVariants({ variant: "default", size: "sm" });

export function CalendarNav({
  params,
  today,
}: {
  params: CalendarParams;
  today: string;
}) {
  const go = (patch: Partial<CalendarParams>) => calendarHref(params, patch);
  const previous = shiftAnchor(params.view, params.date, -1);
  const next = shiftAnchor(params.view, params.date, 1);
  return (
    <div className="grid gap-3">
      <nav className="flex flex-wrap gap-1" aria-label="Προβολή">
        {CALENDAR_VIEWS.map((view) => {
          const isCurrent = params.view === view.id;
          return (
            <Link
              key={view.id}
              href={go({ view: view.id })}
              className={buttonVariants({
                variant: isCurrent ? "primary" : "ghost",
                size: "sm",
              })}
              aria-current={isCurrent ? "page" : undefined}
            >
              {view.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-center gap-2">
        <Link className={NAV_BUTTON} href={go({ date: previous })}>
          ‹ Προηγούμενη
        </Link>
        <Link className={NAV_BUTTON} href={go({ date: today })}>
          Σήμερα
        </Link>
        <Link className={NAV_BUTTON} href={go({ date: next })}>
          Επόμενη ›
        </Link>
        <strong className="text-sm">{titleOf(params.view, params.date)}</strong>
      </div>
    </div>
  );
}

// Τα επίπεδα που φαίνονται ως κουμπιά on/off. Η σελίδα αποφασίζει ποια (π.χ. το «Ομάδα» μόνο όταν υπάρχει κάτι).
export function CalendarFilters({
  params,
  available,
}: {
  params: CalendarParams;
  available: readonly LayerKey[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Επίπεδα:</span>
      {available.map((key) => {
        const isOn = params.layers.includes(key);
        const layers = isOn
          ? params.layers.filter((item) => item !== key)
          : [...params.layers, key];
        return (
          <Link
            key={key}
            href={calendarHref(params, { layers })}
            className={buttonVariants({
              variant: isOn ? "primary" : "ghost",
              size: "sm",
            })}
            aria-pressed={isOn}
          >
            {LAYER_LABEL[key]}
          </Link>
        );
      })}
    </div>
  );
}
