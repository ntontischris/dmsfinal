import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { equipmentCaps } from "../caps";
import { listBookings, listCategories, listItems } from "../queries";
import { bookingIndexOf } from "./f1-bookings";
import { F1Registry } from "./f1-registry";

import "./f.css";

// F1 Εξοπλισμός στη νέα εμφάνιση (prototype `screens/F1.tsx`): το μητρώο, με τα αποσυρμένα κρυμμένα αν δεν ζητηθούν.
// Ό,τι αλλάζει το μητρώο φαίνεται μόνο σε όποιον «Διαχειρίζεται απόθεμα»· η βάση ξαναελέγχει κάθε ενέργεια.
export async function SpacesEquipment() {
  const caps = equipmentCaps(await getViewer());
  if (!caps.canView)
    return (
      <div data-spaces>
        <div className="f">
          <StateNotice kind="denied" title="Χωρίς δικαίωμα">
            <p>Τον Εξοπλισμό τον βλέπει όποιος «Βλέπει Εξοπλισμό».</p>
          </StateNotice>
        </div>
      </div>
    );
  const [items, categories, bookings] = await Promise.all([
    listItems({ includeRetired: true }),
    listCategories({ includeRetired: true }),
    listBookings(),
  ]);
  return (
    <div data-spaces>
      <div className="f">
        {items.ok && categories.ok ? (
          <F1Registry
            canManage={caps.canManage}
            items={items.data}
            categories={categories.data}
            bookings={bookingIndexOf(bookings.ok ? bookings.data : [])}
          />
        ) : (
          <ErrorNotice what="το μητρώο Εξοπλισμού" />
        )}
      </div>
    </div>
  );
}
