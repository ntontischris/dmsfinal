import Link from "next/link";

import { initialsOf } from "@/spaces/shell/avatar";
import { GroupBand, ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";

import { deleteSubscription, saveSubscription } from "../actions";
import type { Subscription, SubscriptionsView } from "../schemas";
import { n5SubRowOf, n5TotalsOf } from "./n5-adapter";
import { N5Form } from "./n5-forms";

// Μητρώο συνδρομών (prototype `screens/n5-subscriptions.tsx`): «Επεξεργασία» / «Νέα συνδρομή» (`?sub=`), σύνολα ανά
// νόμισμα από τη βάση. Αποθήκευση και διαγραφή με τα πραγματικά actions.

const PAGE = "/app/settings/integrations";
const n5Href = (sub?: string): string =>
  sub ? `${PAGE}?sub=${encodeURIComponent(sub)}#subscriptions` : PAGE;

interface Field {
  id: keyof Subscription;
  label: string;
  value: string;
  type?: string;
  inputMode?: "decimal";
}

const fieldsOf = (sub: Subscription | null): readonly Field[] => [
  { id: "provider", label: "Πάροχος", value: sub?.provider ?? "" },
  { id: "covers", label: "Τι", value: sub?.covers ?? "" },
  { id: "plan", label: "Πλάνο", value: sub?.plan ?? "" },
  {
    id: "monthlyCost",
    label: "Μηνιαίο κόστος",
    value: sub ? String(sub.monthlyCost).replace(".", ",") : "",
    inputMode: "decimal",
  },
  {
    id: "renewsOn",
    label: "Ανανέωση",
    value: sub?.renewsOn ?? "",
    type: "date",
  },
  { id: "account", label: "Λογαριασμός", value: sub?.account ?? "" },
  { id: "paidBy", label: "Ποιος πληρώνει", value: sub?.paidBy ?? "" },
  {
    id: "link",
    label: "Σύνδεσμος στον πάροχο",
    value: sub?.link ?? "",
    type: "url",
  },
];

function SubscriptionForm({ sub }: { sub: Subscription | null }) {
  return (
    <div className="n5-form">
      <Panel label={sub ? `Επεξεργασία: ${sub.provider}` : "Νέα συνδρομή"}>
        <N5Form
          action={saveSubscription}
          submitLabel="Αποθήκευση"
          pendingLabel="Αποθήκευση…"
          isPrimary
          resetOnSuccess={!sub}
          after={
            <Link className="button" href={n5Href()}>
              Άκυρο
            </Link>
          }
        >
          {sub && <input type="hidden" name="id" value={sub.id} />}
          <div className="stack">
            {fieldsOf(sub).map((field) => (
              <span key={field.id} className="stack n5-field">
                <label htmlFor={`n5-sub-${field.id}`}>{field.label}</label>
                <input
                  id={`n5-sub-${field.id}`}
                  name={field.id}
                  className="input"
                  type={field.type}
                  inputMode={field.inputMode}
                  defaultValue={field.value}
                />
              </span>
            ))}
            <label htmlFor="n5-sub-currency">Νόμισμα</label>
            <input
              id="n5-sub-currency"
              name="currency"
              className="input"
              list="n5-sub-currencies"
              maxLength={3}
              defaultValue={sub?.currency ?? "EUR"}
            />
            <datalist id="n5-sub-currencies">
              <option value="EUR" />
              <option value="USD" />
              <option value="GBP" />
            </datalist>
          </div>
          <p className="note">
            Εδώ μόνο καταγράφεται· το πλάνο το αλλάζεις στον πάροχο.
          </p>
        </N5Form>
        {sub && (
          <N5Form
            action={deleteSubscription}
            submitLabel="Διαγραφή συνδρομής"
            isDanger
          >
            <input type="hidden" name="id" value={sub.id} />
          </N5Form>
        )}
      </Panel>
    </div>
  );
}

function SubscriptionRow({ sub }: { sub: Subscription }) {
  const row = n5SubRowOf(sub);
  return (
    <ListRow
      lead={
        <span className="part-tile" aria-hidden="true">
          {initialsOf(row.provider)}
        </span>
      }
      title={row.provider}
      sub={row.sub}
      aside={
        <>
          <strong className="n5-amount">{row.amount}</strong>
          {row.link && (
            <a href={row.link} target="_blank" rel="noreferrer">
              Άνοιγμα
            </a>
          )}
          <Link
            href={n5Href(row.id)}
            aria-label={`Επεξεργασία: ${row.provider}`}
          >
            Επεξεργασία
          </Link>
        </>
      }
    />
  );
}

interface SubscriptionsProps {
  view: SubscriptionsView;
  // «new», το id μιας συνδρομής, ή τίποτα (από το ?sub=).
  open: string | null;
}

export function SubscriptionsSection({ view, open }: SubscriptionsProps) {
  const editing =
    open && open !== "new"
      ? (view.items.find((s) => s.id === open) ?? null)
      : null;
  const isFormOpen = open === "new" || editing !== null;
  const totals = n5TotalsOf(view.totals);
  return (
    <div id="subscriptions">
      <Panel
        label="Συνδρομές"
        aside={
          <>
            <Link className="button" href={n5Href("new")}>
              Νέα συνδρομή
            </Link>
          </>
        }
      >
        <p className="note">
          Η αλλαγή πλάνου γίνεται στον πάροχο· εδώ καταγράφεται. Επτά μέρες πριν
          από κάθε ανανέωση έρχεται Ειδοποίηση.
        </p>
        {isFormOpen && (
          <SubscriptionForm key={editing?.id ?? "new"} sub={editing} />
        )}
        {view.items.length === 0 ? (
          <p className="muted">
            Δεν έχει καταγραφεί καμία συνδρομή. Πρόσθεσε με «Νέα συνδρομή» ό,τι
            πληρώνει η εταιρεία ή ο developer για το σύστημα.
          </p>
        ) : (
          <>
            <div className="n5-bleed">
              <RowList>
                {view.items.map((sub) => (
                  <SubscriptionRow key={sub.id} sub={sub} />
                ))}
                <GroupBand label="Σύνολο μηνιαίως" />
                {totals.map((total) => (
                  <ListRow
                    key={total.currency}
                    title={`Σύνολο μηνιαίως σε ${total.currency}`}
                    aside={<strong>{total.amount}</strong>}
                  />
                ))}
              </RowList>
            </div>
            {totals.length > 1 && (
              <p className="muted">Τα νομίσματα δεν αθροίζονται μεταξύ τους.</p>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
