import { z } from "zod";

import { getViewer } from "@/modules/access";
import {
  catalogueCaps,
  getCatalogueItem,
  getCostHint,
  listProvisionKinds,
} from "@/modules/catalogue";
import { getCompany } from "@/modules/settings";

import {
  ItemHeader,
  ItemPanels,
  LoadError,
  Missing,
  NoAccess,
} from "./page-parts";

export const metadata = { title: "Στοιχείο Καταλόγου" };

// C2: το Πακέτο ή η Υπηρεσία. Κάθε πεδίο είναι πεδίο για όποιον μπορεί να το αλλάξει και κείμενο για τους άλλους.
export default async function CatalogueItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const viewer = await getViewer();
  const caps = catalogueCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} />;

  const { itemId } = await params;
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return <Missing />;

  const [item, kinds, hint, company] = await Promise.all([
    getCatalogueItem(id.data),
    listProvisionKinds(),
    caps.canSeeCost ? getCostHint() : null,
    caps.canSeePrice ? getCompany() : null,
  ]);
  if (!item.ok || !kinds.ok || (hint !== null && !hint.ok))
    return <LoadError />;
  if (item.data === null) return <Missing />;

  // Αν δεν διαβαστεί ο ΦΠΑ, λείπει μόνο η υπόδειξη «Με ΦΠΑ».
  const vatRate = company?.ok ? company.data.vat_rate : null;
  return (
    <>
      <ItemHeader item={item.data} caps={caps} />
      <ItemPanels
        item={item.data}
        kinds={kinds.data}
        hint={hint === null ? null : hint.data}
        vatRate={vatRate}
        caps={caps}
      />
    </>
  );
}
