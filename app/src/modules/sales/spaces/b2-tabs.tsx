import {
  STATE_LABELS as PRODUCTION_STATE_LABELS,
  listProductions,
  periodLabel,
} from "@/modules/productions";
import { ErrorNotice } from "@/spaces/screens/shared";

import { Box } from "./b2-box";
import { ProductionLines } from "./b2-sections";

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
  const openCount = rows.filter((row) => row.isOpen).length;
  // Μόνο αυτό το κουτί στην καρτέλα: ανοιχτό, αφού ο Χρήστης ήρθε γι' αυτό.
  return (
    <div className="ml-stack">
      <Box
        title="Παραγωγές"
        hint={`${rows.length} Παραγωγές · ${openCount} ανοιχτές`}
        isOpen
      >
        <ProductionLines rows={rows} />
      </Box>
    </div>
  );
}
