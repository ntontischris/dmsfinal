import Link from "next/link";

import { Table, Td, Th, Tr } from "@/components/ui/table";

import { changeLines, type ChangeLine } from "../changes";
import { COLUMNS, HIDDEN_LABELS, MORE_CHANGES } from "../labels";
import { pageHref } from "../links";
import type { AuditItem } from "../schema";
import { actionText } from "../sheet";

// Ο πίνακας του P1: Πότε, Ποιος, Περιοχή, Στοιχείο, Ενέργεια, Πριν → Μετά. Στο κινητό κάθε γραμμή γίνεται κάρτα.

const MAX_LINES = 6;
const HIDDEN_TEXTS: readonly string[] = Object.values(HIDDEN_LABELS);

const AT = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const when = (iso: string): string => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : AT.format(new Date(time));
};

function Value({ text }: { text: string }) {
  return HIDDEN_TEXTS.includes(text) ? (
    <em className="text-muted-foreground">{text}</em>
  ) : (
    <>{text}</>
  );
}

function Line({ line }: { line: ChangeLine }) {
  return (
    <li className="[overflow-wrap:anywhere]">
      <span className="text-muted-foreground">{line.key}: </span>
      {line.before !== undefined && <Value text={line.before} />}
      {line.before !== undefined && line.after !== undefined && " → "}
      {line.after !== undefined && <Value text={line.after} />}
    </li>
  );
}

function Changes({ item }: { item: AuditItem }) {
  const lines = changeLines(item);
  if (lines.length === 0) return <>—</>;
  return (
    <ul className="m-0 grid list-none gap-0.5 p-0 text-left">
      {lines.slice(0, MAX_LINES).map((line) => (
        <Line key={line.key} line={line} />
      ))}
      {lines.length > MAX_LINES && (
        <li className="text-muted-foreground">
          {MORE_CHANGES(lines.length - MAX_LINES)}
        </li>
      )}
    </ul>
  );
}

function Subject({ item }: { item: AuditItem }) {
  const href = pageHref(item);
  const name = item.subject
    ? `${item.entityLabel} «${item.subject}»`
    : item.entityLabel;
  return href ? <Link href={href}>{name}</Link> : <>{name}</>;
}

export function AuditTable({ items }: { items: readonly AuditItem[] }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>{COLUMNS.at}</Th>
          <Th>{COLUMNS.who}</Th>
          <Th>{COLUMNS.area}</Th>
          <Th>{COLUMNS.subject}</Th>
          <Th>{COLUMNS.action}</Th>
          <Th>{COLUMNS.change}</Th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <Tr key={item.id}>
            <Td data-label={COLUMNS.at} className="whitespace-nowrap">
              <time dateTime={item.at}>{when(item.at)}</time>
            </Td>
            <Td data-label={COLUMNS.who}>{item.actorName}</Td>
            <Td data-label={COLUMNS.area}>{item.areaLabel}</Td>
            <Td
              data-label={COLUMNS.subject}
              className="[overflow-wrap:anywhere]"
            >
              <Subject item={item} />
            </Td>
            <Td data-label={COLUMNS.action}>{actionText(item)}</Td>
            <Td data-label={COLUMNS.change} className="min-w-0">
              <Changes item={item} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
