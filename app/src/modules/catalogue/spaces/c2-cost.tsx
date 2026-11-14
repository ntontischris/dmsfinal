"use client";

import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { setCost } from "../actions-items";
import { hasActualHours } from "../actual-hours";
import { moneyInput } from "../components/item-basics-form-parts";
import { costOf, marginOf } from "../cost";
import {
  formatHours,
  formatMoney,
  formatMonth,
  formatMultiplier,
  formatPercent,
} from "../helpers";
import { COST_INTERNAL_NOTE } from "../labels";
import type {
  ActualHours,
  CatalogueCaps,
  CatalogueItem,
  CostHint,
  ItemCost,
} from "../types";

import { C2Form, C2Submit, Field } from "./c2-form";

interface CostProps {
  item: CatalogueItem;
  hint: CostHint | null;
  caps: CatalogueCaps;
  actual: ActualHours | null;
}

const HOURS_HINT_EDIT =
  "Εκτίμηση για όλη την ομάδα. Η γραμμή της Συμφωνίας τις αλλάζει ανά πελάτη.";
const HOURS_HINT_READ = "Αλλάζουν μόνο από όποιον «Διαχειρίζεται κόστος».";

const FinanceLink = () => (
  <Link href={hrefOf("O6")}>Ρυθμίσεις › Οικονομικά</Link>
);

// Το null δεν γίνεται ποτέ «0 ώρες»: σημαίνει ότι ο θεατής δεν δικαιούται να τις δει.
const hoursText = (hours: number | null): string =>
  hours === null ? "—" : formatHours(hours);

const directCostText = (item: CatalogueItem): string =>
  item.directCost === null
    ? "—"
    : `${formatMoney(item.directCost)}${item.directCostNote ? ` (${item.directCostNote})` : ""}`;

function HoursInput({
  id,
  name,
  hours,
}: {
  id: string;
  name: string;
  hours: number | null;
}) {
  return (
    <input
      id={id}
      name={name}
      className="input"
      type="number"
      step={0.5}
      min={0}
      max={999}
      defaultValue={hours ?? 0}
      style={{ width: "6rem" }}
    />
  );
}

const measuredText = (hours: number | null, count: number): string =>
  hours === null
    ? "χωρίς μέτρηση"
    : `${formatHours(hours)} (${count} ${count === 1 ? "Παραγωγή" : "Παραγωγές"})`;

// Πόσο κράτησε στην πράξη (b14), δίπλα στην εκτίμηση: μέσος όρος ανά μονάδα από επιβεβαιωμένες ώρες.
function ActualRow({ actual }: { actual: ActualHours | null }) {
  if (actual === null) return null;
  return (
    <>
      <dt>Πραγματικές ώρες (μ.ό.)</dt>
      <dd>
        {hasActualHours(actual)
          ? `γύρισμα ${measuredText(actual.shoot, actual.shootCount)} · μοντάζ ${measuredText(actual.edit, actual.editCount)}`
          : "Δεν υπάρχουν ακόμα επιβεβαιωμένες ώρες."}
        <div className="muted">
          Από Παραγωγές Συμφωνιών που έχουν μόνο αυτό, ανά μονάδα. Αν απέχουν
          πολύ από την εκτίμηση, διόρθωσε τις ώρες ή την τιμή.
        </div>
      </dd>
    </>
  );
}

function CostFields({ item, caps, actual }: CostProps) {
  const hoursEditable = caps.canManageCost;
  return (
    <dl className="dl">
      <Field
        id="c2-hours-shoot"
        label="Ώρες γυρίσματος"
        editable={hoursEditable}
        value={hoursText(item.hoursShoot)}
        input={
          <HoursInput
            id="c2-hours-shoot"
            name="hoursShoot"
            hours={item.hoursShoot}
          />
        }
      />
      <Field
        id="c2-hours-edit"
        label="Ώρες μοντάζ"
        editable={hoursEditable}
        value={hoursText(item.hoursEdit)}
        hint={hoursEditable ? HOURS_HINT_EDIT : HOURS_HINT_READ}
        input={
          <HoursInput
            id="c2-hours-edit"
            name="hoursEdit"
            hours={item.hoursEdit}
          />
        }
      />
      <ActualRow actual={actual} />
      <Field
        id="c2-direct-cost"
        label="Άμεσο κόστος"
        editable={caps.canEditDirectCost}
        value={directCostText(item)}
        hint="Ό,τι δεν είναι ώρες της ομάδας: drone, freelancer, μετακίνηση."
        input={
          <span className="btn-row">
            <input
              id="c2-direct-cost"
              name="directCost"
              className="input"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={moneyInput(item.directCost ?? 0)}
              style={{ width: "6rem" }}
            />
            <input
              name="directCostNote"
              className="input grow"
              aria-label="Τι είναι το Άμεσο κόστος"
              defaultValue={item.directCostNote ?? ""}
              placeholder="π.χ. ενοικίαση drone"
            />
          </span>
        }
      />
    </dl>
  );
}

