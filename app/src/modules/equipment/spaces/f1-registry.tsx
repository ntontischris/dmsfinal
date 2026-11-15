"use client";

import Link from "next/link";
import { useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Entity, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { groupEquipmentUnits, groupLabel, matchesItemFilter } from "../helpers";
import { STATUS_LABELS } from "../labels";
import {
  EQUIPMENT_STATUSES,
  type EquipmentCategory,
  type EquipmentItemRow,
  type EquipmentStatus,
  type RegistryRow,
  type UnitGroup,
} from "../types";
import type { BookingIndex, NextBookingView } from "./f1-bookings";
import { F1Categories } from "./f1-categories";
import { F1NewItem } from "./f1-new-item";
import { isFreeOn, statusTone } from "./f-model";

interface F1RegistryProps {
  canManage: boolean;
  items: readonly EquipmentItemRow[];
  categories: readonly EquipmentCategory[];
  bookings: BookingIndex;
}

const ALL = "all";

const isStatus = (value: string): value is EquipmentStatus =>
  EQUIPMENT_STATUSES.some((status) => status === value);

const rowKey = (row: RegistryRow): string =>
  row.kind === "item"
    ? row.item.id
    : (row.group.units[0]?.id ?? row.group.baseName);

// Το επόμενο Γύρισμα του αντικειμένου· σύνδεσμος μόνο όπου ο Χρήστης βλέπει το Γύρισμα.
function NextBooking({ view }: { view: NextBookingView | undefined }) {
  if (!view) return <span className="muted">Κανένα</span>;
  const text = view.isPending ? `${view.label} (αναμένει έγκριση)` : view.label;
  return view.href ? <Link href={view.href}>{text}</Link> : <span>{text}</span>;
}

function ItemLine({
  item,
  next,
}: {
  item: EquipmentItemRow;
  next: NextBookingView | undefined;
}) {
  return (
    <tr>
      <td data-label="Αντικείμενο">
        <Entity
          name={item.name}
          href={hrefOf("F2", { id: item.id })}
          sub={item.code ?? undefined}
        />
      </td>
      <td data-label="Κατηγορία">
        {item.categoryName}
        {item.categoryRetired && <span className="muted"> (αποσυρμένη)</span>}
      </td>
      <td data-label="Κατάσταση">
        <Badge tone={statusTone(item.status)}>
          {STATUS_LABELS[item.status]}
        </Badge>
      </td>
      <td data-label="Επόμενο Γύρισμα">
        <NextBooking view={next} />
      </td>
    </tr>
  );
}

// Ομάδα μονάδων (όπως η σημερινή σελίδα): μία γραμμή με το πλήθος, που ανοίγει για κάθε μονάδα με την Κατάστασή της.
function GroupLine({
  group,
  next,
}: {
  group: UnitGroup;
  next: BookingIndex["next"];
}) {
  return (
    <tr>
      <td colSpan={4} data-label="Μονάδες">
        <details>
          <summary>
            <strong>{groupLabel(group)}</strong>{" "}
            <span className="muted">{group.categoryName}</span>
          </summary>
          <RowList>
            {group.shown.map((unit) => (
              <ListRow
                key={unit.id}
                href={hrefOf("F2", { id: unit.id })}
                title={unit.name}
                sub={
                  [
                    unit.code,
                    next[unit.id] && `Επόμενο: ${next[unit.id]?.label}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                aside={
                  <Badge tone={statusTone(unit.status)}>
                    {STATUS_LABELS[unit.status]}
                  </Badge>
                }
              />
            ))}
          </RowList>
        </details>
      </td>
    </tr>
  );
}

// Το μητρώο (prototype `f1-registry.tsx`) με τα πραγματικά αντικείμενα. Χωρίς φίλτρο Κατάστασης κρύβονται τα αποσυρμένα.
// Οι μονάδες του ίδιου αντικειμένου («… #1», «… #2») ομαδοποιούνται, όπως στη σημερινή σελίδα.
export function F1Registry({
  canManage,
  items,
  categories,
  bookings,
}: F1RegistryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [status, setStatus] = useState<EquipmentStatus | typeof ALL>(ALL);
  const [isAdding, setIsAdding] = useState(false);
  const [freeOn, setFreeOn] = useState("");

  const visible = groupEquipmentUnits(
    items,
    (item) =>
      matchesItemFilter(item, { query, categoryId: category, status }) &&
      (freeOn === "" || isFreeOn(item, bookings.busyDays, freeOn)),
  );

  return (
    <>
      <div className="toolbar">
        <span className="muted grow">
          {canManage
            ? "Η Δέσμευση γίνεται στη σελίδα του Γυρίσματος ή στη σελίδα του αντικειμένου. Εδώ κρατάς το μητρώο."
            : "Μόνο ανάγνωση: δεσμεύεις στα Γυρίσματά σου, δεν αλλάζεις το μητρώο."}
        </span>
        {canManage && (
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => setIsAdding(true)}
          >
            Νέο αντικείμενο
          </button>
        )}
      </div>
      {isAdding && (
        <F1NewItem
          items={items}
          categories={categories}
          onDone={() => setIsAdding(false)}
        />
      )}
      {items.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Το μητρώο είναι άδειο</h2>
          <p className="muted">
            {canManage
              ? "Πρόσθεσε το πρώτο αντικείμενο με «Νέο αντικείμενο». Μέχρι τότε τα Γυρίσματα γίνονται κανονικά, απλώς χωρίς Δέσμευση εξοπλισμού."
              : "Δεν έχει καταχωρηθεί ακόμα Εξοπλισμός. Τον προσθέτει η Διαχείριση."}
          </p>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <input
              className="input grow"
              type="search"
              placeholder="Αναζήτηση με όνομα ή κωδικό…"
              aria-label="Αναζήτηση στον Εξοπλισμό"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="select"
              aria-label="Κατηγορία"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value={ALL}>Όλες οι Κατηγορίες</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              className="select"
              aria-label="Κατάσταση"
              value={status}
              onChange={(event) => {
                const next = event.target.value;
                setStatus(isStatus(next) ? next : ALL);
              }}
            >
              <option value={ALL}>Σε χρήση (χωρίς αποσυρμένα)</option>
              {EQUIPMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {STATUS_LABELS[item]}
                </option>
              ))}
            </select>
            <label className="muted">
              <span>Ελεύθερο στις </span>
              <input
                className="input"
                type="date"
                value={freeOn}
                onChange={(event) => setFreeOn(event.target.value)}
              />
            </label>
          </div>
          {freeOn !== "" && (
            <p className="muted">
              Δείχνει μόνο ό,τι είναι Διαθέσιμο και δεν έχει ανοιχτό Γύρισμα
              εκείνη τη μέρα.
            </p>
          )}
          {visible.length === 0 ? (
            <p className="muted">Τίποτα δεν ταιριάζει με τα φίλτρα.</p>
          ) : (
            <div className="scroll">
              <table className="rtable">
                <thead>
                  <tr>
                    <th>Αντικείμενο</th>
                    <th>Κατηγορία</th>
                    <th>Κατάσταση</th>
                    <th>Επόμενο Γύρισμα</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) =>
                    row.kind === "item" ? (
                      <ItemLine
                        key={rowKey(row)}
                        item={row.item}
                        next={bookings.next[row.item.id]}
                      />
                    ) : (
                      <GroupLine
                        key={rowKey(row)}
                        group={row.group}
                        next={bookings.next}
                      />
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {canManage && <F1Categories categories={categories} />}
    </>
  );
}
