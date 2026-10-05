import Link from "next/link";

import type { Agreement } from "@/data/fictional-client";
import type { Opportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import { isForgotten, type SalesCaps } from "@/data/sales-access";
import { memberName, type SalesClient } from "@/data/sales";
import { Badge, fmtDate, fmtMoney, screenHref } from "@/screens/shared";

interface SectionProps {
  role: RoleId;
  client: SalesClient;
  caps: SalesCaps;
}

const agreementTotal = (agreement: Agreement): string => {
  const monthly = agreement.lines.reduce(
    (sum, line) => sum + (line.monthlyPrice ?? 0),
    0,
  );
  const total = agreement.lines.reduce(
    (sum, line) => sum + (line.totalPrice ?? 0),
    0,
  );
  return monthly > 0 ? `${fmtMoney(monthly)} / μήνα` : fmtMoney(total);
};

export function DetailsSection({ role, client, caps }: SectionProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Στοιχεία</h2>
        {caps.canManage && (
          <div className="btn-row">
            <button type="button" className="button">
              Επεξεργασία
            </button>
            {caps.canReassign && (
              <button type="button" className="button">
                Μεταβίβαση Υπεύθυνου
              </button>
            )}
          </div>
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

export function UsersSection({ client, caps }: SectionProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Χρήστες πελάτη</h2>
        {caps.canSeeClientUsers && (
          <button type="button" className="button">
            Πρόσκληση Χρήστη
          </button>
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

export function AgreementsSection({ client }: SectionProps) {
  if (client.agreements.length === 0) {
    return (
      <section className="card">
        <h2>Συμφωνίες και Περίοδοι</h2>
        <p className="muted">
          Καμία Συμφωνία ακόμα. Η πρώτη υπογεγραμμένη πρόταση θα εμφανιστεί εδώ.
        </p>
      </section>
    );
  }
  return (
    <>
      {client.agreements.map((agreement) => (
        <section key={agreement.title} className="card">
          <div className="card-title">
            <h2>{agreement.title}</h2>
            <span className="btn-row">
              <Badge>{agreement.kind}</Badge>
              <Badge
                tone={agreement.state === "πρόταση" ? "attention" : "strong"}
              >
                {agreement.proposalPath
                  ? `${agreement.state} · ${agreement.proposalPath}`
                  : agreement.state}
              </Badge>
            </span>
          </div>
          <p>{agreementTotal(agreement)}</p>
          <ul className="list">
            {agreement.lines.map((line) => (
              <li key={line.description}>{line.description}</li>
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
          {agreement.renewal && <p className="note">{agreement.renewal}</p>}
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

export function FinanceSection({ client }: SectionProps) {
  const { invoiced, collected, overdue, toInvoice } = client.finance;
  const items: readonly [string, number][] = [
    ["Τιμολογήθηκαν", invoiced],
    ["Εισπράχθηκαν", collected],
    ["Υπόλοιπο", invoiced - collected],
    ["Ληξιπρόθεσμα", overdue],
    ["Προς τιμολόγηση", toInvoice],
  ];
  return (
    <section className="card">
      <h2>Οικονομικά (σύνοψη)</h2>
      <dl className="dl">
        {items.map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{fmtMoney(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="note">
        Η πλήρης Καρτέλα Πελάτη (Τιμολόγια, Εισπράξεις) είναι η οθόνη I5.
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
