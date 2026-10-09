import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getViewer } from "@/modules/access";
import {
  ItemDangerPanel,
  ItemForm,
  ItemHistory,
  ItemStatusPanel,
  MutedNote,
  equipmentCaps,
  getItem,
  historyLines,
  listCategories,
  selectableCategories,
  type EquipmentItemDetail,
  type EquipmentCaps,
  type EquipmentCategory,
} from "@/modules/equipment";

import { LoadError, Missing, NoAccess } from "../equipment-parts";

import { ItemDetailsPanel } from "./item-details-panel";

export const metadata = { title: "Αντικείμενο Εξοπλισμού" };

// F2: ένα αντικείμενο του μητρώου. Τα πεδία είναι φόρμα μόνο για όποιον Διαχειρίζεται απόθεμα.
export default async function EquipmentItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  const caps = equipmentCaps(viewer);
  if (!caps.canView)
    return <NoAccess viewer={viewer} eyebrow="F2 · Αντικείμενο" />;

  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return <Missing />;

  const [item, categories] = await Promise.all([
    getItem(parsed.data),
    caps.canManage ? listCategories({ includeRetired: true }) : null,
  ]);
  if (!item.ok || (categories !== null && !categories.ok)) return <LoadError />;
  if (item.data === null) return <Missing />;

  return (
    <ItemPage
      item={item.data}
      caps={caps}
      categories={categories?.ok ? categories.data : []}
    />
  );
}

function ItemPage({
  item,
  caps,
  categories,
}: {
  item: EquipmentItemDetail;
  caps: EquipmentCaps;
  categories: readonly EquipmentCategory[];
}) {
  return (
    <>
      <ScreenHeader eyebrow="F2 · Αντικείμενο" title={item.name}>
        <Link
          href="/app/equipment"
          className={buttonVariants({ variant: "ghost" })}
        >
          ← Εξοπλισμός
        </Link>
      </ScreenHeader>
      {!caps.canManage && (
        <MutedNote>
          Μόνο ανάγνωση: το μητρώο το αλλάζει όποιος «Διαχειρίζεται απόθεμα».
        </MutedNote>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ItemDetailsPanel item={item} />
        <ItemStatusPanel item={item} canManage={caps.canManage} />
        {caps.canManage && (
          <Panel label="Αλλαγή στοιχείων">
            <ItemForm
              categories={selectableCategories(categories, item.categoryId)}
              item={item}
            />
          </Panel>
        )}
        <Panel label="Πρότυπα">
          {item.templates.length === 0 ? (
            <MutedNote>Δεν είναι σε κανένα Πρότυπο.</MutedNote>
          ) : (
            <ul className="m-0 grid list-none gap-1 p-0 text-sm">
              {item.templates.map((template) => (
                <li key={template.id}>{template.name}</li>
              ))}
            </ul>
          )}
        </Panel>
        <ItemHistory lines={historyLines(item.history)} />
        {caps.canManage && (
          <ItemDangerPanel itemId={item.id} templates={item.templates} />
        )}
      </div>
    </>
  );
}
