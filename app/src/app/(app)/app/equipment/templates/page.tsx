import { SpacesEquipmentTemplates } from "@/modules/equipment";

export const metadata = { title: "Πρότυπα εξοπλισμού" };

// F3: τα Πρότυπα εξοπλισμού. Τα αποσυρμένα αντικείμενα μένουν μέσα, με το σήμα τους.
export default function EquipmentTemplatesPage() {
  return <SpacesEquipmentTemplates />;
}
