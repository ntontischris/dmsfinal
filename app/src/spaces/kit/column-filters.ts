// Κάθε στήλη ενός πίνακα και φίλτρο (b1): μία κάρτα της σειράς φίλτρων ανά στήλη, με επιλογές από τις τιμές που υπάρχουν.
// Η επιλογή ζει στη διεύθυνση (?<key>=<τιμή>)· καθαρές συναρτήσεις, ίδιες για κάθε λίστα.

import type { FilterGroup } from "./filter-bar-model";

export interface ColumnValue {
  value: string;
  label: string;
}

export interface ColumnFilter<T> {
  // Το όνομα στη διεύθυνση.
  key: string;
  label: string;
  // Οι τιμές μιας γραμμής: μία συνήθως, περισσότερες όταν το κελί έχει λίστα (π.χ. Πακέτα). Κενό = δεν ταιριάζει σε καμία.
  valuesOf: (row: T) => readonly ColumnValue[];
  allLabel?: string;
  // Σταθερή σειρά επιλογών (π.χ. κλίμακες χρόνου), με τις τιμές τους· αλλιώς αλφαβητικά.
  order?: readonly string[];
  isSearchable?: boolean;
}

// Η τρέχουσα επιλογή ανά key (undefined = όλα).
export type ColumnSelection = Readonly<Record<string, string | undefined>>;

// Η επιλογή από τη διεύθυνση, μόνο για τα keys των στηλών (τα κενά = όλα).
export const selectionOf = (
  keys: readonly string[],
  params: Readonly<Record<string, string | string[] | undefined>>,
): ColumnSelection =>
  Object.fromEntries(
    keys.flatMap((key) => {
      const raw = params[key];
      const value = typeof raw === "string" ? raw.trim() : "";
      return value === "" ? [] : [[key, value]];
    }),
  );

const hasValue = <T>(row: T, column: ColumnFilter<T>, value: string) =>
  column.valuesOf(row).some((item) => item.value === value);

export const filterByColumns = <T>(
  rows: readonly T[],
  columns: readonly ColumnFilter<T>[],
  selection: ColumnSelection,
): T[] =>
  rows.filter((row) =>
    columns.every((column) => {
      const wanted = selection[column.key];
      return wanted === undefined || hasValue(row, column, wanted);
    }),
  );

// Οι τιμές που υπάρχουν στη στήλη, μία φορά η καθεμία.
export const distinctValues = <T>(
  rows: readonly T[],
  column: ColumnFilter<T>,
): ColumnValue[] => {
  const byValue = new Map<string, ColumnValue>();
  rows.forEach((row) =>
    column.valuesOf(row).forEach((item) => {
      if (!byValue.has(item.value)) byValue.set(item.value, item);
    }),
  );
  const values = [...byValue.values()];
  const { order } = column;
  return order
    ? values.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
    : values.sort((a, b) => a.label.localeCompare(b.label, "el"));
};

interface GroupsInput<T> {
  rows: readonly T[];
  columns: readonly ColumnFilter<T>[];
  selection: ColumnSelection;
  // Η διεύθυνση με την επιλογή αλλαγμένη (undefined = όλα).
  hrefWith: (selection: ColumnSelection) => string;
}

const groupOf = <T>(
  input: GroupsInput<T>,
  column: ColumnFilter<T>,
): FilterGroup | null => {
  const { rows, columns, selection, hrefWith } = input;
  const values = distinctValues(rows, column);
  const current = selection[column.key];
  if (values.length < 2 && current === undefined) return null;
  const others = columns.filter((other) => other.key !== column.key);
  const base = filterByColumns(rows, others, selection);
  const pick = (value: string | undefined) =>
    hrefWith({ ...selection, [column.key]: value });
  return {
    label: column.label,
    isSearchable: column.isSearchable,
    all: {
      label: column.allLabel ?? "όλοι",
      href: pick(undefined),
      isCurrent: current === undefined,
    },
    options: values.map((item) => ({
      label: item.label,
      href: pick(item.value),
      isCurrent: current === item.value,
      count: base.filter((row) => hasValue(row, column, item.value)).length,
    })),
  };
};

// Μία κάρτα ανά στήλη. Ο αριθμός κάθε επιλογής: πόσες γραμμές θα έμεναν αν τη διάλεγες, με τις άλλες στήλες όπως είναι.
// Στήλη με μία μόνο τιμή και χωρίς επιλογή δεν βγάζει κάρτα (δεν θα στένευε τίποτα).
export const columnFilterGroups = <T>(input: GroupsInput<T>): FilterGroup[] =>
  input.columns.flatMap((column) => groupOf(input, column) ?? []);
