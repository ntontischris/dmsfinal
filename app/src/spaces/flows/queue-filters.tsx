"use client";

import { FilterBarFrame } from "@/spaces/kit/filter-bar-frame";

import { AREAS, inArea, type QueueRow } from "./queue-rows";

interface QueueFiltersProps {
  rows: readonly QueueRow[];
  area: string | null;
  onPick: (area: string | null) => void;
}

// Μαλακή κάρτα-φίλτρο «Χώρος» με popover: πόσα έχει κάθε Χώρος· μόνο όσοι έχουν γραμμές.
export function QueueFilters({ rows, area, onPick }: QueueFiltersProps) {
  const areas = AREAS.map((name) => ({
    name,
    count: inArea(rows, name).length,
  })).filter((item) => item.count > 0);
  if (areas.length < 2) return null;
  const options = [{ name: null, count: rows.length }, ...areas];
  return (
    <FilterBarFrame label="Φίλτρα λίστας">
      <details className="kit-fb-card" name="flow-queue-filters">
        <summary>
          <span className="kit-fb-label">Χώρος</span>
          <span className="kit-fb-chip" data-set={area !== null}>
            {area ?? "Όλοι"}
          </span>
          <span className="kit-fb-chev" aria-hidden="true" />
        </summary>
        <div className="kit-fb-pop">
          <ul className="kit-fb-list">
            {options.map((item) => (
              <li key={item.name ?? "all"}>
                <button
                  type="button"
                  className="kit-fb-opt"
                  aria-current={item.name === area ? "true" : undefined}
                  onClick={() => onPick(item.name)}
                >
                  <span className="kit-fb-radio" aria-hidden="true" />
                  <span className="kit-fb-name">{item.name ?? "Όλοι"}</span>
                  <span className="kit-fb-count">{item.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </FilterBarFrame>
  );
}
