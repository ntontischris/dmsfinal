import { SpacesNewCatalogueItem } from "@/modules/catalogue";

export const metadata = { title: "Νέο στοιχείο Καταλόγου" };

// C2 (νέο): γράφει όποιος Διαχειρίζεται Κατάλογο. Η βάση ελέγχει ξανά τα Δικαιώματα σε κάθε εγγραφή.
export default async function NewCatalogueItemPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  return <SpacesNewCatalogueItem type={(await searchParams).type} />;
}