function MarginRow({ price, cost }: { price: number; cost: ItemCost }) {
  const margin = marginOf(price, cost);
  return (
    <>
      <dt>Περιθώριο στην τιμή</dt>
      <dd>
        <strong>{formatMoney(margin.amount)}</strong> ·{" "}
        {formatPercent(margin.percent)}{" "}
        {margin.isBelowMin && (
          <Badge tone="attention">κάτω από την ελάχιστη</Badge>
        )}
        {margin.isBelowMin && (
          <div className="muted">
            Κάθε πρόταση με αυτή την τιμή θα ανάβει «χαμηλό περιθώριο». Εδώ
            είναι μόνο ένδειξη: ο Κατάλογος δεν ειδοποιεί.
          </div>
        )}
      </dd>
    </>
  );
}

// Η εκτίμηση βγαίνει από τα αποθηκευμένα στοιχεία και το Κόστος ώρας που ισχύει σήμερα.
function CostSummary({ item, hint }: Pick<CostProps, "item" | "hint">) {
  if (hint === null || hint.hourCost === null)
    return (
      <p className="muted">
        Δεν έχει οριστεί Κόστος ώρας. <FinanceLink />
      </p>
    );
  const cost = costOf(item, hint);
  if (cost === null) return null;
  const { min, target, max } = hint.multipliers;
  return (
    <>
      <dl className="dl">
        <dt>Κόστος ώρας</dt>
        <dd>
          {formatMoney(cost.hourCost)}
          {hint.hourCostMonth && ` (${formatMonth(hint.hourCostMonth)})`} ·{" "}
          <FinanceLink />
        </dd>
        <dt>Εκτιμώμενο κόστος</dt>
        <dd>
          <strong>{formatMoney(cost.estimatedCost)}</strong>{" "}
          <span className="muted">
            = {formatHours(cost.totalHours)} × {formatMoney(cost.hourCost)}
            {cost.directCost > 0 && ` + ${formatMoney(cost.directCost)}`}
          </span>
        </dd>
        <dt>Εύρος τιμής</dt>
        <dd>
          ελάχιστη {formatMoney(cost.range.min)} · στόχος{" "}
          {formatMoney(cost.range.target)} · μέγιστη{" "}
          {formatMoney(cost.range.max)}
          <div className="muted">
            κόστος × {formatMultiplier(min)} / {formatMultiplier(target)} /{" "}
            {formatMultiplier(max)}. Οδηγός: την τιμή τη γράφεις εσύ.
          </div>
        </dd>
        {item.price !== null && <MarginRow price={item.price} cost={cost} />}
      </dl>
      {!cost.hasHours && (
        <p className="muted">
          Οι ώρες δεν έχουν οριστεί ακόμα, οπότε το κόστος βγαίνει μόνο από το
          Άμεσο κόστος.
        </p>
      )}
    </>
  );
}

function CostPanel(props: CostProps & { isForm: boolean }) {
  return (
    <Panel label="Κόστος και περιθώριο">
      <CostFields {...props} />
      <CostSummary item={props.item} hint={props.hint} />
      <p className="muted">{COST_INTERNAL_NOTE}</p>
      {props.isForm && <C2Submit label="Αποθήκευση" onlyWhenChanged />}
    </Panel>
  );
}

// Μόνο για όσους «Βλέπουν κόστος». Κάθε πεδίο είναι input μόνο για όποιον μπορεί να το γράψει·
// τα υπόλοιπα δεν μπαίνουν στη φόρμα, άρα δεν αλλάζουν (το action στέλνει μόνο ό,τι υπάρχει).
export function C2Cost(props: CostProps) {
  const { item, caps } = props;
  if (!caps.canSeeCost) return null;
  if (!caps.canManageCost && !caps.canEditDirectCost)
    return <CostPanel {...props} isForm={false} />;
  return (
    <C2Form action={setCost} itemId={item.id}>
      <CostPanel {...props} isForm />
    </C2Form>
  );
}
