import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { CLIENT_STATUS_LABEL, NO_MANAGER_LABEL } from "../labels";
import type { ClientRow, SalesCaps } from "../types";

const PAGE_SIZE = 100;

// Ένας Πελάτης, ένας πωλητής: οι Πελάτες των άλλων φαίνονται χωρίς σύνδεσμο, μόνο με το όνομα του Υπεύθυνου.
export function ClientsTable({
  rows,
  caps,
}: {
  rows: readonly ClientRow[];
  caps: SalesCaps;
}) {
  if (rows.length === 0) return <EmptyClients caps={caps} />;
  return (
    <div className="grid gap-3">
      {caps.manageScope === "mine" && (
        <p className="m-0 text-sm text-muted-foreground">
          Ένας Πελάτης, ένας πωλητής: βλέπεις το όνομα των Πελατών των άλλων,
          αλλά ανοίγεις μόνο όσους σε αφορούν.
        </p>
      )}
      <Table>
        <thead>
          <tr>
            <Th>Πελάτης</Th>
            <Th>Κατάσταση</Th>
            <Th>Υπεύθυνος</Th>
            <Th isNumeric>Ανοιχτές Ευκαιρίες</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ClientTableRow key={row.id} row={row} />
          ))}
        </tbody>
      </Table>
      {rows.length >= PAGE_SIZE && (
        <p className="m-0 text-sm text-muted-foreground">
          Εμφανίζονται οι πρώτοι {PAGE_SIZE}. Στένεψε την αναζήτηση.
        </p>
      )}
    </div>
  );
}

function ClientTableRow({ row }: { row: ClientRow }) {
  return (
    <Tr>
      <Td data-label="Πελάτης">
        <span className="grid gap-0.5 max-sm:justify-items-end">
          {row.canOpen ? (
            <Link href={`/app/clients/${row.id}`} className="font-medium">
              {row.name}
            </Link>
          ) : (
            <span className="font-medium">{row.name}</span>
          )}
          {row.canOpen && row.city !== "" && (
            <span className="text-xs text-muted-foreground">{row.city}</span>
          )}
          {row.isPossibleDuplicate && (
            <span>
              <Badge tone="attention">Πιθανό διπλό</Badge>
            </span>
          )}
        </span>
      </Td>
      <Td data-label="Κατάσταση">
        <Badge>{row.canOpen ? CLIENT_STATUS_LABEL : "Κατειλημμένος"}</Badge>
      </Td>
      <Td data-label="Υπεύθυνος">
        <ManagerCell row={row} />
      </Td>
      <Td data-label="Ανοιχτές Ευκαιρίες" isNumeric>
        {row.openOpportunities ?? "—"}
      </Td>
    </Tr>
  );
}

function ManagerCell({ row }: { row: ClientRow }) {
  if (row.canOpen) return <>{row.managerName ?? NO_MANAGER_LABEL}</>;
  return (
    <span className="text-muted-foreground">
      {row.managerName
        ? `Πελάτης του/της ${row.managerName}`
        : "Δεν έχει ακόμα Υπεύθυνο"}
    </span>
  );
}

function EmptyClients({ caps }: { caps: SalesCaps }) {
  return (
    <Notice kind="empty" title="Δεν υπάρχουν Πελάτες ακόμα">
      <p className="m-0">
        {caps.manageScope === "all"
          ? "Οι Πελάτες γεννιούνται από τη φόρμα της Ιστοσελίδας ή όταν καταχωρείς εσύ Ευκαιρία."
          : "Όταν καταχωρηθεί ο πρώτος Πελάτης, θα εμφανιστεί εδώ."}
      </p>
    </Notice>
  );
}
