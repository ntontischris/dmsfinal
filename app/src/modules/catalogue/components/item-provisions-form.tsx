"use client";

import Link from "next/link";

import { setProvisions } from "../actions-items";
import type { CatalogueCaps, CatalogueItem, ProvisionKind } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./item-basics-form-parts";
import { ProvisionsEditor } from "./provisions-editor";

interface ItemProvisionsFormProps {
  item: CatalogueItem;
  kinds: readonly ProvisionKind[];
  caps: CatalogueCaps;
}

const introFor = (item: CatalogueItem): string => {
  if (item.kind === "service")
    return "Τι δίνει μία μονάδα της Υπηρεσίας. Κενό σημαίνει ότι δεν καταναλώνει Παροχή (π.χ. drone).";
  return item.billing === "monthly"
    ? "Τι παίρνει ο πελάτης σε κάθε Περίοδο."
    : "Τι παίρνει ο πελάτης συνολικά.";
};

const OVERAGE_NOTE =
  "Ό,τι ξεπερνά τις Παροχές χρεώνεται με την τιμή της αντίστοιχης Υπηρεσίας στη Συμφωνία.";

function KindsNote({ canManageSettings }: { canManageSettings: boolean }) {
  return (
    <MutedNote>
      Τα είδη Παροχής, οι μονάδες και ο Τρόπος μέτρησης ορίζονται στις{" "}
      {canManageSettings ? (
        <Link href="/app/settings/agreements">Ρυθμίσεις › Συμφωνίες</Link>
      ) : (
        "Ρυθμίσεις › Συμφωνίες"
      )}
      .
    </MutedNote>
  );
}

// Η ανάγνωση δεν έχει φόρμα: «{ποσότητα} {μονάδα}» ανά γραμμή, με το όνομα του είδους όπως είναι τώρα στις Ρυθμίσεις.
function ReadOnlyProvisions({
  item,
  kinds,
}: {
  item: CatalogueItem;
  kinds: readonly ProvisionKind[];
}) {
  if (item.provisions.length === 0)
    return <p className="m-0 text-sm text-muted-foreground">Καμία Παροχή.</p>;
  return (
    <ul className="m-0 grid list-none gap-1 p-0 text-sm">
      {item.provisions.map((provision) => {
        const kind = kinds.find(
          (candidate) => candidate.id === provision.kindId,
        );
        return (
          <li key={provision.kindId}>
            {provision.quantity} {kind?.unit ?? "—"}
            {item.billing === "monthly" && (
              <span className="text-muted-foreground"> · ανά Περίοδο</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ItemProvisionsForm({
  item,
  kinds,
  caps,
}: ItemProvisionsFormProps) {
  const notes = (
    <>
      <KindsNote canManageSettings={caps.canManageSettings} />
      <MutedNote>{OVERAGE_NOTE}</MutedNote>
    </>
  );
  if (!caps.canManage)
    return (
      <div className="grid gap-3">
        <MutedNote>{introFor(item)}</MutedNote>
        <ReadOnlyProvisions item={item} kinds={kinds} />
        {notes}
      </div>
    );
  return (
    <ActionForm action={setProvisions} onlyWhenChanged submitLabel="Αποθήκευση">
      <input type="hidden" name="itemId" value={item.id} />
      <MutedNote>{introFor(item)}</MutedNote>
      <ProvisionsEditor
        kinds={kinds}
        initial={item.provisions}
        isPerPeriod={item.billing === "monthly"}
      />
      {notes}
    </ActionForm>
  );
}
