import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";

import {
  ACTION_LABELS,
  ALL_ACTIONS,
  ALL_AREAS,
  ALL_ENTITIES,
  ALL_PEOPLE,
  AUDIT_APPLY,
  AUDIT_CHIPS_LABEL,
  AUDIT_CLEAR,
  AUDIT_FILTERS_LABEL,
  FILTER_LABELS,
  PERIOD_LABELS,
  REMOVE_FILTER,
  SYSTEM_ACTOR,
} from "../labels";
import type { AuditOptions, AuditPage } from "../schema";
import {
  AUDIT_ACTIONS,
  AUDIT_PATH,
  AUDIT_PERIODS,
  NO_FILTERS,
  activeKeys,
  auditHref,
  withoutFilter,
  type AuditFilters,
  type FilterKey,
} from "../url";

interface AuditFilterBarProps {
  filters: AuditFilters;
  options: AuditOptions;
  subject: AuditPage["subject"];
}

// Η τιμή ενός chip: ονόματα από τις επιλογές της βάσης, και το στοιχείο με το όνομά του όταν είναι ένα συγκεκριμένο.
const chipValue = (
  key: FilterKey,
  { filters, options, subject }: AuditFilterBarProps,
): string => {
  if (key === "who")
    return filters.who === "system"
      ? SYSTEM_ACTOR
      : (options.actors.find((a) => a.id === filters.who)?.name ??
          filters.who ??
          "");
  if (key === "area")
    return (
      options.areas.find((a) => a.code === filters.area)?.label ??
      filters.area ??
      ""
    );
  if (key === "action")
    return filters.action ? ACTION_LABELS[filters.action] : "";
  if (key === "period") return PERIOD_LABELS[filters.period];
  const label =
    subject?.label ??
    options.entities.find((e) => e.code === filters.entity)?.label ??
    filters.entity;
  return subject?.name ? `${label} «${subject.name}»` : (label ?? "");
};

function Chips(props: AuditFilterBarProps) {
  const active = activeKeys(props.filters);
  if (active.length === 0) return null;
  return (
    <ul
      aria-label={AUDIT_CHIPS_LABEL}
      className="m-0 flex list-none flex-wrap items-center gap-2 p-0"
    >
      {active.map((key) => (
        <li
          key={key}
          className="inline-flex items-center gap-1.5 rounded-sm border bg-muted px-2 py-1 text-sm"
        >
          <span>
            {FILTER_LABELS[key]}: {chipValue(key, props)}
          </span>
          <Link
            href={auditHref(withoutFilter(props.filters, key))}
            aria-label={REMOVE_FILTER(FILTER_LABELS[key])}
            className="no-underline"
          >
            ✕
          </Link>
        </li>
      ))}
      <li>
        <Link href={auditHref(NO_FILTERS)} className="text-sm">
          {AUDIT_CLEAR}
        </Link>
      </li>
    </ul>
  );
}

function FilterSelect({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="kit-label">{label}</span>
      <Select name={name} defaultValue={value ?? ""}>
        {children}
      </Select>
    </label>
  );
}

// Πρόσωπο, περιοχή, στοιχείο, είδος με φόρμα GET: τα φίλτρα ζουν στη διεύθυνση. Ένα συγκεκριμένο στοιχείο (από
// «Ιστορικό αλλαγών») μένει κρυφό πεδίο και φεύγει μόνο από το ✕ του chip.
function FilterForm({ filters, options }: AuditFilterBarProps) {
  return (
    <form
      action={AUDIT_PATH}
      method="get"
      className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] items-end gap-3"
    >
      {filters.period !== "all" && (
        <input type="hidden" name="period" value={filters.period} />
      )}
      {filters.id && (
        <input type="hidden" name="entity" value={filters.entity} />
      )}
      {filters.id && <input type="hidden" name="id" value={filters.id} />}
      <FilterSelect name="who" label={FILTER_LABELS.who} value={filters.who}>
        <option value="">{ALL_PEOPLE}</option>
        <option value="system">{SYSTEM_ACTOR}</option>
        {options.actors.map((actor) => (
          <option key={actor.id} value={actor.id}>
            {actor.name}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect name="area" label={FILTER_LABELS.area} value={filters.area}>
        <option value="">{ALL_AREAS}</option>
        {options.areas.map((area) => (
          <option key={area.code} value={area.code}>
            {area.label}
          </option>
        ))}
      </FilterSelect>
      {!filters.id && (
        <FilterSelect
          name="entity"
          label={FILTER_LABELS.entity}
          value={filters.entity}
        >
          <option value="">{ALL_ENTITIES}</option>
          {options.areas.map((area) => (
            <optgroup key={area.code} label={area.label}>
              {options.entities
                .filter((entity) => entity.area === area.code)
                .map((entity) => (
                  <option key={entity.code} value={entity.code}>
                    {entity.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </FilterSelect>
      )}
      <FilterSelect
        name="action"
        label={FILTER_LABELS.action}
        value={filters.action}
      >
        <option value="">{ALL_ACTIONS}</option>
        {AUDIT_ACTIONS.map((action) => (
          <option key={action} value={action}>
            {ACTION_LABELS[action]}
          </option>
        ))}
      </FilterSelect>
      <div>
        <Button type="submit" variant="primary">
          {AUDIT_APPLY}
        </Button>
      </div>
    </form>
  );
}

export function AuditFilterBar(props: AuditFilterBarProps) {
  const { filters } = props;
  return (
    <Panel label={AUDIT_FILTERS_LABEL}>
      <div className="grid gap-4">
        <Segmented
          label={FILTER_LABELS.period}
          options={AUDIT_PERIODS.map((period) => ({
            label: PERIOD_LABELS[period],
            href: auditHref({ ...filters, period }),
            isCurrent: period === filters.period,
          }))}
        />
        <FilterForm {...props} />
        <Chips {...props} />
      </div>
    </Panel>
  );
}
