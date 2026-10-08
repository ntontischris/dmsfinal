import Link from "next/link";

import { Badge, type Tone } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { Td, Th, Tr } from "@/components/ui/table";

import { BUCKET_LABELS, KIND_LABELS, PATH_LABELS } from "../labels";
import type {
  AgreementRowView,
  BucketFilter,
  KindFilter,
} from "../types";

export interface AgreementColumns {
  amount: boolean; // η στήλη «Ποσό» υπάρχει μόνο για όποιον «Βλέπει ποσά»
}

const BUCKET_KEYS: readonly BucketFilter[] = [
  "open",
  "proposal",
  "active",
  "closed",
  "all",
];

const KIND_OPTIONS: readonly { value: KindFilter; label: string }[] = [
  { value: "all", label: "Όλα τα είδη" },
  { value: "monthly", label: KIND_LABELS.monthly },
  { value: "one_off", label: KIND_LABELS.one_off },
];

// Οι τιμές των φίλτρων διαλέγονται από λίστα· ό,τι δεν αναγνωρίζεται μένει στο προηγούμενο.
export const parseBucket = (
  value: string,
  fallback: BucketFilter,
): BucketFilter => BUCKET_KEYS.find((key) => key === value) ?? fallback;

export const parseKind = (value: string, fallback: KindFilter): KindFilter =>
  KIND_OPTIONS.find((option) => option.value === value)?.value ?? fallback;

interface ToolbarProps {
  query: string;
  bucket: BucketFilter;
  kind: KindFilter;
  count: number;
  onQuery: (query: string) => void;
  onBucket: (bucket: BucketFilter) => void;
  onKind: (kind: KindFilter) => void;
}

export function AgreementsToolbar({
  query,
  bucket,
  kind,
  count,
  onQuery,
  onBucket,
  onKind,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <Field label="Αναζήτηση στις Συμφωνίες">
          <Input
            type="search"
            value={query}
            placeholder="Αναζήτηση στις Συμφωνίες…"
            autoComplete="off"
            onChange={(event) => onQuery(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Προβολή">
        <Select
          value={bucket}
          onChange={(event) =>
            onBucket(parseBucket(event.target.value, bucket))
          }
        >
          {BUCKET_KEYS.map((key) => (
            <option key={key} value={key}>
              {BUCKET_LABELS[key]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Είδος">
        <Select
          value={kind}
          onChange={(event) => onKind(parseKind(event.target.value, kind))}
        >
          {KIND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      <p className="m-0 pb-2 text-sm text-muted-foreground">
        {count} {count === 1 ? "Συμφωνία" : "Συμφωνίες"}
      </p>
    </div>
  );
}

export function AgreementsHead({ columns }: { columns: AgreementColumns }) {
  return (
    <thead>
      <tr>
        <Th>Πελάτης</Th>
        <Th>Συμφωνία</Th>
        <Th>Είδος</Th>
        <Th>Κατάσταση</Th>
        {columns.amount && <Th isNumeric>Ποσό</Th>}
        <Th>Χρόνος</Th>
        <Th>Υπεύθυνος</Th>
      </tr>
    </thead>
  );
}

// «Αναμένει Έγκριση» = περιμένει κάποιον (amber)· «Έληξε» = πρόβλημα (κόκκινο). Οι άλλες καταστάσεις μένουν ουδέτερες.
const statusTone = (row: AgreementRowView): Tone | undefined => {
  if (row.attentionLabel === PATH_LABELS.awaiting_approval) return "strong";
  if (row.attentionLabel === PATH_LABELS.expired) return "attention";
  return undefined;
};

interface RowProps {
  row: AgreementRowView;
  columns: AgreementColumns;
  canSeeCost: boolean;
}

export function AgreementsRow({ row, columns, canSeeCost }: RowProps) {
  return (
    <Tr>
      <Td data-label="Πελάτης">
        <Link href={row.clientHref}>{row.clientName}</Link>
      </Td>
      <Td data-label="Συμφωνία">
        <Link href={row.href} className="font-medium">
          {row.title}
        </Link>
      </Td>
      <Td data-label="Είδος">{row.kindLabel}</Td>
      <Td data-label="Κατάσταση">
        <span className="flex flex-wrap gap-1 max-sm:justify-end">
          <Badge tone={statusTone(row)}>{row.statusLabel}</Badge>
          {row.hasChangeRequests && (
            <Badge tone="attention">Ζήτησε αλλαγές</Badge>
          )}
          {canSeeCost && row.isLowMargin && (
            <Badge tone="attention">χαμηλό περιθώριο</Badge>
          )}
        </span>
      </Td>
      {columns.amount && (
        <Td data-label="Ποσό" isNumeric>
          <span className="grid gap-0.5 max-sm:justify-items-end sm:justify-items-end">
            {row.amount ?? "—"}
            {row.discountNote && (
              <span className="text-xs text-muted-foreground">
                {row.discountNote}
              </span>
            )}
          </span>
        </Td>
      )}
      <Td data-label="Χρόνος">
        <span className="grid gap-1 max-sm:justify-items-end">
          {row.timeText}
          {row.expiryText && <Badge tone="attention">{row.expiryText}</Badge>}
        </span>
      </Td>
      <Td data-label="Υπεύθυνος">{row.managerName ?? "—"}</Td>
    </Tr>
  );
}
