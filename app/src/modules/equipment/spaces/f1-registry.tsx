"use client";

import Link from "next/link";
import { useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

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
  if (!view) return <>Κανένα</>;
  const text = view.isPending ? `${view.label} (αναμένει έγκριση)` : view.label;
  return view.href ? <Link href={view.href}>{text}</Link> : <>{text}</>;
}

function ItemLine({
  item,
  next,
}: {
  item: EquipmentItemRow;
  next: NextBookingView | undefined;
}) {
  return (
    <tr className="ml-line">
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(item.name)}
      </td>
      <td className="ml-main">
        <Link href={hrefOf("F2", { id: item.id })}>
          <strong>{item.name}</strong>
        </Link>
        <small>
          {[item.code, item.categoryName].filter(Boolean).join(" · ")}
          {item.categoryRetired && " (αποσυρμένη)"}
        </small>
        <small>
          Επόμενο Γύρισμα: <NextBooking view={next} />
        </small>
      </td>
      <td className="ml-quick">
        <Badge tone={statusTone(item.status)}>
          {STATUS_LABELS[item.status]}
        </Badge>
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
    <tr className="ml-line">
      <td className="ml-thumb" aria-hidden="true">
        {initialsOf(group.baseName)}
      </td>
      <td className="ml-main" colSpan={2}>
        <details className="f-group-units">
          <summary>
            <strong>{groupLabel(group)}</strong>{" "}
            <small>{group.categoryName}</small>
          </summary>
          <ul className="ml-list">
            {group.shown.map((unit) => (
              <li key={unit.id} className="ml-line">
                <span className="ml-thumb" aria-hidden="true">
                  #
                </span>
                <div className="ml-main">
                  <Link href={hrefOf("F2", { id: unit.id })}>
                    <strong>{unit.name}</strong>
                  </Link>
                  <small>
                    {[
                      unit.code,
                      next[unit.id] && `Επόμενο: ${next[unit.id]?.label}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </small>
                </div>
                <span className="ml-quick">
                  <Badge tone={statusTone(unit.status)}>
                    {STATUS_LABELS[unit.status]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </details>
      </td>
    </tr>
  );
}

interface FiltersProps {
  categories: readonly EquipmentCategory[];
  query: string;
  setQuery: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  status: EquipmentStatus | typeof ALL;
  setStatus: (value: EquipmentStatus | typeof ALL) => void;
  freeOn: string;
  setFreeOn: (value: string) => void;
}

function Filters(props: FiltersProps) {
  return (
    <div className="f-filters">
      <input
        className="input"
        type="search"
        placeholder="Αναζήτηση με όνομα ή κωδικό…"
        aria-label="Αναζήτηση στον Εξοπλισμό"
        value={props.query}
        onChange={(event) => props.setQuery(event.target.value)}
      />
      <select
        className="select"
        aria-label="Κατηγορία"
        value={props.category}
        onChange={(event) => props.setCategory(event.target.value)}
      >
        <option value={ALL}>Όλες οι Κατηγορίες</option>
        {props.categories.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <select
        className="select"
        aria-label="Κατάσταση"
        value={props.status}
        onChange={(event) => {
          const value = event.target.value;
          props.setStatus(isStatus(value) ? value : ALL);
        }}
      >
        <option value={ALL}>Σε χρήση (χωρίς αποσυρμένα)</option>
        {EQUIPMENT_STATUSES.map((item) => (
          <option key={item} value={item}>
            {STATUS_LABELS[item]}
          </option>
        ))}
      </select>
      <label>
        <span>Ελεύθερο στις </span>
        <input
          className="input"
          type="date"
          value={props.freeOn}
          onChange={(event) => props.setFreeOn(event.target.value)}
        />
      </label>
    </div>
  );
}

function Lines({
  rows,
  bookings,
}: {
  rows: readonly RegistryRow[];
  bookings: BookingIndex;
}) {
  if (rows.length === 0)
    return <p className="ml-empty">Τίποτα δεν ταιριάζει με τα φίλτρα.</p>;
  return (
    <table className="ml-table">
      <thead>
        <tr>
          <th scope="col">Σήμα</th>
          <th scope="col">Αντικείμενο</th>
          <th scope="col">Κατάσταση</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) =>
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
  const filters = {
    categories,
    query,
    setQuery,
    category,
    setCategory,
    status,
    setStatus,
    freeOn,
    setFreeOn,
  };

  return (
    <>
      <div className="ml-head">
        <p>
          {canManage
            ? "Η Δέσμευση γίνεται στη σελίδα του Γυρίσματος ή στη σελίδα του αντικειμένου. Εδώ κρατάς το μητρώο."
            : "Μόνο ανάγνωση: δεσμεύεις στα Γυρίσματά σου, δεν αλλάζεις το μητρώο."}
        </p>
        {canManage && (
          <button
            type="button"
            className="ml-cta"
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
        <p className="ml-empty" role="status">
          <strong>Το μητρώο είναι άδειο.</strong>{" "}
          {canManage
            ? "Πρόσθεσε το πρώτο αντικείμενο με «Νέο αντικείμενο». Μέχρι τότε τα Γυρίσματα γίνονται κανονικά, απλώς χωρίς Δέσμευση εξοπλισμού."
            : "Δεν έχει καταχωρηθεί ακόμα Εξοπλισμός. Τον προσθέτει η Διαχείριση."}
        </p>
      ) : (
        <>
          <Filters {...filters} />
          {freeOn !== "" && (
            <p className="f-note">
              Δείχνει μόνο ό,τι είναι Διαθέσιμο και δεν έχει ανοιχτό Γύρισμα
              εκείνη τη μέρα.
            </p>
          )}
          <Lines rows={visible} bookings={bookings} />
        </>
      )}
      {canManage && <F1Categories categories={categories} />}
    </>
  );
}
