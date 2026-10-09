import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Tabs } from "@/components/ui/segmented";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import {
  NO_CLIENT_LABEL,
  STATE_LABELS,
  TAB_EMPTY_TEXT,
  TAB_LABELS,
} from "../labels";
import {
  activeSignals,
  crewRatio,
  formatDateTime,
  stateTone,
} from "../helpers";
import { FILMING_TABS, type FilmingRow, type FilmingTab } from "../types";

import { SignalBadges } from "./signal-badges";

interface FilmingListProps {
  rows: readonly FilmingRow[];
  tab: FilmingTab;
}

// E1: η λίστα των Γυρισμάτων με καρτέλες. Η βάση φιλτράρει· εδώ μόνο εμφανίζεται.
export function FilmingList({ rows, tab }: FilmingListProps) {
  const canSeeCrew = rows.some((row) => row.crew !== null);
  return (
    <div className="grid gap-4">
      <Tabs
        label="Καρτέλες Γυρισμάτων"
        options={FILMING_TABS.map((value) => ({
          label: TAB_LABELS[value],
          href: `/app/filming?tab=${value}`,
          isCurrent: value === tab,
        }))}
      />
      {rows.length === 0 ? (
        <Notice kind="empty" title="Κανένα Γύρισμα εδώ">
          <p className="m-0">{TAB_EMPTY_TEXT[tab]}</p>
        </Notice>
      ) : (
        <FilmingTable rows={rows} canSeeCrew={canSeeCrew} />
      )}
    </div>
  );
}

function FilmingTable({
  rows,
  canSeeCrew,
}: {
  rows: readonly FilmingRow[];
  canSeeCrew: boolean;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Πότε</Th>
          <Th>Πελάτης</Th>
          <Th>Παραγωγή</Th>
          <Th>Κατάσταση</Th>
          {canSeeCrew && <Th>Συνεργείο</Th>}
          <Th>Σήματα</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <FilmingRowView key={row.id} row={row} canSeeCrew={canSeeCrew} />
        ))}
      </tbody>
    </Table>
  );
}

function FilmingRowView({
  row,
  canSeeCrew,
}: {
  row: FilmingRow;
  canSeeCrew: boolean;
}) {
  return (
    <Tr>
      <Td data-label="Πότε">
        <Link href={`/app/filming/${row.id}`} className="font-medium">
          {formatDateTime(row.startsAt)}
        </Link>
      </Td>
      <Td data-label="Πελάτης">{row.client?.name ?? NO_CLIENT_LABEL}</Td>
      <Td data-label="Παραγωγή">{row.production.title}</Td>
      <Td data-label="Κατάσταση">
        <Badge tone={stateTone(row.state)}>{STATE_LABELS[row.state]}</Badge>
      </Td>
      {canSeeCrew && (
        <Td data-label="Συνεργείο">{crewRatio(row.crew) ?? "—"}</Td>
      )}
      <Td data-label="Σήματα">
        <SignalBadges signals={activeSignals(row.signals)} />
      </Td>
    </Tr>
  );
}
