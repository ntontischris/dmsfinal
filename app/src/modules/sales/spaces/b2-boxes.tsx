import Link from "next/link";
import { Suspense } from "react";

import { SpacesClientUsers } from "@/modules/access";
import { SpacesGdprClientSection } from "@/modules/gdpr";
import { SpacesClientSends, sendsCaps } from "@/modules/notifications";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { ActivityLog } from "./b2-activity-log";
import { Box, BoxLinks, Line, Lines, Sub } from "./b2-box";
import type { ClientPageCtx } from "./b2-context";
import { Summary, summaryHint } from "./b2-overview";
import { CLIENT_BOX_LABELS, type ClientBox } from "./b2-page-model";
import { AgreementLines, ChatLink, OpportunityLines } from "./b2-sections";
import { ProductionsSection } from "./b2-productions";

// Η Σελίδα Πελάτη κάτω από την κεφαλίδα: πέντε κλειστά κουτιά (Σύνοψη, Άνθρωποι, Δουλειές, Επικοινωνία, Καρτέλα).
// Το ?tab= (παλιές καρτέλες και ονόματα κουτιών) ανοίγει το δικό του κουτί.

interface BoxProps {
  ctx: ClientPageCtx;
  isOpen: boolean;
}

const peopleHint = (ctx: ClientPageCtx): string => {
  if (!ctx.allowed.includes("users")) return "GDPR του Πελάτη";
  return ctx.d.isOwner
    ? "Χρήστες του Πελάτη, προσκλήσεις και GDPR"
    : "Χρήστες του Πελάτη και προσκλήσεις";
};

function PeopleBox({ ctx, isOpen }: BoxProps) {
  return (
    <Box
      id="b2-people"
      title={CLIENT_BOX_LABELS.people}
      hint={peopleHint(ctx)}
      isOpen={isOpen}
    >
      {ctx.allowed.includes("users") && (
        <SpacesClientUsers
          clientId={ctx.client.id}
          clientName={ctx.client.name}
          viewer={ctx.viewer}
        />
      )}
      {ctx.d.isOwner && <SpacesGdprClientSection clientId={ctx.client.id} />}
    </Box>
  );
}

const forgottenText = (ctx: ClientPageCtx): string | null => {
  const count = ctx.d.openRows.filter((row) => row.isForgotten).length;
  if (count === 0) return null;
  return count === 1 ? "1 ξεχασμένη" : `${count} ξεχασμένες`;
};

