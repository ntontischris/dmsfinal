"use client";

import { Input } from "@/components/ui/field";

import { setCost } from "../actions-items";
import { formatHours, formatMoney } from "../helpers";
import { COST_INTERNAL_NOTE } from "../labels";
import type { CatalogueCaps, CatalogueItem } from "../types";

import { ActionForm } from "./action-form";
import {
  FormRow,
  moneyInput,
  MutedNote,
  ReadOnlyRow,
} from "./item-basics-form-parts";

interface ItemCostFormProps {
  item: CatalogueItem;
  caps: CatalogueCaps;
}

const HOURS_HINT_EDIT =
  "Εκτίμηση για όλη την ομάδα. Η γραμμή της Συμφωνίας τις αλλάζει ανά πελάτη.";
const HOURS_HINT_READ = "Αλλάζουν μόνο από όποιον «Διαχειρίζεται κόστος».";
const DIRECT_COST_NOTE_HINT =
  "Ό,τι δεν είναι ώρες της ομάδας: drone, freelancer, μετακίνηση.";

interface HoursRowProps {
  id: string;
  name: "hoursShoot" | "hoursEdit";
  label: string;
  hours: number | null;
  canEdit: boolean;
  hint: string;
}

// Το null δεν γίνεται ποτέ «0 ώρες»: σημαίνει ότι ο θεατής δεν δικαιούται να τις δει.
function HoursRow({ id, name, label, hours, canEdit, hint }: HoursRowProps) {
  if (!canEdit)
    return (
      <ReadOnlyRow label={label} hint={hint}>
        {hours === null ? "—" : formatHours(hours)}
      </ReadOnlyRow>
    );
  return (
    <FormRow id={id} label={label} hint={hint}>
      <Input
        id={id}
        name={name}
        type="number"
        step={0.5}
        min={0}
        max={999}
        defaultValue={hours ?? 0}
      />
    </FormRow>
  );
}

function DirectCostRows({
  item,
  canEdit,
}: {
  item: CatalogueItem;
  canEdit: boolean;
}) {
  if (!canEdit)
    return (
      <>
        <ReadOnlyRow label="Άμεσο κόστος">
          {item.directCost === null ? "—" : formatMoney(item.directCost)}
        </ReadOnlyRow>
        <ReadOnlyRow
          label="Σημείωση Άμεσου κόστους"
          hint={DIRECT_COST_NOTE_HINT}
        >
          {item.directCostNote || "—"}
        </ReadOnlyRow>
      </>
    );
  return (
    <>
      <FormRow id="item-direct-cost" label="Άμεσο κόστος" hint="σε €">
        <Input
          id="item-direct-cost"
          name="directCost"
          inputMode="decimal"
          autoComplete="off"
          defaultValue={moneyInput(item.directCost ?? 0)}
        />
      </FormRow>
      <FormRow
        id="item-direct-cost-note"
        label="Σημείωση Άμεσου κόστους"
        hint={DIRECT_COST_NOTE_HINT}
      >
        <Input
          id="item-direct-cost-note"
          name="directCostNote"
          defaultValue={item.directCostNote ?? ""}
        />
      </FormRow>
    </>
  );
}

function Fields({ item, caps }: ItemCostFormProps) {
  const hint = caps.canManageCost ? HOURS_HINT_EDIT : HOURS_HINT_READ;
  return (
    <>
      <HoursRow
        id="item-hours-shoot"
        name="hoursShoot"
        label="Ώρες γυρίσματος"
        hours={item.hoursShoot}
        canEdit={caps.canManageCost}
        hint={hint}
      />
      <HoursRow
        id="item-hours-edit"
        name="hoursEdit"
        label="Ώρες μοντάζ"
        hours={item.hoursEdit}
        canEdit={caps.canManageCost}
        hint={hint}
      />
      <DirectCostRows item={item} canEdit={caps.canEditDirectCost} />
      <MutedNote>{COST_INTERNAL_NOTE}</MutedNote>
    </>
  );
}

// Ώρες και Άμεσο κόστος. Κάθε πεδίο είναι πεδίο μόνο για όποιον μπορεί να το γράψει· τα υπόλοιπα δεν μπαίνουν στη φόρμα,
// άρα δεν αλλάζουν (το action στέλνει στη βάση μόνο τα πεδία που υπάρχουν).
export function ItemCostForm(props: ItemCostFormProps) {
  const { item, caps } = props;
  if (!caps.canManageCost && !caps.canEditDirectCost)
    return (
      <div className="grid gap-3">
        <Fields {...props} />
      </div>
    );
  return (
    <ActionForm action={setCost} submitLabel="Αποθήκευση">
      <input type="hidden" name="itemId" value={item.id} />
      <Fields {...props} />
    </ActionForm>
  );
}
