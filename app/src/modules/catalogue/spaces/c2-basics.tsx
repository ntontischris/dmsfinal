"use client";

import { updateItem } from "../actions-items";
import { moneyInput } from "../components/item-basics-form-parts";
import { itemKindLabel, priceSuffix, priceText } from "../helpers";
import { FORWARD_NOTE } from "../labels";
import type { CatalogueCaps, CatalogueItem } from "../types";

import { vatHint } from "./c2-adapter";
import { C2Box, C2Sub } from "./c2-box";
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
  );
}

// Μόνο για όποιον βλέπει ποσά (η βάση στέλνει null στους άλλους).
function PriceSection({ item, caps, vatRate }: BasicsProps) {
  if (!caps.canSeePrice || item.price === null) return null;
  const hint = vatHint(item.price, vatRate);
  return (
    <C2Sub title="Τιμή">
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
            <span className="ml-quick">
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
    </C2Sub>
  );
}

function Sections(props: BasicsProps) {
  return (
    <>
      <BasicsSection {...props} />
      <PriceSection {...props} />
    </>
  );
}

// Η υπόδειξη του κλειστού κουτιού: Είδος, Μονάδα, Περιγραφή και η τιμή (για όποιον τη βλέπει).
const basicsHint = ({ item, caps }: BasicsProps): string =>
  [
    itemKindLabel(item),
    item.kind === "service" && item.unit ? item.unit : null,
    item.description ? "με περιγραφή" : "χωρίς περιγραφή",
    caps.canSeePrice ? priceText(item) : null,
  ]
    .filter((part): part is string => part !== null && part !== "")
    .join(" · ");

// «Βασικά» και «Τιμή» του prototype: μία ενέργεια (updateItem), άρα μία φόρμα μέσα σε ένα κλειστό κουτί.
// Όποιος δεν Διαχειρίζεται Κατάλογο βλέπει τα ίδια ως κείμενο, χωρίς κουμπί.
export function C2Basics(props: BasicsProps) {
  return (
    <C2Box title="Βασικά" hint={basicsHint(props)}>
      {props.caps.canManage ? (
        <C2Form action={updateItem} itemId={props.item.id}>
          <div className="c2-box-body">
            <Sections {...props} />
            <C2Submit label="Αποθήκευση" onlyWhenChanged aside={FORWARD_NOTE} />
          </div>
        </C2Form>
      ) : (
        <Sections {...props} />
      )}
    </C2Box>
  );
}
