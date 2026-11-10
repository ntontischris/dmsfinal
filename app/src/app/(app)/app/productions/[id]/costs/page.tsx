import { redirect } from "next/navigation";
import { z } from "zod";

import { COST_TITLE } from "@/modules/costs";

export const metadata = { title: COST_TITLE };

// Η παλιά διεύθυνση του κόστους μιας Παραγωγής: το G3 ζει σε μία οθόνη με επιλογή Παραγωγής (εκεί και ο έλεγχος πρόσβασης).
export default async function ProductionCostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = z.uuid().safeParse((await params).id);
  redirect(parsed.success ? `/app/productions/costs?production=${parsed.data}` : "/app/productions/costs");
}
