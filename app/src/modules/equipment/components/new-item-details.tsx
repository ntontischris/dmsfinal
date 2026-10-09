import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

import type { EquipmentCategory } from "../types";

import { ItemForm } from "./item-form";

interface NewItemDetailsProps {
  categories: readonly EquipmentCategory[];
}

// «Νέο αντικείμενο» κλειστό από προεπιλογή: η φόρμα ανοίγει με το κουμπί, χωρίς κατάσταση στον browser.
export function NewItemDetails({ categories }: NewItemDetailsProps) {
  return (
    <details className="group">
      <summary
        className={cn(
          buttonVariants({ variant: "primary" }),
          "cursor-pointer list-none",
        )}
      >
        Νέο αντικείμενο
      </summary>
      <div className="mt-3 w-full max-w-xl">
        <Panel label="Στοιχεία νέου αντικειμένου">
          <ItemForm categories={categories} />
        </Panel>
      </div>
    </details>
  );
}
