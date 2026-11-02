import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { equipmentCaps } from "../caps";
import { listItems, listTemplates } from "../queries";
import { F3Templates } from "./f3-templates";

import "./f.css";

// F3 Πρότυπα εξοπλισμού στη νέα εμφάνιση (prototype `screens/F3.tsx`). Κοινά για όλη την ομάδα· τα αποσυρμένα
// αντικείμενα μένουν μέσα, με το σήμα τους.
export async function SpacesEquipmentTemplates() {
  const caps = equipmentCaps(await getViewer());
  if (!caps.canView)
    return (
      <div data-spaces>
        <div className="e">
          <StateNotice kind="denied" title="Χωρίς δικαίωμα">
            <p>Τα Πρότυπα εξοπλισμού τα βλέπει όποιος «Βλέπει Εξοπλισμό».</p>
          </StateNotice>
        </div>
      </div>
    );
  const [templates, items] = await Promise.all([
    listTemplates(),
    listItems({ includeRetired: true }),
  ]);
  return (
    <div data-spaces>
      <div className="e">
        {templates.ok && items.ok ? (
          <F3Templates
            templates={templates.data}
            items={items.data}
            canEdit={caps.canEditTemplates}
          />
        ) : (
          <ErrorNotice what="τα Πρότυπα εξοπλισμού" />
        )}
      </div>
    </div>
  );
}
