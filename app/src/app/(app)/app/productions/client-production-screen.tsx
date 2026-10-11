import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { clientCardsOf, listClientDeliverables } from "@/modules/deliverables";
import { ClientProductionView, type ProductionDetail } from "@/modules/productions";

import { LoadError } from "./productions-parts";

// G2 του Πελάτη: η Παραγωγή του Πελάτη με τα Παραδοτέα της, από την όψη πελάτη της βάσης.
export async function ClientProductionScreen({ production }: { production: ProductionDetail }) {
  const view = await listClientDeliverables();
  if (!view.ok) return <LoadError />;
  const cards = clientCardsOf(view.data, production.id);
  return (
    <>
      <ScreenHeader eyebrow="G2 · Παραγωγή" title={production.title}>
        <Link href="/app/productions" className={buttonVariants({ variant: "ghost" })}>
          ← Παραγωγές
        </Link>
      </ScreenHeader>
      <div className="mt-4">
        <ClientProductionView
          production={production}
          awaiting={cards.awaiting}
          deliverables={cards.all}
        />
      </div>
    </>
  );
}
