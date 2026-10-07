import Link from "next/link";

import {
  agreementTotal,
  agreementsOfClient,
  statusLabel,
  type AgreementRecord,
} from "@/data/agreements";
import { balanceOf, ledgerOf, overdueOf, toInvoiceOf } from "@/data/finance-access";
import { conversationsOf, productionsOfClient } from "@/data/messages-access";
import { clientSendsOf } from "@/data/notifications-access";
import type { Opportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import { stateOf } from "@/data/productions-access";
import { isForgotten, type SalesCaps } from "@/data/sales-access";
import { memberName, type SalesClient } from "@/data/sales";
import { SCREENS } from "@/data/screens";
import { Badge, fmtDate, fmtMoney, screenHref } from "@/screens/shared";

interface SectionProps {
  role: RoleId;
  client: SalesClient;
  caps: SalesCaps;
}

const priceText = (agreement: AgreementRecord): string =>
  agreement.kind === "μηνιαία"
    ? `${fmtMoney(agreementTotal(agreement))} / μήνα`
    : fmtMoney(agreementTotal(agreement));

const hasScreen = (role: RoleId, code: string): boolean =>
  SCREENS.some((screen) => screen.code === code && role in screen.access);

export function DetailsSection({ role, client, caps }: SectionProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Στοιχεία</h2>
        {caps.canManage && (
          <button type="button" className="button">
            Επεξεργασία
          </button>
        )}
      </div>
      <dl className="dl">
        <dt>Επωνυμία</dt>
        <dd>{client.legalName}</dd>
        <dt>Πόλη</dt>
        <dd>{client.city}</dd>
        <dt>ΑΦΜ</dt>
        <dd>{client.vat}</dd>
        <dt>Κύριο πρόσωπο</dt>
        <dd>
          {client.contact.name}, {client.contact.email}, {client.contact.phone}
        </dd>
        {!caps.isReadOnly && (
          <>
            <dt>Υπεύθυνος</dt>
            <dd>{memberName(client.ownerId)}</dd>
          </>
        )}
      </dl>
      {client.possibleDuplicateOf && caps.canMerge && (
        <p className="note">
          Σήμα «Πιθανό διπλό»: {client.possibleDuplicateOf.reason}{" "}
          <Link href={screenHref("owner", "B6", {})}>
            Άνοιγμα στη Συγχώνευση
          </Link>
        </p>
      )}
    </section>
  );
}

