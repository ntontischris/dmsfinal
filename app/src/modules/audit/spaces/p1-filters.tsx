import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";

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
  auditHref,
  type AuditFilters,
} from "../url";
import { P1_CLEAR_HREF, p1ChipsOf } from "./p1-adapter";

interface Props {
  filters: AuditFilters;
  options: AuditOptions;
  subject: AuditPage["subject"];
}

// Φίλτρα του Ίχνους: όλα στη διεύθυνση (?who, ?area, ?entity, ?id, ?action, ?period), όπως τα δέχεται η βάση.
// Ένα συγκεκριμένο στοιχείο (από «Ιστορικό αλλαγών») μένει κρυφό πεδίο και φεύγει μόνο από το ✕ του chip.
export function AuditFilterBar({ filters, options, subject }: Props) {
  const chips = p1ChipsOf(filters, options, subject);
  return (
    <Panel label={AUDIT_FILTERS_LABEL}>
      <div className="btn-row">
        <span className="muted">Περίοδος:</span>
        {AUDIT_PERIODS.map((period) => (
          <Link
            key={period}
            className="button"
            data-primary={period === filters.period ? "true" : undefined}
            aria-current={period === filters.period ? "true" : undefined}
            href={auditHref({ ...filters, period })}
          >
            {PERIOD_LABELS[period]}
          </Link>
        ))}
      </div>
      <form className="p1-form" method="get" action={AUDIT_PATH}>
        {filters.period !== "all" && (
          <input type="hidden" name="period" value={filters.period} />
        )}
        {filters.id && (
          <input type="hidden" name="entity" value={filters.entity} />
        )}
        {filters.id && <input type="hidden" name="id" value={filters.id} />}
        <label>
          {FILTER_LABELS.who}
          <select
            className="select"
            name="who"
            defaultValue={filters.who ?? ""}
          >
            <option value="">{ALL_PEOPLE}</option>
            <option value="system">{SYSTEM_ACTOR}</option>
            {options.actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {FILTER_LABELS.area}
          <select
            className="select"
            name="area"
            defaultValue={filters.area ?? ""}
          >
            <option value="">{ALL_AREAS}</option>
            {options.areas.map((a) => (
              <option key={a.code} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        {!filters.id && (
          <label>
            {FILTER_LABELS.entity}
            <select
              className="select"
              name="entity"
              defaultValue={filters.entity ?? ""}
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
            </select>
          </label>
        )}
        <label>
          {FILTER_LABELS.action}
          <select
            className="select"
            name="action"
            defaultValue={filters.action ?? ""}
          >
            <option value="">{ALL_ACTIONS}</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="button" data-primary="true">
          {AUDIT_APPLY}
        </button>
      </form>
      {chips.length > 0 && (
        <ul className="chips p1-chips" aria-label={AUDIT_CHIPS_LABEL}>
          {chips.map((chip) => (
            <li key={chip.key} className="chip">
              {chip.text}{" "}
              <Link href={chip.href} aria-label={REMOVE_FILTER(chip.label)}>
                ✕
              </Link>
            </li>
          ))}
          <li>
            <Link href={P1_CLEAR_HREF}>{AUDIT_CLEAR}</Link>
          </li>
        </ul>
      )}
    </Panel>
  );
}
