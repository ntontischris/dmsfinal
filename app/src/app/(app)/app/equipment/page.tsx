import { SpacesEquipment } from "@/modules/equipment";

export const metadata = { title: "Εξοπλισμός" };

// F1: το μητρώο του Εξοπλισμού. Τα αποσυρμένα κρύβονται αν δεν τα ζητήσεις με το φίλτρο Κατάστασης.
export default function EquipmentPage() {
  return <SpacesEquipment />;
}
