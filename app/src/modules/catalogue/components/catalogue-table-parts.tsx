import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { Td, Th, Tr } from "@/components/ui/table";
import { cn } from "@/lib/cn";

import { NOT_PRICED_LABEL } from "../labels";
import type { CatalogueRow, KindFilter } from "../types";

export interface CatalogueColumns {
  price: boolean;
  cost: boolean;
  margin: boolean;
}

const KIND_OPTIONS: readonly { value: KindFilter; label: string }[] = [
  { value: "all", label: "Όλα" },
  { value: "package", label: "Πακέτα" },
  { value: "service", label: "Υπηρεσίες" },
];

// Η τιμή του φίλτρου διαλέγεται από τη λίστα· ό,τι δεν αναγνωρίζεται μένει στο προηγούμενο.
export const parseKindFilter = (
  value: string,
  fallback: KindFilter,
): KindFilter =>
  KIND_OPTIONS.find((option) => option.value === value)?.value ?? fallback;

interface ToolbarProps {
  query: string;
  kind: KindFilter;
  withRetired: boolean;
  canSeeRetired: boolean;
  onQuery: (query: string) => void;
  onKind: (kind: KindFilter) => void;
  onWithRetired: (withRetired: boolean) => void;
}

export function CatalogueToolbar({
  query,
  kind,
  withRetired,
  canSeeRetired,
  onQuery,
  onKind,
  onWithRetired,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <Field label="Αναζήτηση στον Κατάλογο">
          <Input
            type="search"
            value={query}
            placeholder="Αναζήτηση στον Κατάλογο…"
            autoComplete="off"
            onChange={(event) => onQuery(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Είδος">
        <Select
          value={kind}
          onChange={(event) =>
            onKind(parseKindFilter(event.target.value, kind))
          }
        >
          {KIND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      {canSeeRetired && (
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={withRetired}
            onChange={(event) => onWithRetired(event.target.checked)}
            className="accent-primary"
          />
          και αρχειοθετημένα
        </label>
      )}
    </div>
  );
}

export function CatalogueHead({ columns }: { columns: CatalogueColumns }) {
  return (
    <thead>
      <tr>
        <Th>Όνομα</Th>
        <Th>Παροχές</Th>
        {columns.price && <Th isNumeric>Τιμή</Th>}
        {columns.cost && <Th isNumeric>Εκτ. κόστος</Th>}
        {columns.margin && <Th isNumeric>Περιθώριο</Th>}
      </tr>
    </thead>
  );
}

export function CatalogueTableRow({
  row,
  columns,
}: {
  row: CatalogueRow;
  columns: CatalogueColumns;
}) {
  const muted = row.isRetired && "text-muted-foreground";
  return (
    <Tr>
      <Td data-label="Όνομα" className={cn(muted)}>
        <span className="grid gap-1 max-sm:justify-items-end">
          <Link href={row.href} className="font-medium">
            {row.name}
          </Link>
          <span className="text-xs text-muted-foreground">{row.kindLabel}</span>
          {(row.isPublic || row.isRetired) && (
            <span className="flex flex-wrap gap-1">
              {row.isPublic && <Badge>Δημόσιο</Badge>}
              {row.isRetired && <Badge>Αρχειοθετημένο</Badge>}
            </span>
          )}
        </span>
      </Td>
      <Td data-label="Παροχές" className={cn(muted)}>
        {row.provisions}
      </Td>
      {columns.price && (
        <Td data-label="Τιμή" isNumeric className={cn(muted)}>
          {row.price ?? NOT_PRICED_LABEL}
        </Td>
      )}
      {columns.cost && (
        <Td data-label="Εκτ. κόστος" isNumeric className={cn(muted)}>
          {row.cost ?? NOT_PRICED_LABEL}
        </Td>
      )}
      {columns.margin && (
        <Td data-label="Περιθώριο" isNumeric className={cn(muted)}>
          <span className="grid gap-1 max-sm:justify-items-end sm:justify-items-end">
            {row.margin ?? NOT_PRICED_LABEL}
            {row.isBelowMin && (
              <Badge tone="attention">κάτω από την ελάχιστη</Badge>
            )}
          </span>
        </Td>
      )}
    </Tr>
  );
}
