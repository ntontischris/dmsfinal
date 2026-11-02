"use client";

import { Panel } from "@/spaces/kit/panel";

import { updateItem } from "../actions-items";
import { moneyInput } from "../components/item-basics-form-parts";
import { itemKindLabel, priceSuffix, priceText } from "../helpers";
import { FORWARD_NOTE } from "../labels";
import type { CatalogueCaps, CatalogueItem } from "../types";

import { vatHint } from "./c2-adapter";
import { C2Form, C2Submit, Dash, Field } from "./c2-form";

interface BasicsProps {
  item: CatalogueItem;
  caps: CatalogueCaps;
  vatRate: number | null; // null όταν δεν διαβάστηκε ο ΦΠΑ: η υπόδειξη απλώς λείπει
}

const KIND_HINT =
  "Δεν αλλάζει αφού γραφτεί: οι γραμμές Συμφωνίας που το χρησιμοποιούν είναι του ίδιου τύπου.";
const PRICE_NOTE =
  "Η τιμή είναι η αρχή για κάθε πρόταση. Στη Συμφωνία αλλάζει ελεύθερα· τιμή κάτω από αυτήν είναι Παρέκκλιση.";

function BasicsSection({ item, caps }: BasicsProps) {
  const editable = caps.canManage;
  return (
    <Panel label="Βασικά">
      <dl className="dl">
        <Field
          id="c2-name"
          label="Όνομα"
          editable={editable}
          value={item.name}
          input={
            <input
              id="c2-name"
              name="name"
              className="input"
              defaultValue={item.name}
              required
            />
          }
        />
        <Field
          id="c2-kind"
          label="Είδος"
          editable={false}
          value={itemKindLabel(item)}
          hint={editable ? KIND_HINT : undefined}
        />
        {item.kind === "service" && (
          <Field
            id="c2-unit"
            label="Μονάδα"
            editable={editable}
            value={item.unit || <Dash />}
            input={
              <input
                id="c2-unit"
                name="unit"
                className="input"
                defaultValue={item.unit}
                placeholder="π.χ. ανά reel"
              />
            }
          />
        )}
        <Field
          id="c2-description"
          label="Περιγραφή"
          editable={editable}
          value={item.description || <Dash />}
          hint="Εσωτερική. Ό,τι βλέπει ο πελάτης γράφεται στην ενότητα «Δημόσιο»."
          input={
            <textarea
              id="c2-description"
              name="description"
              className="input"
              rows={2}
              defaultValue={item.description}
            />
          }
        />
      </dl>
    </Panel>
  );
}

// Μόνο για όποιον βλέπει ποσά (η βάση στέλνει null στους άλλους).
function PriceSection({ item, caps, vatRate }: BasicsProps) {
  if (!caps.canSeePrice || item.price === null) return null;
  const hint = vatHint(item.price, vatRate);
  return (
    <Panel label="Τιμή">
      <dl className="dl">
        <Field
          id="c2-price"
          label="Τιμή χωρίς ΦΠΑ"
          editable={caps.canEditPrice}
          value={priceText(item)}
          hint={
            hint && (
              <>{hint} Το ποσοστό το ορίζει ο Ιδιοκτήτης στις Ρυθμίσεις.</>
            )
          }
          input={
            <span className="btn-row">
              <input
                id="c2-price"
                name="price"
                className="input"
                inputMode="decimal"
                autoComplete="off"
                defaultValue={moneyInput(item.price)}
                style={{ width: "8rem" }}
              />
              <span className="muted">{`€ ${priceSuffix(item)}`.trim()}</span>
            </span>
          }
        />
      </dl>
      <p className="muted">{PRICE_NOTE}</p>
    </Panel>
  );
}

function Sections(props: BasicsProps) {
  const hasPrice = props.caps.canSeePrice && props.item.price !== null;
  if (!hasPrice) return <BasicsSection {...props} />;
  return (
    <div className="grid2">
      <BasicsSection {...props} />
      <PriceSection {...props} />
    </div>
  );
}

// «Βασικά» και «Τιμή» του prototype: μία ενέργεια (updateItem), άρα μία φόρμα και για τα δύο πάνελ.
// Όποιος δεν Διαχειρίζεται Κατάλογο βλέπει τα ίδια ως κείμενο, χωρίς κουμπί.
export function C2Basics(props: BasicsProps) {
  if (!props.caps.canManage) return <Sections {...props} />;
  return (
    <C2Form action={updateItem} itemId={props.item.id}>
      <Sections {...props} />
      <C2Submit label="Αποθήκευση" onlyWhenChanged aside={FORWARD_NOTE} />
    </C2Form>
  );
}
