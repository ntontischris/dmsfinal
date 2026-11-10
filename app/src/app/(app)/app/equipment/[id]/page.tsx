import { SpacesEquipmentItem } from "@/modules/equipment";

export const metadata = { title: "Αντικείμενο Εξοπλισμού" };

// F2: ένα αντικείμενο του μητρώου. Τα πεδία είναι φόρμα μόνο για όποιον Διαχειρίζεται απόθεμα.
export default async function EquipmentItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SpacesEquipmentItem id={(await params).id} />;
}
