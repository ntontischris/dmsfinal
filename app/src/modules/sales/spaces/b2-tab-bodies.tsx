import Link from "next/link";

import { SpacesClientUsers } from "@/modules/access";
import { SpacesGdprClientSection } from "@/modules/gdpr";
import { SpacesClientSends, sendsCaps } from "@/modules/notifications";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { ActivityLog } from "./b2-activity-log";
import { Box, BoxLinks, Line, Lines } from "./b2-box";
import type { ClientPageCtx } from "./b2-context";
import { Overview } from "./b2-overview";
import type { ClientTab } from "./b2-page-model";
import { AgreementLines, ChatLink, OpportunityLines } from "./b2-sections";
import { ProductionsTab } from "./b2-tabs";

// Τα σώματα των πέντε καρτελών (και της όψης «Χρήστες Πελάτη»), ως κλειστά κουτιά. Η παλιά διεύθυνση (?tab=activities,
// ?tab=dispatches, ?tab=opportunities…) ανοίγει το δικό της κουτί μέσα στην ενωμένη καρτέλα.

interface BodyProps {
  ctx: ClientPageCtx;
  // Η τιμή του ?tab= όπως ήρθε.
  focus: string | undefined;
}

function Sales({ ctx, focus }: BodyProps) {
  const agreements = ctx.data.agreements ?? [];
  return (
    <div className="ml-stack">
      {/* «Νέα Ευκαιρία» είναι στην κεφαλίδα της σελίδας. */}
      <Box
        title="Ευκαιρίες"
        hint={`${ctx.d.rows.length} Ευκαιρίες · ${ctx.d.openRows.length} ανοιχτές`}
        isOpen={focus === "opportunities"}
      >
        <OpportunityLines
          rows={ctx.d.rows}
          empty="Καμία Ευκαιρία για αυτόν τον Πελάτη."
        />
      </Box>
      {ctx.allowed.includes("agreements") && (
        <Box
          title="Συμφωνίες"
          hint={
            agreements.length === 0
              ? "Καμία ακόμα"
              : `${agreements.length} Συμφωνίες · ${ctx.d.activeAgreement ?? "καμία ενεργή"}`
          }
          isOpen={focus === "agreements"}
        >
          <AgreementLines agreements={agreements} />
        </Box>
      )}
    </div>
  );
}

// Τα ληξιπρόθεσμα είναι προειδοποίηση: φαίνονται πάντα, όχι σε κουτί.
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

// Η Καρτέλα Πελάτη μέσα στη σελίδα, με σύνδεσμο στην πλήρη.
function Finance({ ctx, focus }: BodyProps) {
  const entries = ctx.data.ledgerEntries;
  return (
    <div className="ml-stack">
      {ctx.d.money && <p className="b2-tab-lead">{ctx.d.money}</p>}
      <OverdueInvoices ctx={ctx} />
      <Box
        title="Καρτέλα Πελάτη"
        hint={
          entries.length === 0
            ? "Καμία κίνηση ακόμα"
            : `${entries.length} κινήσεις · υπόλοιπο ${fmtMoney(ctx.data.ledger?.balance ?? 0)}`
        }
        isOpen={focus === "ledger"}
      >
        {entries.length === 0 ? (
          <p className="muted b2-line">Καμία κίνηση ακόμα.</p>
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
    </div>
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

const activitiesHint = (ctx: ClientPageCtx): string => {
  const rows = ctx.data.activities;
  if (rows === null) return "Δεν φόρτωσαν";
  if (rows.length === 0) return "Καμία ακόμα · γράψε κλήση, email ή σημείωση";
  return `${rows.length} · τελευταία ${rows[0]?.when ?? ""}`;
};

// Συνομιλία, Δραστηριότητες και «Τι στάλθηκε», ένα κουτί η καθεμία.
function Comms({ ctx, focus }: BodyProps) {
  const has = (tab: "chat" | "activities" | "dispatches") =>
    ctx.allowed.includes(tab);
  return (
    <div className="ml-stack">
      {has("chat") && (
        <Box
          id="b2-chat"
          title="Συνομιλία"
          hint="Τα μηνύματα με τους Χρήστες του Πελάτη"
          isOpen={focus === "chat"}
        >
          <ChatLink clientId={ctx.client.id} />
        </Box>
      )}
      {has("activities") && (
        <Box
          id="b2-log"
          title="Δραστηριότητες"
          hint={activitiesHint(ctx)}
          isOpen={focus === "activities"}
        >
          <Activities ctx={ctx} />
        </Box>
      )}
      {has("dispatches") && (
        <Box
          id="b2-sent"
          title="Τι στάλθηκε"
          hint="Email και ειδοποιήσεις προς τον Πελάτη, με φίλτρα"
          isOpen={focus === "dispatches"}
        >
          <SpacesClientSends
            clientId={ctx.client.id}
            hasHistoryLink={sendsCaps(ctx.viewer).canView}
            filter={ctx.sendsFilter}
          />
        </Box>
      )}
    </div>
  );
}

// Οι φόρμες των Χρηστών και του GDPR μένουν ανοιχτές (είναι η μόνη δουλειά της όψης).
function Users({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <div className="ml-stack">
      {ctx.allowed.includes("users") && (
        <SpacesClientUsers
          clientId={ctx.client.id}
          clientName={ctx.client.name}
          viewer={ctx.viewer}
        />
      )}
      {ctx.d.isOwner && <SpacesGdprClientSection clientId={ctx.client.id} />}
    </div>
  );
}

export function ClientTabBody({
  ctx,
  tab,
  focus,
}: BodyProps & { tab: ClientTab }) {
  if (tab === "sales") return <Sales ctx={ctx} focus={focus} />;
  if (tab === "productions") return <ProductionsTab clientId={ctx.client.id} />;
  if (tab === "finance") return <Finance ctx={ctx} focus={focus} />;
  if (tab === "comms") return <Comms ctx={ctx} focus={focus} />;
  if (tab === "users") return <Users ctx={ctx} />;
  return <Overview ctx={ctx} />;
}
