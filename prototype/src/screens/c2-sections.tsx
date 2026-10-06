import Link from "next/link";
import type { ReactNode } from "react";

import type { CatalogueCaps } from "@/data/catalogue-access";
import {
  COST_SETTINGS,
  PROVISION_KINDS,
  costOf,
  hourCost,
  isPackage,
  priceSuffix,
  provisionKind,
  type CatalogueItem,
  type CataloguePackage,
} from "@/data/catalogue";
import type { RoleId } from "@/data/roles";
import {
  Badge,
  fmtDate,
  fmtMoney,
  fmtPercent,
  screenHref,
} from "@/screens/shared";

export interface SectionProps {
  role: RoleId;
  item: CatalogueItem;
  caps: CatalogueCaps;
  isNew: boolean;
}

interface FieldProps {
  id: string;
  label: string;
  editable: boolean;
  value: ReactNode;
  input?: ReactNode;
  hint?: ReactNode;
}

// Ένα πεδίο: input για όποιον το αλλάζει, κείμενο για τους υπόλοιπους. Ίδια θέση και στις δύο όψεις.
function Field({ id, label, editable, value, input, hint }: FieldProps) {
  return (
    <>
      <dt>{editable ? <label htmlFor={id}>{label}</label> : label}</dt>
      <dd>
        {editable && input ? input : value}
        {hint && <div className="muted">{hint}</div>}
      </dd>
    </>
  );
}

export function BasicsSection({ item, caps, isNew }: SectionProps) {
  const editable = caps.canManage;
  const kindText = isPackage(item)
    ? `Πακέτο ${item.billing}`
    : `Υπηρεσία, ${item.unit}`;
  return (
    <section className="card">
      <h2>Βασικά</h2>
      <dl className="dl">
        <Field
          id="name"
          label="Όνομα"
          editable={editable}
          value={item.name}
          input={<input id="name" className="input" defaultValue={item.name} />}
        />
        <Field
          id="kind"
          label="Είδος"
          editable={editable && isNew}
          value={kindText}
          hint={
            !isNew && editable
              ? "Δεν αλλάζει αφού γραφτεί: οι γραμμές Συμφωνίας που το χρησιμοποιούν είναι του ίδιου τύπου."
              : undefined
          }
          input={
            <select id="kind" className="select" defaultValue={kindText}>
              <option>Πακέτο μηνιαίο</option>
              <option>Πακέτο εφάπαξ</option>
              <option>Υπηρεσία</option>
            </select>
          }
        />
        {!isPackage(item) && (
          <Field
            id="unit"
            label="Μονάδα"
            editable={editable}
            value={item.unit}
            input={
              <input
                id="unit"
                className="input"
                defaultValue={item.unit}
                placeholder="π.χ. ανά reel"
              />
            }
          />
        )}
        <Field
          id="description"
          label="Περιγραφή"
          editable={editable}
          value={item.description || <span className="muted">—</span>}
          hint="Εσωτερική. Ό,τι βλέπει ο πελάτης γράφεται στην ενότητα «Δημόσιο»."
          input={
            <textarea
              id="description"
              className="input"
              rows={2}
              defaultValue={item.description}
            />
          }
        />
      </dl>
    </section>
  );
}