export function UsersSection({ role, client, caps }: SectionProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Χρήστες πελάτη</h2>
        {caps.canSeeClientUsers && hasScreen(role, "N2") && (
          <Link
            className="button"
            href={screenHref(role, "N2", { client: client.id })}
          >
            Πρόσκληση Χρήστη
          </Link>
        )}
      </div>
      {client.users.length === 0 ? (
        <p className="muted">
          Ο Πελάτης δεν έχει Χρήστες ακόμα. Ο Υπογράφων προσκαλείται αυτόματα
          όταν υπογράψει την πρώτη Συμφωνία.
        </p>
      ) : (
        <ul className="list">
          {client.users.map((user) => (
            <li key={user.email} className="row">
              <span>
                {user.name} <span className="muted">{user.email}</span>
              </span>
              <span>
                {user.role}{" "}
                {user.isSignatory && <Badge tone="strong">Υπογράφων</Badge>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AgreementsSection({
  role,
  client,
  agreements,
  showAmounts,
}: SectionProps & {
  agreements: readonly AgreementRecord[];
  showAmounts: boolean;
}) {
  if (agreements.length === 0) {
    return (
      <section className="card">
        <h2>Συμφωνίες</h2>
        <p className="muted">
          Καμία Συμφωνία ακόμα. Η πρώτη υπογεγραμμένη πρόταση θα εμφανιστεί εδώ.
        </p>
      </section>
    );
  }
  return (
    <>
      {agreements.map((agreement) => (
        <section key={agreement.id} className="card">
          <div className="card-title">
            <h2>
              {hasScreen(role, "D2") ? (
                <Link href={screenHref(role, "D2", { id: agreement.id })}>
                  {agreement.title}
                </Link>
              ) : (
                agreement.title
              )}
            </h2>
            <span className="btn-row">
              <Badge>{agreement.kind}</Badge>
              <Badge
                tone={agreement.state === "πρόταση" ? "attention" : "strong"}
              >
                {statusLabel(agreement)}
              </Badge>
            </span>
          </div>
          {showAmounts ? (
            <p>{priceText(agreement)}</p>
          ) : (
            <p className="muted">Ποσά: μόνο στις δικές σου Συμφωνίες.</p>
          )}
          <ul className="list">
            {agreement.lines.map((line) => (
              <li key={line.id}>{line.description}</li>
            ))}
          </ul>
          {agreement.periods.length > 0 && (
            <div className="scroll">
              <table className="rtable">
                <thead>
                  <tr>
                    <th>Περίοδος</th>
                    <th>Από</th>
                    <th>Έως</th>
                    <th>Κατάσταση</th>
                  </tr>
                </thead>
                <tbody>
                  {agreement.periods.map((period) => (
                    <tr key={period.label}>
                      <td data-label="Περίοδος">{period.label}</td>
                      <td data-label="Από">{fmtDate(period.starts)}</td>
                      <td data-label="Έως">{fmtDate(period.ends)}</td>
                      <td data-label="Κατάσταση">{period.state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {agreement.state === "ενεργή" && agreement.end && (
            <p className="note">
              Λήγει {fmtDate(agreement.end)}
              {agreement.terms.renewal ? ` · Ανανέωση: ${agreement.terms.renewal}` : ""}.
            </p>
          )}
        </section>
      ))}
    </>
  );
}

interface OpportunitiesSectionProps extends SectionProps {
  opportunities: readonly Opportunity[];
}

export function OpportunitiesSection({
  role,
  client,
  caps,
  opportunities,
}: OpportunitiesSectionProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Ευκαιρίες</h2>
        {caps.canManage && (
          <button type="button" className="button">
            Νέα Ευκαιρία
          </button>
        )}
      </div>
      {opportunities.length === 0 ? (
        <p className="muted">Καμία Ευκαιρία για αυτόν τον Πελάτη.</p>
      ) : (
        <ul className="list">
          {opportunities.map((opportunity) => (
            <li key={opportunity.id} className="row">
              <Link href={screenHref(role, "B4", { id: opportunity.id })}>
                {opportunity.title}
              </Link>
              <span className="btn-row">
                <Badge>
                  {opportunity.outcome === "Ανοιχτή"
                    ? opportunity.stage
                    : opportunity.outcome}
                </Badge>
                <span className="muted">{memberName(opportunity.ownerId)}</span>
                {opportunity.ownerId !== client.ownerId && (
                  <Badge>με πρόσβαση</Badge>
                )}
                {isForgotten(opportunity) && (
                  <Badge tone="attention">Ξεχασμένη</Badge>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Μόνο ό,τι πήγε στους Χρήστες του Πελάτη· οι Ειδοποιήσεις της ομάδας ζουν μόνο στην K3.
const dispatchSummary = (clientId: string): string => {
  const sends = clientSendsOf(clientId);
  if (sends.length === 0) return "Καμία αποστολή προς τους Χρήστες του Πελάτη ακόμα.";
  const failed = sends.filter((s) => s.state === "απέτυχε").length;
  const lines = sends
    .slice(0, 3)
    .map((s) => `${fmtDate(s.at.slice(0, 10))} ${s.title} (${s.state})`)
    .join(" · ");
  return `${sends.length} αποστολές προς τους Χρήστες του Πελάτη${failed ? `, ${failed} απέτυχαν` : ""}. Τελευταίες: ${lines}.`;
};

interface CrossModuleProps extends SectionProps {
  tab: "productions" | "chat" | "dispatches" | "ledger";
  isNew: boolean;
}

const productionsSummary = (clientId: string): string => {
  const productions = productionsOfClient(clientId);
  if (productions.length === 0) return "Καμία Παραγωγή ακόμα.";
  const open = productions.filter((p) => stateOf(p) === "ανοιχτή").length;
  const delivered = productions.filter((p) => stateOf(p) === "παραδομένη").length;
  return `${productions.length} Παραγωγές: ${open} σε εξέλιξη, ${delivered} παραδομένες.`;
};

const chatSummary = (role: RoleId, clientId: string): string => {
  const row = conversationsOf(role).find((item) => item.client.id === clientId);
  if (!row?.last) return "Καμία Συνομιλία ακόμα με τον Πελάτη.";
  return `Μία Συνομιλία με τον Πελάτη, ${row.unread} αδιάβαστα μηνύματα, τελευταίο ${fmtDate(row.last.at.slice(0, 10))}.`;
};

// Ενότητες που ανήκουν σε άλλα modules: σύνοψη από τα δεδομένα τους και σύνδεσμος στην οθόνη τους.
export function CrossModuleSection({ tab, role, client, isNew }: CrossModuleProps) {
  const balance = balanceOf(client.id);
  const content = {
    productions: {
      title: "Παραγωγές",
      summary: productionsSummary(client.id),
      code: "G1",
      link: "Άνοιγμα στη λίστα Παραγωγών",
    },
    chat: {
      title: "Συνομιλία",
      summary: chatSummary(role, client.id),
      code: "J2",
      link: "Άνοιγμα της Συνομιλίας",
    },
    dispatches: {
      title: "Ιστορικό αποστολών",
      summary: dispatchSummary(client.id),
      code: "K3",
      link: "Άνοιγμα στο Ιστορικό αποστολών",
    },
    ledger: {
      title: "Καρτέλα Πελάτη",
      summary:
        isNew || ledgerOf(client.id).length === 0
          ? "Καμία κίνηση ακόμα."
          : `Υπόλοιπο ${fmtMoney(balance)}, ληξιπρόθεσμα ${fmtMoney(overdueOf(client.id))}, προς τιμολόγηση ${fmtMoney(toInvoiceOf(client.id))}.`,
      code: "I5",
      link: "Άνοιγμα της Καρτέλας Πελάτη",
    },
  }[tab];
  return (
    <section className="card">
      <h2>{content.title}</h2>
      <p>{content.summary}</p>
      <p>
        {hasScreen(role, content.code) ? (
          <Link
            href={screenHref(role, content.code, { client: client.id })}
          >
            {content.link}
          </Link>
        ) : (
          <span className="muted">Η οθόνη {content.code} δεν είναι διαθέσιμη στον ρόλο σου.</span>
        )}{" "}
        <span className="muted">(οθόνη {content.code}, άλλο module)</span>
      </p>
    </section>
  );
}

export function ActivitiesSection({ client }: SectionProps) {
  return (
    <section className="card">
      <h2>Δραστηριότητες</h2>
      {client.activities.length === 0 ? (
        <p className="muted">Καμία Δραστηριότητα ακόμα.</p>
      ) : (
        <ul className="list">
          {client.activities.map((activity) => (
            <li key={`${activity.when}-${activity.text}`}>
              <span className="muted">
                {fmtDate(activity.when)} · {activity.kind} · {activity.by}
              </span>
              <br />
              {activity.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
