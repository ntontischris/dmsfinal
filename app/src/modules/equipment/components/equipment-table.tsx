"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { filterItems, statusTone } from "../helpers";
import { STATUS_LABELS } from "../labels";
import type { EquipmentCategory, EquipmentItemRow } from "../types";

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
  const visible = filterItems(items, filter);
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
            {visible.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </tbody>
        </Table>
      )}
    </div>
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
