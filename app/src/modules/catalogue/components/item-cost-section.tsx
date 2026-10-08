import type { CatalogueCaps, CatalogueItem, CostHint } from "../types";

import { CostSummary } from "./cost-summary";
import { ItemCostForm } from "./item-cost-form";

interface ItemCostSectionProps {
  item: CatalogueItem;
  hint: CostHint | null;
  caps: CatalogueCaps;
}

// Το περιεχόμενο του πάνελ «Κόστος και περιθώριο»: φόρμα ωρών/Άμεσου κόστους και η εκτίμηση από κάτω.
// Όποιος δεν βλέπει κόστος δεν παίρνει τίποτα (η βάση ούτως ή άλλως δεν του στέλνει τα νούμερα).
export function ItemCostSection({ item, hint, caps }: ItemCostSectionProps) {
  if (!caps.canSeeCost) return null;
  return (
    <div className="grid gap-4">
      <ItemCostForm item={item} caps={caps} />
      <CostSummary item={item} hint={hint} />
    </div>
  );
}
