import { NO_MANAGER_LABEL } from "../labels";
import { Sub } from "./b2-box";
import { ClientContact } from "./b2-contact";
import type { ClientPageCtx } from "./b2-context";
import { ClientPlace } from "./b2-place";
import { ClientReminders } from "./b2-reminders";

// Το κουτί «Σύνοψη»: Στοιχεία, Συμφωνία, Υπενθυμίσεις και Σχέση με τον Πελάτη, ως ενότητες με δικό τους τίτλο.

const dash = (value: string): string => (value === "" ? "—" : value);

export const summaryHint = (ctx: ClientPageCtx): string =>
  [
    ctx.client.city,
    ctx.client.afm ? `ΑΦΜ ${ctx.client.afm}` : "",
    ctx.client.contactName,
  ]
    .filter((part) => part !== "")
    .join(" · ") || "Στοιχεία, Συμφωνία, υπενθυμίσεις και σχέση";

// Τα στοιχεία σε aside· το «Υπεύθυνος» μόνο για όποιον δεν βλέπει μόνο ανάγνωση (και με 2+ πωλητές όταν κρύβεται).
export function Details({
  ctx,
  hideOwner = false,
}: {
  ctx: ClientPageCtx;
  hideOwner?: boolean;
}) {
  const { client } = ctx;
  return (
    <Sub id="b2-details" title="Στοιχεία">
      <aside className="b2-details" aria-label="Στοιχεία">
        <dl className="ml-kv">
          <dt>Επωνυμία</dt>
          <dd>{dash(client.legalName)}</dd>
          <dt>Πόλη</dt>
          <dd>{dash(client.city)}</dd>
          <dt>ΑΦΜ</dt>
          <dd>
            <span className="num">{client.afm ?? "—"}</span>
          </dd>
          <dt>Κύριο πρόσωπο</dt>
          <dd>
            <span className="b2-contact">
              <ClientContact
                key={client.id}
                client={client}
                canEdit={ctx.canEdit}
              />
            </span>
          </dd>
          <dt>Διεύθυνση</dt>
          <dd>
            <span className="b2-contact">
              <ClientPlace
                key={client.id}
                client={client}
                canEdit={ctx.canEdit}
              />
            </span>
          </dd>
          {!ctx.isReadOnly && !hideOwner && (
            <>
              <dt>Υπεύθυνος</dt>
              <dd>{client.managerName ?? NO_MANAGER_LABEL}</dd>
            </>
          )}
        </dl>
      </aside>
    </Sub>
  );
}

function Agreement({ ctx }: { ctx: ClientPageCtx }) {
  if (!ctx.allowed.includes("agreements")) return null;
  const active = ctx.d.activeAgreement;
  return (
    <Sub title="Συμφωνία">
      <p className="b2-line">
        {active ? `Ενεργή: ${active}.` : "Καμία ενεργή Συμφωνία."}
        {ctx.d.agreementEnd && ` ${ctx.d.agreementEnd.text}.`}
      </p>
      {ctx.d.filming && (
        <p className="b2-filming">Επόμενο γύρισμα: {ctx.d.filming.text}</p>
      )}
    </Sub>
  );
}

function Reminders({ ctx }: { ctx: ClientPageCtx }) {
  const reminders = ctx.data.reminders;
  if (reminders === null) return null;
  return (
    <Sub title="Υπενθυμίσεις μου">
      <ClientReminders clientId={ctx.client.id} reminders={reminders} />
    </Sub>
  );
}

// Υποψήφιος → Πρόταση → Συμφωνία (→ Ανανέωση): το στάδιο αλλάζει μόνο του.
export function Relationship({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.isReadOnly) return null;
  return (
    <Sub title="Σχέση με τον Πελάτη">
      <ol className="b2-steps" aria-label="Σχέση με τον Πελάτη">
        {ctx.d.steps.map((step) => (
          <li
            key={step.label}
            data-state={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {step.label}
          </li>
        ))}
      </ol>
    </Sub>
  );
}

export function Summary({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <>
      <Details ctx={ctx} />
      <Agreement ctx={ctx} />
      <Reminders ctx={ctx} />
      <Relationship ctx={ctx} />
    </>
  );
}
