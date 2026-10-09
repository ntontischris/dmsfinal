"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import {
  filterItems,
  groupEquipmentUnits,
  groupLabel,
  statusTone,
} from "../helpers";
import { STATUS_LABELS } from "../labels";
import type {
  EquipmentCategory,
  EquipmentItemRow,
  RegistryRow,
  UnitGroup,
} from "../types";

import {
  EquipmentToolbar,
  type ItemFilterValues,
} from "./equipment-table-parts";

interface EquipmentTableProps {
  items: readonly EquipmentItemRow[];
  categories: readonly EquipmentCategory[]; // οι ενεργές, για το φίλτρο
}

const DEFAULT_FILTER: ItemFilterValues = {
  query: "",
  categoryId: "all",
  status: "all",
};

// F1: αναζήτηση, Κατηγορία και Κατάσταση ζουν στον browser· τα αποσυρμένα κρύβονται αν δεν διαλέξεις Κατάσταση.
export function EquipmentTable({ items, categories }: EquipmentTableProps) {
  const [filter, setFilter] = useState<ItemFilterValues>(DEFAULT_FILTER);
  const visible = groupEquipmentUnits(filterItems(items, filter));
  return (
    <div className="grid gap-3">
      <EquipmentToolbar
        value={filter}
        categories={categories}
        onChange={setFilter}
      />
      {visible.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">
          Τίποτα δεν ταιριάζει με τα φίλτρα.
        </p>
      ) : (
        <Table>
          <thead>
            <Tr>
              <Th>Αντικείμενο</Th>
              <Th>Κατηγορία</Th>
              <Th>Κατάσταση</Th>
            </Tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <RegistryLine key={rowKey(row)} row={row} />
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

const rowKey = (row: RegistryRow): string =>
  row.kind === "item" ? row.item.id : row.group.units[0]?.id ?? row.group.baseName;

function RegistryLine({ row }: { row: RegistryRow }) {
  if (row.kind === "item") return <ItemRow item={row.item} />;
  return <GroupRow group={row.group} />;
}

// Ομάδα μονάδων: μία γραμμή με το πλήθος, που ανοίγει για να δεις κάθε μονάδα με την Κατάστασή της.
function GroupRow({ group }: { group: UnitGroup }) {
  return (
    <Tr>
      <Td colSpan={3} data-label="Μονάδες">
        <details>
          <summary className="cursor-pointer">
            <span className="font-medium">{groupLabel(group)}</span>
            <span className="ml-2 text-sm text-muted-foreground">{group.categoryName}</span>
          </summary>
          <ul className="mt-2 grid gap-1 pl-4">
            {group.units.map((unit) => (
              <li key={unit.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/app/equipment/${unit.id}`} className="font-medium">
                  {unit.name}
                </Link>
                {unit.code && <span className="text-muted-foreground">{unit.code}</span>}
                <Badge tone={statusTone(unit.status)}>{STATUS_LABELS[unit.status]}</Badge>
              </li>
            ))}
          </ul>
        </details>
      </Td>
    </Tr>
  );
}

function ItemRow({ item }: { item: EquipmentItemRow }) {
  return (
    <Tr>
      <Td data-label="Αντικείμενο">
        <Link href={`/app/equipment/${item.id}`} className="font-medium">
          {item.name}
        </Link>
        {item.code && (
          <span className="ml-2 text-sm text-muted-foreground">{item.code}</span>
        )}
      </Td>
      <Td data-label="Κατηγορία">
        {item.categoryName}
        {item.categoryRetired && (
          <span className="ml-2 text-sm text-muted-foreground">(αποσυρμένη)</span>
        )}
      </Td>
      <Td data-label="Κατάσταση">
        <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
      </Td>
    </Tr>
  );
}
