import Link from "next/link";

import { Inspector } from "@/spaces/kit/inspector";
import { Steps } from "@/spaces/kit/steps";

import { NO_MANAGER_LABEL } from "../labels";
import { Box, BoxLinks, Line, Lines, initialsOf } from "./b2-box";
import { clientTabHref } from "./b2-briefing";
import { ClientContact } from "./b2-contact";
import type { ClientPageCtx } from "./b2-context";
import { ClientPlace } from "./b2-place";
import { ClientReminders } from "./b2-reminders";
import { OpportunityLines } from "./b2-sections";

// Η «Επισκόπηση» ως κλειστά κουτιά: Ευκαιρίες, Συμφωνία, Υπενθυμίσεις, Δραστηριότητες, Στοιχεία και Σχέση. Ο τίτλος
// κάθε κουτιού φαίνεται και κλειστό· η υπόδειξη λέει τι έχει μέσα.

const dash = (value: string): string => (value === "" ? "—" : value);

const usersLabel = (ctx: ClientPageCtx): string => {
  if (!ctx.allowed.includes("users")) return "GDPR";
  return ctx.d.isOwner ? "Χρήστες Πελάτη & GDPR" : "Χρήστες Πελάτη";
};

const detailsHint = (ctx: ClientPageCtx): string =>
  [
    ctx.client.city,
    ctx.client.afm ? `ΑΦΜ ${ctx.client.afm}` : "",
    ctx.client.contactName,
  ]
    .filter((part) => part !== "")
    .join(" · ") || "Επωνυμία, ΑΦΜ, πρόσωπο και διεύθυνση";

function DetailsBox({ ctx }: { ctx: ClientPageCtx }) {
  const { client } = ctx;
  return (
    <Box title="Στοιχεία" hint={detailsHint(ctx)}>
      <Inspector
        title="Στοιχεία"
        fields={[
          { label: "Επωνυμία", value: dash(client.legalName) },
          { label: "Πόλη", value: dash(client.city) },
          {
            label: "ΑΦΜ",
            value: <span className="num">{client.afm ?? "—"}</span>,
          },
          {
            label: "Κύριο πρόσωπο",
            value: (
              <span className="b2-contact">
                <ClientContact
                  key={client.id}
                  client={client}
                  canEdit={ctx.canEdit}
                />
              </span>
            ),
          },
          {
            label: "Διεύθυνση",
            value: (
              <span className="b2-contact">
                <ClientPlace
                  key={client.id}
                  client={client}
                  canEdit={ctx.canEdit}
                />
              </span>
            ),
          },
          ...(ctx.isReadOnly
            ? []
            : [
                {
                  label: "Υπεύθυνος",
                  value: client.managerName ?? NO_MANAGER_LABEL,
                },
              ]),
        ]}
      />
      {ctx.tabs.includes("users") && (
        <BoxLinks>
          <Link href={clientTabHref(client.id, "users")}>
            {usersLabel(ctx)} →
          </Link>
        </BoxLinks>
      )}
    </Box>
  );
}

function OpportunitiesBox({ ctx }: { ctx: ClientPageCtx }) {
  const open = ctx.d.openRows;
  const forgotten = open.filter((row) => row.isForgotten).length;
  const hint =
    open.length === 0
      ? "Καμία ανοιχτή Ευκαιρία"
      : `${open.length} ανοιχτές${forgotten > 0 ? ` · ${forgotten} ξεχασμένες` : ""}`;
  return (
    <Box title="Ανοιχτές Ευκαιρίες" hint={hint}>
      <OpportunityLines
        rows={open.slice(0, 3)}
        empty="Καμία ανοιχτή Ευκαιρία."
      />
      <BoxLinks>
        <Link href={clientTabHref(ctx.client.id, "sales")}>όλες →</Link>
      </BoxLinks>
    </Box>
  );
}

function AgreementBox({ ctx }: { ctx: ClientPageCtx }) {
  if (!ctx.allowed.includes("agreements")) return null;
  const active = ctx.d.activeAgreement;
  const hint = [
    active ?? "Καμία ενεργή Συμφωνία",
    ctx.d.filming ? `γύρισμα ${ctx.d.filming.text}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
  return (
    <Box title="Συμφωνία" hint={hint}>
      <p className="b2-line">
        {active ? `Ενεργή: ${active}.` : "Καμία ενεργή Συμφωνία."}
        {ctx.d.agreementEnd && ` ${ctx.d.agreementEnd.text}.`}
      </p>
      {ctx.d.filming && (
        <p className="b2-filming">Επόμενο γύρισμα: {ctx.d.filming.text}</p>
      )}
    </Box>
  );
}

function RemindersBox({ ctx }: { ctx: ClientPageCtx }) {
  const reminders = ctx.data.reminders;
  if (reminders === null) return null;
  const hint =
    reminders.length === 0
      ? "Καμία · «Υπενθύμισέ με» για μια μέρα"
      : `${reminders.length} ανοιχτές`;
  return (
    <Box title="Υπενθυμίσεις μου" hint={hint}>
      <ClientReminders clientId={ctx.client.id} reminders={reminders} />
    </Box>
  );
}

function LatestBox({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.data.activities === null) return null;
  const latest = ctx.data.activities.slice(0, 3);
  const hint = latest[0]
    ? `Τελευταία: ${latest[0].when} · ${latest[0].kind}`
    : "Καμία ακόμα";
  return (
    <Box title="Τελευταίες Δραστηριότητες" hint={hint}>
      {latest.length === 0 ? (
        <p className="muted b2-line">Καμία Δραστηριότητα ακόμα.</p>
      ) : (
        <Lines label="Τελευταίες Δραστηριότητες">
          {latest.map((row) => (
            <Line
              key={row.id}
              mark={initialsOf(row.by)}
              tag={row.kind}
              title={row.text}
              sub={`${row.when} · ${row.kind} · ${row.by}`}
            />
          ))}
        </Lines>
      )}
      <BoxLinks>
        <Link href={clientTabHref(ctx.client.id, "comms")}>όλες →</Link>
      </BoxLinks>
    </Box>
  );
}

// Ο τίτλος φαίνεται (όχι μόνο aria-label), για να βρίσκεται η γραμμή στη σελίδα.
function RelationshipBox({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.isReadOnly) return null;
  return (
    <Box title="Σχέση με τον Πελάτη" hint={`Τώρα: ${ctx.d.stage}`}>
      <div className="b2-relationship">
        <Steps label="Σχέση με τον Πελάτη" steps={ctx.d.steps} />
      </div>
    </Box>
  );
}

export function Overview({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <div className="ml-stack">
      <OpportunitiesBox ctx={ctx} />
      <AgreementBox ctx={ctx} />
      <RemindersBox ctx={ctx} />
      <LatestBox ctx={ctx} />
      <DetailsBox ctx={ctx} />
      <RelationshipBox ctx={ctx} />
    </div>
  );
}
