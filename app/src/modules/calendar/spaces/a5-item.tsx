import Link from "next/link";

import { Badge } from "@/spaces/screens/shared";

import { PENDING_STATUS, type A5Item as Item } from "./a5-model";

// Ένα στοιχείο του Ημερολογίου, από το prototype (`screens/a5-item.tsx`): κουτάκι στις μέρες, γραμμή στη λίστα.

interface A5ItemProps {
  item: Item;
  compact?: boolean;
}

// Χωρίς ώρα: η κατάσταση της μέρας και το Επόμενο βήμα (έχει μόνο μέρα). Η προθεσμία είναι «όλη μέρα», όπως στο prototype.
const UNTIMED = new Set(["closed", "day", "nextStep"]);

const timeLabel = (item: Item): string | null => {
  if (UNTIMED.has(item.kind)) return null;
  return item.from ? `${item.from}–${item.to ?? ""}` : "όλη μέρα";
};

// Το Είδος φαίνεται ως σήμανση μόνο όταν ο τίτλος δεν το λέει ήδη (κλεισμένος χρόνος χωρίς τίτλο παίρνει το Είδος ως τίτλο).
const markOf = (item: Item): string | null =>
  item.mark && item.mark !== item.title ? item.mark : null;

// Σχέδιο «3B»: το εικονίδιο μπροστά από τον τίτλο (του Είδους, ή 🎬 / ➜ / ⏱). Κρυφό για τους αναγνώστες οθόνης, ώστε
// το όνομα του συνδέσμου να μένει ο τίτλος. Στη λίστα κρατά και το χρώμα της γραμμής (data-row-*).
function Icon({ item }: { item: Item }) {
  if (!item.icon && !item.tone) return null;
  return (
    <span
      className="a5-icon"
      aria-hidden="true"
      data-row-kind={item.kind}
      data-row-tone={item.tone ?? undefined}
    >
      {item.icon}
    </span>
  );
}

function StatusBadge({ item }: { item: Item }) {
  if (item.kind === "day" && item.status) return <Badge>{item.status}</Badge>;
  if (item.kind !== "filming") return null;
  if (item.status === PENDING_STATUS)
    return <Badge tone="attention">Αναμένει έγκριση</Badge>;
  return null;
}

export function A5Item({ item, compact = false }: A5ItemProps) {
  const time = timeLabel(item);
  const mark = markOf(item);
  const content = (
    <>
      {time && <span className="a5-time">{time}</span>}
      {mark && <span className="a5-mark">{mark}</span>}
      <span className="a5-title">
        <Icon item={item} />
        {item.title}
      </span>
      {!compact && item.detail && (
        <span className="a5-detail">{item.detail}</span>
      )}
      <StatusBadge item={item} />
    </>
  );
  const props = {
    className: "a5-item",
    "data-kind": item.kind,
    "data-tone": item.tone ?? undefined,
    "data-status": item.status ?? undefined,
    "data-pending": item.status === PENDING_STATUS,
  };
  return item.href ? (
    <Link href={item.href} {...props}>
      {content}
    </Link>
  ) : (
    <div {...props}>{content}</div>
  );
}

const RANGE_TONE_FADED = new Set(["busy", "closed"]);

// Μία γραμμή της λίστας (ml-line): ώρα μπροστά, τίτλος + λεπτομέρεια, κατάσταση δεξιά.
export function A5Row({ item }: { item: Item }) {
  const hasRange = !UNTIMED.has(item.kind);
  const sub = [markOf(item), item.detail].filter(Boolean).join(" · ");
  const lead = hasRange ? timeLabel(item) : null;
  const title = (
    <>
      <Icon item={item} />
      {item.title}
    </>
  );
  return (
    <li
      className="ml-line a5-row"
      data-urgent={item.status === PENDING_STATUS || undefined}
      data-faded={RANGE_TONE_FADED.has(item.kind) || undefined}
    >
      <span className="a5-lead">{lead}</span>
      <span className="ml-main">
        <strong>
          {item.href ? <Link href={item.href}>{title}</Link> : title}
        </strong>
        {sub && <small>{sub}</small>}
      </span>
      <span className="ml-quick">
        <StatusBadge item={item} />
      </span>
    </li>
  );
}
