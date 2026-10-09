import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { getViewer } from "@/modules/access";
import {
  CategoryManager,
  EquipmentTable,
  MutedNote,
  NewItemDetails,
  equipmentCaps,
  listCategories,
  listItems,
  selectableCategories,
} from "@/modules/equipment";

import { LoadError, NoAccess } from "./equipment-parts";

export const metadata = { title: "Εξοπλισμός" };

const EYEBROW = "F1 · Εξοπλισμός";

const REGISTRY_NOTE = "Η Δέσμευση γίνεται στο Γύρισμα. Εδώ κρατάς το μητρώο.";
const READ_ONLY_NOTE =
  "Μόνο ανάγνωση: δεσμεύεις στα Γυρίσματά σου, όταν φτάσουν.";

// F1: το μητρώο του Εξοπλισμού. Τα αποσυρμένα κρύβονται αν δεν τα ζητήσεις με το φίλτρο Κατάστασης.
export default async function EquipmentPage() {
  const viewer = await getViewer();
  const caps = equipmentCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} eyebrow={EYEBROW} />;

  const [items, categories] = await Promise.all([
    listItems({ includeRetired: true }),
    listCategories({ includeRetired: true }),
  ]);
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Εξοπλισμός">
        {caps.canManage && (
          <NewItemDetails
            categories={
              categories.ok ? selectableCategories(categories.data) : []
            }
          />
        )}
      </ScreenHeader>
      {items.ok && categories.ok ? (
        <div className="grid gap-6">
          <MutedNote>
            {caps.canManage ? REGISTRY_NOTE : READ_ONLY_NOTE}
          </MutedNote>
          {items.data.length === 0 ? (
            <Notice kind="empty" title="Το μητρώο είναι άδειο">
              <p className="m-0">
                {caps.canManage
                  ? "Πρόσθεσε το πρώτο αντικείμενο με «Νέο αντικείμενο». Μέχρι τότε τα Γυρίσματα γίνονται κανονικά."
                  : "Δεν έχει καταχωρηθεί ακόμα Εξοπλισμός. Τον προσθέτει η Διαχείριση."}
              </p>
            </Notice>
          ) : (
            <EquipmentTable
              items={items.data}
              categories={selectableCategories(categories.data)}
            />
          )}
          {caps.canManage && categories.ok && (
            <CategoryManager categories={categories.data} />
          )}
        </div>
      ) : (
        <LoadError />
      )}
    </>
  );
}
