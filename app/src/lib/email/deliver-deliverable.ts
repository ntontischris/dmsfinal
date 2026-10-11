import { z } from "zod";

import { toLocale } from "./locale";
import type { EmailMessageBody } from "./templates/auth-messages";
import { deliverableVersionMessage } from "./templates/deliverable-messages";

// Το email «Νέα Έκδοση για έγκριση» (#142). Το payload γράφεται από τη ΒΔ (camelCase)·
// ό,τι δεν ταιριάζει δεν στέλνεται και η γραμμή κλείνει ως αποτυχημένη.

export const DELIVERABLE_KIND = "deliverable_version_sent";
const INVALID_PAYLOAD = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const deliverableVersionPayload = z.object({
  deliverableId: z.string().min(1),
  title: z.string(),
  production: z.string(),
  version: z.number().int().positive(),
  roundsUsed: z.number().int().nonnegative(),
  roundsLimit: z.number().int().nonnegative().nullish(),
});

export interface DeliverableRow {
  to_name: string;
  locale: string;
  payload: Record<string, unknown>;
}

export function deliverableMessageFor(
  row: DeliverableRow,
  origin: string,
): EmailMessageBody | string {
  const parsed = deliverableVersionPayload.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  return deliverableVersionMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    deliverableId: parsed.data.deliverableId,
    title: parsed.data.title,
    production: parsed.data.production,
    version: parsed.data.version,
    roundsUsed: parsed.data.roundsUsed,
    roundsLimit: parsed.data.roundsLimit ?? null,
  });
}
