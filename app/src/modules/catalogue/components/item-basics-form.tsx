"use client";

import { Input } from "@/components/ui/field";

import { updateItem } from "../actions-items";
import { FORWARD_NOTE } from "../labels";
import {
  formatMoney,
  itemKindLabel,
  priceSuffix,
  priceText,
  withVat,
} from "../helpers";
import type { CatalogueCaps, CatalogueItem } from "../types";

import { ActionForm } from "./action-form";
import {
  FormRow,
  moneyInput,
  MutedNote,
  ReadOnlyRow,
  Textarea,
  WithSuffix,
} from "./item-basics-form-parts";

interface ItemBasicsFormProps {
  item: CatalogueItem;
  caps: CatalogueCaps;
  vatRate: number | null; // null όταν δεν διαβάστηκε ο ΦΠΑ: η υπόδειξη απλώς λείπει
}

const KIND_HINT =
  "Δεν αλλάζει αφού γραφτεί: οι γραμμές μιας Συμφωνίας είναι ίδιου τύπου.";
const DESCRIPTION_HINT =
  "Εσωτερική. Ό,τι βλέπει ο πελάτης γράφεται στην ενότητα «Δημόσιο».";
const PRICE_NOTE =
  "Η τιμή είναι η αρχή για κάθε πρόταση. Στη Συμφωνία αλλάζει ελεύθερα· τιμή κάτω από αυτήν είναι Παρέκκλιση.";

const vatHint = (
  price: number | null,
  vatRate: number | null,
): string | undefined =>
  price === null || vatRate === null
    ? undefined
    : `Με ΦΠΑ ${vatRate}%: ${formatMoney(withVat(price, vatRate))}`;

function PriceRow({ item, caps, vatRate }: ItemBasicsFormProps) {
  if (!caps.canSeePrice || item.price === null) return null;
  const hint = vatHint(item.price, vatRate);
  if (!caps.canEditPrice)
    return (
      <ReadOnlyRow label="Τιμή χωρίς ΦΠΑ" hint={hint}>
        {priceText(item)}
      </ReadOnlyRow>
    );
  return (
    <FormRow id="item-price" label="Τιμή χωρίς ΦΠΑ" hint={hint}>
      <WithSuffix suffix={`€ ${priceSuffix(item)}`.trim()}>
        <Input
          id="item-price"
          name="price"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={moneyInput(item.price)}
        />
      </WithSuffix>
    </FormRow>
  );
}

function UnitRow({ item, canEdit }: { item: CatalogueItem; canEdit: boolean }) {
  if (item.kind !== "service") return null;
  if (!canEdit)
    return <ReadOnlyRow label="Μονάδα">{item.unit || "—"}</ReadOnlyRow>;
  return (
    <FormRow id="item-unit" label="Μονάδα" hint="π.χ. ανά reel">
      <Input id="item-unit" name="unit" defaultValue={item.unit} />
    </FormRow>
  );
}

function NameRow({ item, canEdit }: { item: CatalogueItem; canEdit: boolean }) {
  if (!canEdit) return <ReadOnlyRow label="Όνομα">{item.name}</ReadOnlyRow>;
  return (
    <FormRow id="item-name" label="Όνομα">
      <Input id="item-name" name="name" defaultValue={item.name} required />
    </FormRow>
  );
}

function DescriptionRow({
  item,
  canEdit,
}: {
  item: CatalogueItem;
  canEdit: boolean;
}) {
  if (!canEdit)
    return (
      <ReadOnlyRow label="Περιγραφή" hint={DESCRIPTION_HINT}>
        {item.description || "—"}
      </ReadOnlyRow>
    );
  return (
    <FormRow id="item-description" label="Περιγραφή" hint={DESCRIPTION_HINT}>
      <Textarea
        id="item-description"
        name="description"
        defaultValue={item.description}
        rows={3}
      />
    </FormRow>
  );
}

function Fields(props: ItemBasicsFormProps) {
  const { item, caps } = props;
  return (
    <>
      <NameRow item={item} canEdit={caps.canManage} />
      <ReadOnlyRow label="Είδος" hint={KIND_HINT}>
        {itemKindLabel(item)}
      </ReadOnlyRow>
      <UnitRow item={item} canEdit={caps.canManage} />
      <DescriptionRow item={item} canEdit={caps.canManage} />
      <PriceRow {...props} />
      {caps.canSeePrice && (
        <>
          <MutedNote>{PRICE_NOTE}</MutedNote>
          <MutedNote>{FORWARD_NOTE}</MutedNote>
        </>
      )}
    </>
  );
}

// «Βασικά και τιμή»: φόρμα μόνο για όποιον Διαχειρίζεται Κατάλογο· οι άλλοι βλέπουν τα ίδια πεδία ως κείμενο, χωρίς κουμπί.
// Ό,τι δεν είναι πεδίο δεν στέλνεται, άρα η βάση δεν αγγίζει τη μονάδα ή την τιμή που ο θεατής δεν γράφει.
export function ItemBasicsForm(props: ItemBasicsFormProps) {
  const { item, caps } = props;
  if (!caps.canManage)
    return (
      <div className="grid gap-3">
        <Fields {...props} />
      </div>
    );
  return (
    <ActionForm action={updateItem} submitLabel="Αποθήκευση">
      <input type="hidden" name="itemId" value={item.id} />
      <Fields {...props} />
    </ActionForm>
  );
}
