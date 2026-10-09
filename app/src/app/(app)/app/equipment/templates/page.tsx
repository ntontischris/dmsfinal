import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import {
  MutedNote,
  TemplateList,
  equipmentCaps,
  listItems,
  listTemplates,
} from "@/modules/equipment";

import { LoadError, NoAccess } from "../equipment-parts";

export const metadata = { title: "Πρότυπα εξοπλισμού" };

const EYEBROW = "F3 · Πρότυπα εξοπλισμού";
const EDIT_NOTE =
  "Ένα Πρότυπο είναι μια λίστα αντικειμένων που θα δεσμεύεται με ένα κλικ σε Γύρισμα. Αντικείμενο σε επισκευή ή αποσυρμένο θα παραλείπεται.";
const READ_ONLY_NOTE =
  "Μόνο ανάγνωση: τα Πρότυπα τα φτιάχνει όποιος δεσμεύει εξοπλισμό ή διαχειρίζεται απόθεμα.";

// F3: τα Πρότυπα εξοπλισμού. Τα αποσυρμένα αντικείμενα μένουν μέσα, με το σήμα τους.
export default async function EquipmentTemplatesPage() {
  const viewer = await getViewer();
  const caps = equipmentCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} eyebrow={EYEBROW} />;

  const [templates, items] = await Promise.all([
    listTemplates(),
    listItems({ includeRetired: true }),
  ]);
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Πρότυπα εξοπλισμού" />
      {templates.ok && items.ok ? (
        <div className="grid gap-4">
          <MutedNote>
            {caps.canEditTemplates ? EDIT_NOTE : READ_ONLY_NOTE}
          </MutedNote>
          <TemplateList
            templates={templates.data}
            items={items.data}
            canEditTemplates={caps.canEditTemplates}
          />
        </div>
      ) : (
        <LoadError />
      )}
    </>
  );
}
