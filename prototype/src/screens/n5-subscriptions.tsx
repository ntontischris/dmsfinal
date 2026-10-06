import Link from "next/link";

import type { Subscription } from "@/data/integrations";
import type { RoleId } from "@/data/roles";
import { fmtDate, screenHref, type ScreenQuery } from "@/screens/shared";

// Μητρώο συνδρομών (απόφαση Η): πίνακας, «Επεξεργασία» / «Νέα συνδρομή» (`?sub=`), σύνολα ανά νόμισμα.

const AMOUNT = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtAmount = (value: number, currency: Subscription["currency"]): string =>
  `${AMOUNT.format(value)} ${currency}`;

const fmtRenews = (value: string): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? fmtDate(value) : value;

const totalOf = (
  subs: readonly Subscription[],
  currency: Subscription["currency"],
): number =>
  subs
    .filter((s) => s.currency === currency)
    .reduce((sum, s) => sum + s.monthly, 0);

const n5Href = (role: RoleId, query: ScreenQuery, sub?: string): string =>
  screenHref(role, "N5", { state: query.state, sub });

function SubscriptionForm({
  role,
  query,
  sub,
}: {
  role: RoleId;
  query: ScreenQuery;
  sub: Subscription | undefined;
}) {
  const fields: readonly { id: string; label: string; value: string }[] = [
    { id: "provider", label: "Πάροχος", value: sub?.provider ?? "" },
    { id: "what", label: "Τι", value: sub?.what ?? "" },
    { id: "plan", label: "Πλάνο", value: sub?.plan ?? "" },
    {
      id: "monthly",
      label: "Μηνιαίο κόστος",
      value: sub ? String(sub.monthly) : "",
    },
    { id: "renews", label: "Ανανέωση", value: sub?.renews ?? "" },
    { id: "account", label: "Λογαριασμός", value: sub?.account ?? "" },
    { id: "paidBy", label: "Ποιος πληρώνει", value: sub?.paidBy ?? "" },
    { id: "link", label: "Σύνδεσμος στον πάροχο", value: sub?.link ?? "" },
  ];
  return (
    <div className="card n5-form">
      <h3>{sub ? `Επεξεργασία: ${sub.provider}` : "Νέα συνδρομή"}</h3>
      <div className="stack">
        {fields.map((field) => (
          <span key={field.id} className="stack n5-field">
            <label htmlFor={`n5-sub-${field.id}`}>{field.label}</label>
            <input
              id={`n5-sub-${field.id}`}
              className="input"
              defaultValue={field.value}
            />
          </span>
        ))}
        <label htmlFor="n5-sub-currency">Νόμισμα</label>
        <select
          id="n5-sub-currency"
          className="select"
          defaultValue={sub?.currency ?? "€"}
        >
          <option value="€">€</option>
          <option value="$">$</option>
        </select>
      </div>
      <p className="note">
        Εδώ μόνο καταγράφεται· το πλάνο το αλλάζεις στον πάροχο.
      </p>
      <div className="btn-row">
        <button type="button" className="button" data-primary="true">
          Αποθήκευση
        </button>
        <Link className="button" href={n5Href(role, query)}>
          Άκυρο
        </Link>
      </div>
    </div>
  );
}

function SubscriptionRow(props: {
  role: RoleId;
  query: ScreenQuery;
  sub: Subscription;
}) {
  const { sub } = props;
  return (
    <tr>
      <td data-label="Πάροχος">{sub.provider}</td>
      <td data-label="Τι">{sub.what}</td>
      <td data-label="Πλάνο">{sub.plan}</td>
      <td data-label="Μηνιαίο κόστος" className="num">
        {fmtAmount(sub.monthly, sub.currency)}
      </td>
      <td data-label="Ανανέωση">{fmtRenews(sub.renews)}</td>
      <td data-label="Λογαριασμός">{sub.account}</td>
      <td data-label="Ποιος πληρώνει">{sub.paidBy}</td>
      <td data-label="Πάροχος (σύνδεσμος)">
        <a href={sub.link} target="_blank" rel="noreferrer">
          Άνοιγμα
        </a>
      </td>
      <td data-label="">
        <Link href={n5Href(props.role, props.query, sub.id)}>Επεξεργασία</Link>
      </td>
    </tr>
  );
}

interface SubscriptionsProps {
  role: RoleId;
  query: ScreenQuery;
  subs: readonly Subscription[];
}

export function SubscriptionsSection({
  role,
  query,
  subs,
}: SubscriptionsProps) {
  const editing =
    query.sub === "new" ? undefined : subs.find((s) => s.id === query.sub);
  const isFormOpen = query.sub === "new" || !!editing;
  return (
    <section className="card n5-section">
      <div className="card-title">
        <h2>Συνδρομές</h2>
        <Link className="button" href={n5Href(role, query, "new")}>
          Νέα συνδρομή
        </Link>
      </div>
      <p className="note">
        Η αλλαγή πλάνου γίνεται στον πάροχο· εδώ καταγράφεται.
      </p>
      {isFormOpen && (
        <SubscriptionForm role={role} query={query} sub={editing} />
      )}
      {subs.length === 0 ? (
        <p className="muted">
          Δεν έχει καταγραφεί καμία συνδρομή. Πρόσθεσε με «Νέα συνδρομή» ό,τι
          πληρώνει η εταιρεία ή ο developer για το σύστημα.
        </p>
      ) : (
        <>
          <div className="scroll">
            <table className="rtable">
              <thead>
                <tr>
                  <th>Πάροχος</th>
                  <th>Τι</th>
                  <th>Πλάνο</th>
                  <th className="num">Μηνιαίο κόστος</th>
                  <th>Ανανέωση</th>
                  <th>Λογαριασμός</th>
                  <th>Ποιος πληρώνει</th>
                  <th>Πάροχος</th>
                  <th>
                    <span className="n5-sr">Ενέργειες</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <SubscriptionRow
                    key={sub.id}
                    role={role}
                    query={query}
                    sub={sub}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <dl className="dl n5-totals">
            <dt>Σύνολο μηνιαίως σε €</dt>
            <dd>{fmtAmount(totalOf(subs, "€"), "€")}</dd>
            <dt>Σύνολο μηνιαίως σε $</dt>
            <dd>{fmtAmount(totalOf(subs, "$"), "$")}</dd>
          </dl>
          <p className="muted">Τα δύο νομίσματα δεν αθροίζονται μαζί.</p>
        </>
      )}
    </section>
  );
}
