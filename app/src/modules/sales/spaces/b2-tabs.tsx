import {
  STATE_LABELS as PRODUCTION_STATE_LABELS,
  listProductions,
  periodLabel,
} from "@/modules/productions";
import { ErrorNotice } from "@/spaces/screens/shared";

import { ProductionsSection } from "./b2-sections";

// Οι καρτέλες της B2 που φορτώνουν δικά τους δεδομένα μόνο όταν ανοίγουν.

// Η ανάγνωση των Παραγωγών δεν φιλτράρει ανά Πελάτη· κρατάμε του Πελάτη εδώ (λίγες Παραγωγές συνολικά).
export async function ProductionsTab({ clientId }: { clientId: string }) {
  const productions = await listProductions({
    state: null,
    internalOnly: false,
  });
  if (!productions.ok) return <ErrorNotice what="οι Παραγωγές του Πελάτη" />;
  const rows = productions.data
    .filter((production) => production.client?.id === clientId)
    .map((production) => ({
      id: production.id,
      title: production.title,
      sub: [
        production.period
          ? `Περίοδος ${periodLabel(production.period.starts)}`
          : "Εφάπαξ",
        production.owner
          ? `Υπεύθυνος: ${production.owner.name}`
          : "Χωρίς υπεύθυνο",
      ].join(" · "),
      state: PRODUCTION_STATE_LABELS[production.state],
      isOpen: production.state === "open",
    }));
  return <ProductionsSection rows={rows} />;
}
