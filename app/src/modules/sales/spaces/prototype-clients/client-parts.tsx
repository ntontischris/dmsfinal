// PROTOTYPE — throwaway. Κοινά κομμάτια των παραλλαγών της Σελίδας Πελάτη: μικρή κεφαλίδα, οι γραμμές-απαντήσεις,
// οι καθημερινές ενέργειες (οι ίδιες της σημερινής σελίδας) και η «γραμμή χρόνου».
import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { initialsOf, Line, Lines } from "../b2-box";
import type { ClientPageCtx } from "../b2-context";
import { HeroActions } from "../b2-header";
import {
  factsOf,
  timelineOf,
  type TimeItem,
  type Timeline,
} from "./client-model";
import { withVariant, type Variant } from "./variants";

export interface ProtoClientProps {
  ctx: ClientPageCtx;
  variant: Variant;
  tab: string | undefined;
}

export const clientHref = (
  ctx: ClientPageCtx,
  variant: Variant,
  extra: Readonly<Record<string, string | undefined>> = {},
): string => withVariant(hrefOf("B2", { id: ctx.client.id }), variant, extra);

export const BackLink = ({ variant }: { variant: Variant }) => (
  <p className="pc-back">
    <Link href={withVariant(hrefOf("B1"), variant)}>← Πελάτες</Link>
  </p>
);

function ContactIcons({ ctx }: { ctx: ClientPageCtx }) {
  const { contactPhone, contactEmail } = ctx.client;
  if (!contactPhone && !contactEmail) return null;
  return (
    <span className="pc-icons">
      {contactPhone && (
        <a
          href={`tel:${contactPhone}`}
          aria-label={`Κλήση ${contactPhone}`}
          title={contactPhone}
        >
          ☎
        </a>
      )}
      {contactEmail && (
        <a
          href={`mailto:${contactEmail}`}
          aria-label={`Email ${contactEmail}`}
          title={contactEmail}
        >
          ✉
        </a>
      )}
    </span>
  );
}

// Όνομα, στάδιο, πακέτο, κλήση/email· τίποτα άλλο.
export function CompactHero({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <header className="pc-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(ctx.client.name)}
      </span>
      <div className="pc-hero-text">
        <h1>{ctx.client.name}</h1>
        <p>
          {ctx.isReadOnly ? (
            <Badge>Μόνο ανάγνωση</Badge>
          ) : (
            <Badge tone="strong">{ctx.d.stage}</Badge>
          )}{" "}
          <span>{ctx.d.activeAgreement ?? "χωρίς ενεργή Συμφωνία"}</span>
        </p>
      </div>
      <ContactIcons ctx={ctx} />
    </header>
  );
}

// Οι καθημερινές ενέργειες της σημερινής σελίδας (Ευκαιρία, Νέα Ευκαιρία, σημείωση, «⋯»).
export const DailyActions = ({ ctx }: { ctx: ClientPageCtx }) => (
  <div className="pc-actions">
    <HeroActions ctx={ctx} />
  </div>
);

export function NextLine({ ctx }: { ctx: ClientPageCtx }) {
  const next = ctx.d.next;
  if (next === null)
    return (
      <Line
        mark="→"
        tag="Επόμενο"
        title={
          ctx.d.filming
            ? `Γύρισμα ${ctx.d.filming.text}`
            : "Κανένα Επόμενο βήμα"
        }
        sub={
          ctx.d.filming
            ? undefined
            : "δεν υπάρχει ανοιχτή Ευκαιρία με ημερομηνία"
        }
        isFaded={!ctx.d.filming}
      />
    );
  return (
    <Line
      mark="→"
      tag={next.isLate ? "Πέρασε" : "Επόμενο"}
      isUrgent={next.isLate}
      title={`${next.step}, ${next.due}`}
      href={hrefOf("B4", { id: next.opportunityId })}
      sub={`Ευκαιρία «${next.title}» · ${next.owner}`}
    />
  );
}

export function MoneyLine({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.data.ledger === null) return null;
  const overdue = ctx.data.overdueInvoices ?? [];
  return (
    <Line
      mark="€"
      tag={overdue.length > 0 ? "Χρωστά" : "Χρήματα"}
      isUrgent={overdue.length > 0}
      title={ctx.d.money ?? "Τίποτα ανοιχτό"}
      sub={
        overdue.length > 0
          ? `${overdue.length} ληξιπρόθεσμα Τιμολόγια`
          : undefined
      }
      amount={fmtMoney(ctx.data.ledger.balance)}
    />
  );
}

export function AttentionLine(props: ProtoClientProps) {
  const line = props.ctx.d.attention;
  if (!line) return null;
  return (
    <Line
      mark="!"
      isUrgent
      tag="Προσοχή"
      title={line.text}
      quick={
        <Link href={clientHref(props.ctx, props.variant, { tab: line.tab })}>
          Λεπτομέρειες →
        </Link>
      }
    />
  );
}

// Τα «έγιναν»: οι τελευταίες Δραστηριότητες και κινήσεις Καρτέλας.
const doneOf = (ctx: ClientPageCtx): TimeItem[] => [
  ...(ctx.data.activities ?? []).slice(0, 3).map((row) => ({
    key: `a-${row.id}`,
    tag: row.when,
    title: `${row.kind}: ${row.text}`,
  })),
  ...ctx.data.ledgerEntries.slice(-2).map((entry, index) => ({
    key: `l-${index}`,
    tag: fmtDate(entry.date),
    title: `${entry.label} ${entry.debit > 0 ? `+${fmtMoney(entry.debit)}` : `−${fmtMoney(entry.credit)}`}`,
  })),
];

export const timelineOfCtx = (ctx: ClientPageCtx): Timeline =>
  timelineOf(factsOf(ctx), doneOf(ctx));

export function TimeLines(props: {
  items: readonly TimeItem[];
  empty: string;
}) {
  if (props.items.length === 0)
    return <p className="ml-empty">{props.empty}</p>;
  return (
    <Lines>
      {props.items.map((item) => (
        <Line
          key={item.key}
          mark="•"
          tag={item.tag}
          title={item.title}
          isUrgent={item.isUrgent}
        />
      ))}
    </Lines>
  );
}
