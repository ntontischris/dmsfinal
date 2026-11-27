// PROTOTYPE — throwaway. B: οι καρτέλες Συνεργασία (T6 + T2), Χρήματα (T3) και Στοιχεία (T6).
import Link from "next/link";
import { Suspense } from "react";

import { SpacesClientUsers } from "@/modules/access";
import { SpacesGdprClientSection } from "@/modules/gdpr";
import {
  STATE_LABELS as PRODUCTION_STATE_LABELS,
  listProductions,
  periodLabel,
} from "@/modules/productions";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice } from "@/spaces/screens/shared";

import { Box, BoxLinks, initialsOf, Line, Lines, Sub } from "../b2-box";
import { OverdueInvoices, ledgerHint, workHint } from "../b2-boxes";
import type { ClientPageCtx } from "../b2-context";
import { Details, Relationship } from "../b2-overview";
import { CLIENT_BOX_LABELS } from "../b2-page-model";
import { AgreementLines, OpportunityLines } from "../b2-sections";

type Production = Extract<
  Awaited<ReturnType<typeof listProductions>>,
  { ok: true }
>["data"][number];

const monthOf = (iso: string): string => iso.slice(0, 7);

const nextMonthOf = (today: string): string => {
  const [year, month] = today.split("-").map(Number);
  return month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`;
};

// Ο τρέχων και ο επόμενος μήνας (και οι ανοιχτές Εφάπαξ) πάνω· τα υπόλοιπα, νεότερα πρώτα, πίσω από «Όλες».
const isNear = (p: Production, today: string): boolean =>
  p.period === null
    ? p.state === "open"
    : [monthOf(today), nextMonthOf(today)].includes(monthOf(p.period.starts));

const byPeriodDesc = (a: Production, b: Production): number =>
  (b.period?.starts ?? "9999").localeCompare(a.period?.starts ?? "9999");

function ProductionRows({ rows }: { rows: readonly Production[] }) {
  return (
    <Lines label="Παραγωγές">
      {rows.map((p) => (
        <Line
          key={p.id}
          mark={initialsOf(p.title)}
          isFaded={p.state !== "open"}
          tag={
            <Badge tone={p.state === "open" ? "strong" : undefined}>
              {PRODUCTION_STATE_LABELS[p.state]}
            </Badge>
          }
          title={p.title}
          href={hrefOf("G2", { id: p.id })}
          sub={p.period ? `Περίοδος ${periodLabel(p.period.starts)}` : "Εφάπαξ"}
        />
      ))}
    </Lines>
  );
}

async function SortedProductions({ ctx }: { ctx: ClientPageCtx }) {
  const result = await listProductions({ state: null, internalOnly: false });
  if (!result.ok) return <ErrorNotice what="οι Παραγωγές του Πελάτη" />;
  const all = result.data
    .filter((p) => p.client?.id === ctx.client.id)
    .sort(byPeriodDesc);
  const near = all.filter((p) => isNear(p, ctx.today));
  const rest = all.filter((p) => !isNear(p, ctx.today));
  return (
    <>
      {all.length === 0 && <p className="muted">Καμία Παραγωγή ακόμα.</p>}
      {near.length > 0 && <ProductionRows rows={near} />}
      {rest.length > 0 && (
        <details className="pc-more-rows">
          <summary>Όλες ({all.length})</summary>
          <ProductionRows rows={rest} />
        </details>
      )}
      <BoxLinks>
        <Link href={hrefOf("G1", { client: ctx.client.id })}>
          Άνοιγμα στη λίστα Παραγωγών
        </Link>
      </BoxLinks>
    </>
  );
}

export function WorkTab({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <Box id="b2-work" title={CLIENT_BOX_LABELS.work} hint={workHint(ctx)} isOpen>
      <Relationship ctx={ctx} />
      <Sub id="b2-opportunities" title="Ευκαιρίες">
        <OpportunityLines
          rows={ctx.d.rows}
          empty="Καμία Ευκαιρία για αυτόν τον Πελάτη."
        />
      </Sub>
      {ctx.allowed.includes("agreements") && (
        <Sub id="b2-agreements" title="Συμφωνίες">
          <AgreementLines agreements={ctx.data.agreements ?? []} />
        </Sub>
      )}
      {ctx.allowed.includes("productions") && (
        <Sub id="b2-productions" title="Παραγωγές">
          <Suspense fallback={<p className="ml-empty">Φορτώνουν…</p>}>
            <SortedProductions ctx={ctx} />
          </Suspense>
        </Sub>
      )}
    </Box>
  );
}

// T3: μόνο η σύνοψη· οι κινήσεις ζουν στην Καρτέλα Πελάτη (I5).
export function LedgerTab({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <Box id="b2-ledger" title={CLIENT_BOX_LABELS.ledger} hint={ledgerHint(ctx)} isOpen>
      <p className="b2-line">{ctx.d.money ?? "Καμία κίνηση ακόμα."}</p>
      <OverdueInvoices ctx={ctx} />
      {ctx.data.ledgerFull && (
        <BoxLinks>
          <Link href={hrefOf("I5", { client: ctx.client.id })}>
            Όλες οι κινήσεις στην Καρτέλα Πελάτη
          </Link>
        </BoxLinks>
      )}
    </Box>
  );
}

// T6: τα Στοιχεία κρατούν μόνο στοιχεία, την πύλη (Χρήστες του Πελάτη) και το GDPR.
export function DetailsTab({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <Box id="b2-summary" title="Στοιχεία" hint="ΑΦΜ, διεύθυνση, πύλη" isOpen>
      <Details ctx={ctx} />
      {ctx.allowed.includes("users") && (
        <Sub title="Πύλη Πελάτη">
          <SpacesClientUsers
            clientId={ctx.client.id}
            clientName={ctx.client.name}
            viewer={ctx.viewer}
          />
        </Sub>
      )}
      {ctx.d.isOwner && <SpacesGdprClientSection clientId={ctx.client.id} />}
    </Box>
  );
}
