import Link from "next/link";

import { Inspector } from "@/spaces/kit/inspector";
import { fmtMoney } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import { BriefPanel, clientTabHref } from "./b2-briefing";
import { ClientContact } from "./b2-contact";
import type { ClientPageCtx } from "./b2-context";
import { ClientPlace } from "./b2-place";

// Η πλαϊνή στήλη: «Στοιχεία» (με εικονίδιο αλλαγής αντί για μεγάλο κουμπί), «Σε αριθμούς» και «Χρήστες Πελάτη».

const dash = (value: string): string => (value === "" ? "—" : value);

const usersLabel = (ctx: ClientPageCtx): string => {
  if (!ctx.allowed.includes("users")) return "GDPR";
  return ctx.d.isOwner ? "Χρήστες Πελάτη & GDPR" : "Χρήστες Πελάτη";
};

function Facts({ ctx }: { ctx: ClientPageCtx }) {
  const { data } = ctx;
  const openCount = data.opportunities.filter(
    (o) => o.outcome === "open",
  ).length;
  return (
    <BriefPanel part="facts" label="Σε αριθμούς">
      <dl className="b2-facts">
        {!ctx.isReadOnly && (
          <>
            <dt>Ανοιχτές Ευκαιρίες</dt>
            <dd className="b2-num">{openCount}</dd>
          </>
        )}
        {data.agreements !== null && (
          <>
            <dt>Συμφωνίες</dt>
            <dd className="b2-num">{data.agreements.length}</dd>
          </>
        )}
        {data.ledger !== null && (
          <>
            <dt>Υπόλοιπο</dt>
            <dd className="b2-num">{fmtMoney(data.ledger.balance)}</dd>
          </>
        )}
      </dl>
    </BriefPanel>
  );
}

export function ClientSide({ ctx }: { ctx: ClientPageCtx }) {
  const { client } = ctx;
  return (
    <div className="b2-side">
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
      <Facts ctx={ctx} />
      {ctx.tabs.includes("users") && (
        <p>
          <Link href={clientTabHref(client.id, "users")}>
            {usersLabel(ctx)} →
          </Link>
        </p>
      )}
    </div>
  );
}
