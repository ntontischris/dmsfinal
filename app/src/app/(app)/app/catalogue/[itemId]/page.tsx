import { SpacesCatalogueItem } from "@/modules/catalogue";

export const metadata = { title: "Στοιχείο Καταλόγου" };

// C2: το Πακέτο ή η Υπηρεσία. Κάθε πεδίο είναι πεδίο για όποιον μπορεί να το αλλάξει και κείμενο για τους άλλους.
export default async function CatalogueItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  return <SpacesCatalogueItem itemId={(await params).itemId} />;
}