const workHint = (ctx: ClientPageCtx): string =>
  [
    `${ctx.d.openRows.length} ανοιχτές Ευκαιρίες`,
    forgottenText(ctx),
    ctx.allowed.includes("agreements")
      ? (ctx.d.activeAgreement ?? "καμία ενεργή Συμφωνία")
      : null,
    ctx.allowed.includes("productions") ? "Παραγωγές" : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

// Ευκαιρίες, Συμφωνίες και Παραγωγές του Πελάτη. Οι Παραγωγές φορτώνουν μόνο όταν το κουτί ανοίγει από το ?tab=· αλλιώς σύνδεσμος.
function WorkBox({ ctx, isOpen }: BoxProps) {
  const agreements = ctx.data.agreements ?? [];
  return (
    <Box
      id="b2-work"
      title={CLIENT_BOX_LABELS.work}
      hint={workHint(ctx)}
      isOpen={isOpen}
    >
      {/* «Νέα Ευκαιρία» είναι στην κεφαλίδα της σελίδας. */}
      <Sub id="b2-opportunities" title="Ευκαιρίες">
        <OpportunityLines
          rows={ctx.d.rows}
          empty="Καμία Ευκαιρία για αυτόν τον Πελάτη."
        />
        <BoxLinks>
          <Link href={hrefOf("B3")}>Όλο το Pipeline</Link>
        </BoxLinks>
      </Sub>
      {ctx.allowed.includes("agreements") && (
        <Sub id="b2-agreements" title="Συμφωνίες">
          <AgreementLines agreements={agreements} />
          <BoxLinks>
            <Link href={hrefOf("D1")}>Όλες οι Συμφωνίες</Link>
          </BoxLinks>
        </Sub>
      )}
      {ctx.allowed.includes("productions") && (
        <Sub id="b2-productions" title="Παραγωγές">
          {isOpen ? (
            <Suspense fallback={<p className="ml-empty">Φορτώνουν…</p>}>
              <ProductionsSection clientId={ctx.client.id} />
            </Suspense>
          ) : (
            <BoxLinks>
              <Link
                href={hrefOf("B2", { id: ctx.client.id, tab: "productions" })}
              >
                Δες τις Παραγωγές
              </Link>
            </BoxLinks>
          )}
        </Sub>
      )}
    </Box>
  );
}

function Activities({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.data.activities === null)
    return <ErrorNotice what="οι Δραστηριότητες" />;
  return (
    <>
      <p className="muted">
        Η Δραστηριότητα γράφεται στον Πελάτη ή σε μία από τις ανοιχτές Ευκαιρίες
        του. Διορθώνεται ή σβήνεται μέσα σε 24 ώρες.
      </p>
      <ActivityLog
        clientId={ctx.client.id}
        rows={ctx.data.activities}
        canLog={ctx.canEdit}
        kinds={ctx.data.lists?.activityKinds ?? []}
        openOpportunities={ctx.d.logOpportunities}
        isLines
      />
    </>
  );
}

const commsHint = (ctx: ClientPageCtx): string => {
  const rows = ctx.data.activities;
  if (rows === null || !ctx.allowed.includes("activities"))
    return "Συνομιλία και ό,τι στάλθηκε";
  if (rows.length === 0) return "Καμία Δραστηριότητα ακόμα";
  return `${rows.length} Δραστηριότητες · τελευταία ${rows[0]?.when ?? ""}`;
};

// Συνομιλία, Τι στάλθηκε και Δραστηριότητες.
function CommsBox({ ctx, isOpen }: BoxProps) {
  const has = (tab: "chat" | "activities" | "dispatches") =>
    ctx.allowed.includes(tab);
  return (
    <Box
      id="b2-comms"
      title={CLIENT_BOX_LABELS.comms}
      hint={commsHint(ctx)}
      isOpen={isOpen}
    >
      {has("chat") && (
        <Sub id="b2-chat" title="Συνομιλία">
          <ChatLink clientId={ctx.client.id} />
        </Sub>
      )}
      {has("dispatches") && (
        <Sub id="b2-sent" title="Τι στάλθηκε">
          <SpacesClientSends
            clientId={ctx.client.id}
            hasHistoryLink={sendsCaps(ctx.viewer).canView}
            filter={ctx.sendsFilter}
          />
        </Sub>
      )}
      {has("activities") && (
        <Sub id="b2-log" title="Δραστηριότητες">
          <Activities ctx={ctx} />
        </Sub>
      )}
    </Box>
  );
}

// Τα ληξιπρόθεσμα μπαίνουν πρώτα, ως γραμμές με την κόκκινη τελεία.
function OverdueInvoices({ ctx }: { ctx: ClientPageCtx }) {
  const items = ctx.data.overdueInvoices ?? [];
  if (items.length === 0) return null;
  return (
    <Lines label="Ληξιπρόθεσμα Τιμολόγια">
      {items.map((item) => (
        <Line
          key={item.id}
          mark="!"
          isUrgent
          tag="Ληξιπρόθεσμο"
          title={`Τιμολόγιο ${item.number}`}
          sub={item.dueDate ? `έληγε ${fmtDate(item.dueDate)}` : undefined}
          amount={fmtMoney(item.remaining)}
        />
      ))}
    </Lines>
  );
}

const ledgerHint = (ctx: ClientPageCtx): string =>
  ctx.d.money ??
  (ctx.data.ledgerEntries.length === 0
    ? "Καμία κίνηση ακόμα"
    : `υπόλοιπο ${fmtMoney(ctx.data.ledger?.balance ?? 0)}`);

// Η Καρτέλα Πελάτη μέσα στη σελίδα, με σύνδεσμο στην πλήρη.
function LedgerBox({ ctx, isOpen }: BoxProps) {
  const entries = ctx.data.ledgerEntries;
  return (
    <Box
      id="b2-ledger"
      title={CLIENT_BOX_LABELS.ledger}
      hint={ledgerHint(ctx)}
      isOpen={isOpen}
    >
      <OverdueInvoices ctx={ctx} />
      {entries.length === 0 ? (
        <p className="ml-empty">Καμία κίνηση ακόμα.</p>
      ) : (
        <Lines label="Κινήσεις">
          {entries.map((entry, index) => (
            <Line
              key={`${entry.date}-${index}`}
              mark={entry.debit > 0 ? "+" : "−"}
              tag={fmtDate(entry.date)}
              title={entry.label}
              amount={
                <>
                  {entry.debit > 0
                    ? `+${fmtMoney(entry.debit)}`
                    : `−${fmtMoney(entry.credit)}`}
                  <small>υπόλοιπο {fmtMoney(entry.running)}</small>
                </>
              }
            />
          ))}
        </Lines>
      )}
      {ctx.data.ledgerFull && (
        <BoxLinks>
          <Link href={hrefOf("I5", { client: ctx.client.id })}>
            Άνοιγμα της Καρτέλας Πελάτη
          </Link>
        </BoxLinks>
      )}
    </Box>
  );
}

export function ClientBoxes({
  ctx,
  open,
}: {
  ctx: ClientPageCtx;
  open: ClientBox | null;
}) {
  const has = (box: ClientBox) => ctx.boxes.includes(box);
  return (
    <div className="ml-stack">
      <Box
        id="b2-summary"
        title={CLIENT_BOX_LABELS.summary}
        hint={summaryHint(ctx)}
        isOpen={open === "summary"}
      >
        <Summary ctx={ctx} />
      </Box>
      {has("people") && <PeopleBox ctx={ctx} isOpen={open === "people"} />}
      <WorkBox ctx={ctx} isOpen={open === "work"} />
      {has("comms") && <CommsBox ctx={ctx} isOpen={open === "comms"} />}
      {has("ledger") && <LedgerBox ctx={ctx} isOpen={open === "ledger"} />}
    </div>
  );
}