export function ProvisionsSection({ role, item, caps }: SectionProps) {
  const editable = caps.canManage;
  const perPeriod = isPackage(item) && item.billing === "μηνιαίο";
  const intro = isPackage(item)
    ? perPeriod
      ? "Τι παίρνει ο πελάτης σε κάθε Περίοδο."
      : "Τι παίρνει ο πελάτης συνολικά."
    : "Τι δίνει μία μονάδα της Υπηρεσίας. Κενό σημαίνει ότι δεν καταναλώνει Παροχή (π.χ. drone).";
  return (
    <section className="card">
      <div className="card-title">
        <h2>Παροχές</h2>
        {editable && (
          <button type="button" className="button">
            Προσθήκη Παροχής
          </button>
        )}
      </div>
      <p className="muted">{intro}</p>
      {item.provisions.length === 0 ? (
        <p className="muted">Καμία Παροχή.</p>
      ) : (
        <ul className="list">
          {item.provisions.map((provision) => {
            const kind = provisionKind(provision.kindId);
            return (
              <li key={provision.kindId} className="row">
                {editable ? (
                  <span className="btn-row">
                    <input
                      className="input"
                      type="number"
                      aria-label={`Ποσότητα ${kind.name}`}
                      defaultValue={provision.quantity}
                      style={{ width: "5rem" }}
                    />
                    <select
                      className="select"
                      aria-label="Είδος Παροχής"
                      defaultValue={kind.id}
                    >
                      {PROVISION_KINDS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.unit}
                        </option>
                      ))}
                    </select>
                    {perPeriod && <span className="muted">ανά Περίοδο</span>}
                  </span>
                ) : (
                  <span>
                    {provision.quantity} {kind.unit}
                    {perPeriod && <span className="muted"> ανά Περίοδο</span>}
                  </span>
                )}
                <span className="muted">
                  {kind.counting
                    ? `${kind.counting}, έως ${kind.defaultHours} ώρες`
                    : "μετράει σε πλήθος"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="note">
        Τα είδη Παροχής, οι μονάδες και ο Τρόπος μέτρησης ορίζονται στις{" "}
        <Link href={screenHref(role, "O3", {})}>Ρυθμίσεις › Συμφωνίες</Link>.
        Ό,τι ξεπερνά τις Παροχές χρεώνεται με την τιμή της αντίστοιχης Υπηρεσίας
        στη Συμφωνία.
      </p>
    </section>
  );
}

export function PriceSection({ item, caps }: SectionProps) {
  const editable = caps.canManage;
  const withVat = item.price * (1 + COST_SETTINGS.vatPercent / 100);
  return (
    <section className="card">
      <h2>Τιμή</h2>
      <dl className="dl">
        <Field
          id="price"
          label="Τιμή χωρίς ΦΠΑ"
          editable={editable}
          value={`${fmtMoney(item.price)} ${priceSuffix(item)}`}
          hint={`Με ΦΠΑ ${COST_SETTINGS.vatPercent}%: ${fmtMoney(withVat)}. Το ποσοστό το ορίζει ο Ιδιοκτήτης στις Ρυθμίσεις.`}
          input={
            <span className="btn-row">
              <input
                id="price"
                className="input"
                type="number"
                defaultValue={item.price}
                style={{ width: "8rem" }}
              />
              <span className="muted">€ {priceSuffix(item)}</span>
            </span>
          }
        />
      </dl>
      <p className="muted">
        Η τιμή είναι η αρχή για κάθε πρόταση. Στη Συμφωνία αλλάζει ελεύθερα·
        τιμή κάτω από αυτήν είναι Παρέκκλιση.
      </p>
    </section>
  );
}

// Μόνο για όσους «Βλέπουν κόστος και κερδοφορία». Ώρες: αλλάζουν μόνο από όποιον «Διαχειρίζεται κόστος».
export function CostSection({ role, item, caps }: SectionProps) {
  const cost = costOf(item);
  const hoursEditable = caps.canManageCost;
  const directEditable = caps.canManage;
  return (
    <section className="card">
      <h2>Κόστος και περιθώριο</h2>
      <dl className="dl">
        <Field
          id="hours-shoot"
          label="Ώρες γυρίσματος"
          editable={hoursEditable}
          value={`${item.hours.shoot} ώρες`}
          input={
            <input
              id="hours-shoot"
              className="input"
              type="number"
              step="0.5"
              defaultValue={item.hours.shoot}
              style={{ width: "6rem" }}
            />
          }
        />
        <Field
          id="hours-edit"
          label="Ώρες μοντάζ"
          editable={hoursEditable}
          value={`${item.hours.edit} ώρες`}
          hint={
            hoursEditable
              ? "Εκτίμηση για όλη την ομάδα. Η γραμμή της Συμφωνίας τις αλλάζει ανά πελάτη."
              : "Αλλάζουν μόνο από όποιον «Διαχειρίζεται κόστος» (αρχικά ο Ιδιοκτήτης)."
          }
          input={
            <input
              id="hours-edit"
              className="input"
              type="number"
              step="0.5"
              defaultValue={item.hours.edit}
              style={{ width: "6rem" }}
            />
          }
        />
        <Field
          id="direct-cost"
          label="Άμεσο κόστος"
          editable={directEditable}
          value={
            item.directCost === 0
              ? "—"
              : `${fmtMoney(item.directCost)}${item.directCostNote ? ` (${item.directCostNote})` : ""}`
          }
          hint="Ό,τι δεν είναι ώρες της ομάδας: drone, freelancer, μετακίνηση."
          input={
            <span className="btn-row">
              <input
                id="direct-cost"
                className="input"
                type="number"
                defaultValue={item.directCost}
                style={{ width: "6rem" }}
              />
              <input
                className="input grow"
                aria-label="Τι είναι το Άμεσο κόστος"
                defaultValue={item.directCostNote ?? ""}
                placeholder="π.χ. ενοικίαση drone"
              />
            </span>
          }
        />
      </dl>
      <dl className="dl">
        <dt>Κόστος ώρας</dt>
        <dd>
          {fmtMoney(hourCost())} ({COST_SETTINGS.monthLabel}) ·{" "}
          <Link href={screenHref(role, "I6", {})}>Έξοδα και Κόστος ώρας</Link>
        </dd>
        <dt>Εκτιμώμενο κόστος</dt>
        <dd>
          <strong>{fmtMoney(cost.estimatedCost)}</strong>{" "}
          <span className="muted">
            = {cost.totalHours} ώρες × {fmtMoney(hourCost())}
            {item.directCost > 0 && ` + ${fmtMoney(item.directCost)}`}
          </span>
        </dd>
        <dt>Εύρος τιμής</dt>
        <dd>
          ελάχιστη {fmtMoney(cost.range.min)} · στόχος{" "}
          {fmtMoney(cost.range.target)} · μέγιστη {fmtMoney(cost.range.max)}
          <div className="muted">
            κόστος × {COST_SETTINGS.multipliers.min} /{" "}
            {COST_SETTINGS.multipliers.target} / {COST_SETTINGS.multipliers.max}
            . Οδηγός: την τιμή τη γράφεις εσύ.
          </div>
        </dd>
        <dt>Περιθώριο στην τιμή</dt>
        <dd>
          <strong>{fmtMoney(cost.margin)}</strong> ·{" "}
          {fmtPercent(cost.marginPercent)}{" "}
          {cost.isBelowMin && (
            <Badge tone="attention">κάτω από την ελάχιστη</Badge>
          )}
          {cost.isBelowMin && (
            <div className="muted">
              Κάθε πρόταση με αυτή την τιμή θα ανάβει «χαμηλό περιθώριο». Εδώ
              είναι μόνο ένδειξη: ο Κατάλογος δεν ειδοποιεί.
            </div>
          )}
        </dd>
      </dl>
    </section>
  );
}

export function LearningSection({ item, caps }: SectionProps) {
  const actuals = item.actuals;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Ο Κατάλογος μαθαίνει</h2>
        {actuals && caps.canManageCost && (
          <button type="button" className="button">
            Πέρασε τις μέσες ως εκτίμηση
          </button>
        )}
      </div>
      {!actuals ? (
        <p className="muted">
          Καμία Παραγωγή με Πραγματικές ώρες ακόμα. Όταν υπάρξουν, εδώ φαίνεται
          ο μέσος όρος δίπλα στην εκτίμηση.
        </p>
      ) : (
        <>
          <div className="scroll">
            <table className="rtable">
              <thead>
                <tr>
                  <th>Ώρες</th>
                  <th className="num">Εκτίμηση</th>
                  <th className="num">Μέσες πραγματικές</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Ώρες">Γύρισμα</td>
                  <td className="num" data-label="Εκτίμηση">
                    {item.hours.shoot}
                  </td>
                  <td className="num" data-label="Μέσες πραγματικές">
                    {actuals.avgShoot}
                  </td>
                </tr>
                <tr>
                  <td data-label="Ώρες">Μοντάζ</td>
                  <td className="num" data-label="Εκτίμηση">
                    {item.hours.edit}
                  </td>
                  <td className="num" data-label="Μέσες πραγματικές">
                    {actuals.avgEdit}
                  </td>
                </tr>
                <tr>
                  <td data-label="Ώρες">
                    <strong>Σύνολο</strong>
                  </td>
                  <td className="num" data-label="Εκτίμηση">
                    <strong>{item.hours.shoot + item.hours.edit}</strong>
                  </td>
                  <td className="num" data-label="Μέσες πραγματικές">
                    <strong>{actuals.avgShoot + actuals.avgEdit}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted">
            Από {actuals.productions} Παραγωγές. Τίποτα δεν αλλάζει μόνο του: η
            εκτίμηση διορθώνεται με απόφαση και ισχύει για νέες προτάσεις.
          </p>
        </>
      )}
    </section>
  );
}

export function PublicSection({
  role,
  item,
  caps,
}: SectionProps & { item: CataloguePackage }) {
  const editable = caps.canManage;
  return (
    <section className="card">
      <h2>Δημόσιο</h2>
      <p className="muted">
        Πώς φαίνεται το Πακέτο στην Ιστοσελίδα και στον Βοηθό. Οι τιμές έχουν
        μία πηγή: εδώ.
      </p>
      <dl className="dl">
        <Field
          id="is-public"
          label="Δημόσιο"
          editable={editable}
          value={item.isPublic ? "Ναι" : "Όχι"}
          input={
            <label>
              <input
                id="is-public"
                type="checkbox"
                defaultChecked={item.isPublic}
              />{" "}
              Φαίνεται στην Ιστοσελίδα
            </label>
          }
        />
        <Field
          id="shows-price"
          label="Ένδειξη τιμής"
          editable={editable}
          value={
            item.showsPrice
              ? `«από ${fmtMoney(item.price)} + ΦΠΑ»`
              : "Χωρίς τιμή"
          }
          hint={
            item.isPublic && item.showsPrice
              ? `Ο Επισκέπτης βλέπει «από ${fmtMoney(item.price)} + ΦΠΑ».`
              : "Ο Επισκέπτης βλέπει το Πακέτο χωρίς τιμή."
          }
          input={
            <label>
              <input
                id="shows-price"
                type="checkbox"
                defaultChecked={item.showsPrice}
              />{" "}
              Δείχνει «από Χ € + ΦΠΑ»
            </label>
          }
        />
        <Field
          id="name-en"
          label="Όνομα (EN)"
          editable={editable}
          value={item.nameEn || <span className="muted">—</span>}
          input={
            <input id="name-en" className="input" defaultValue={item.nameEn} />
          }
        />
        <Field
          id="public-el"
          label="Σύντομη περιγραφή"
          editable={editable}
          value={item.descriptionPublic || <span className="muted">—</span>}
          hint="Ελληνικά υποχρεωτικά, αγγλικά προαιρετικά."
          input={
            <textarea
              id="public-el"
              className="input"
              rows={2}
              defaultValue={item.descriptionPublic}
            />
          }
        />
        <Field
          id="public-en"
          label="Σύντομη περιγραφή (EN)"
          editable={editable}
          value={item.descriptionPublicEn || <span className="muted">—</span>}
          input={
            <textarea
              id="public-en"
              className="input"
              rows={2}
              defaultValue={item.descriptionPublicEn}
            />
          }
        />
        <dt>Τομείς</dt>
        <dd>
          {item.sectors.length === 0 ? (
            <span className="muted">Κανένας Τομέας δεν το δείχνει.</span>
          ) : (
            item.sectors.join(", ")
          )}
          <div className="muted">
            Η σύνδεση γίνεται από τον Τομέα, στους{" "}
            <Link href={screenHref(role, "Q1", {})}>Τομείς</Link>. Προεπισκόπηση
            στη σελίδα <Link href={screenHref("visitor", "R5", {})}>Τιμές</Link>
            .
          </div>
        </dd>
      </dl>
    </section>
  );
}

export function UsageSection({ role, item, caps, isNew }: SectionProps) {
  if (isNew) return null;
  return (
    <section className="card">
      <h2>Χρήση και ιστορικό</h2>
      <dl className="dl">
        <dt>Σε χρήση</dt>
        <dd>
          {item.activeAgreements === 0 ? (
            "Καμία ενεργή Συμφωνία."
          ) : (
            <Link href={screenHref(role, "D1", { item: item.id })}>
              {item.activeAgreements} ενεργές Συμφωνίες
            </Link>
          )}
          <div className="muted">
            Οι αλλαγές εδώ δεν τις αγγίζουν: κάθε Συμφωνία κρατά αντίγραφο
            τιμής, ωρών και κόστους.
          </div>
        </dd>
        <dt>Τελευταία αλλαγή</dt>
        <dd>
          {fmtDate(item.updated.when)}, {item.updated.by} ·{" "}
          <Link href={screenHref(role, "P1", { item: item.id })}>
            Ίχνος ενεργειών
          </Link>
        </dd>
      </dl>
      {caps.canManage && (
        <div className="row">
          {item.isArchived ? (
            <>
              <span className="muted">
                Αρχειοθετημένο: δεν προσφέρεται σε νέες προτάσεις.
              </span>
              <button type="button" className="button">
                Επαναφορά
              </button>
            </>
          ) : (
            <>
              <span className="muted">
                Δεν διαγράφεται. Η αρχειοθέτηση το βγάζει από τις νέες προτάσεις
                και την Ιστοσελίδα· οι Συμφωνίες που το έχουν συνεχίζουν.
              </span>
              <button type="button" className="button" data-danger="true">
                Αρχειοθέτηση
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
