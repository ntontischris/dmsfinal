import { z } from "zod";

import { toLocale } from "./locale";
import type { EmailMessageBody } from "./templates/auth-messages";
import { invoiceOverdueMessage } from "./templates/invoice-messages";

// Το email «Ληξιπρόθεσμο τιμολόγιο» (#153, Π14). Το payload γράφεται από τη ΒΔ (camelCase)· ό,τι δεν ταιριάζει δεν στέλνεται.
// Τα στοιχεία πληρωμής μπαίνουν μόνο αν υπάρχουν στο payload.

export const OVERDUE_KIND = "invoice_overdue";
const INVALID_PAYLOAD = "Μη έγκυρο περιεχόμενο ειδοποίησης";

const payloadSchema = z.object({
  invoiceId: z.string().min(1),
  number: z.string().min(1),
  dueDate: z.string().min(1),
  remaining: z.number(),
  payment: z.object({ holder: z.string(), bank: z.string(), iban: z.string() }).nullish(),
});

export interface OverdueRow {
  to_name: string;
  locale: string;
  payload: Record<string, unknown>;
}

export function overdueMessageFor(row: OverdueRow, origin: string): EmailMessageBody | string {
  const parsed = payloadSchema.safeParse(row.payload);
  if (!parsed.success) return INVALID_PAYLOAD;
  const { data } = parsed;
  return invoiceOverdueMessage({
    locale: toLocale(row.locale),
    origin,
    name: row.to_name,
    number: data.number,
    dueDate: data.dueDate,
    remaining: data.remaining,
    payment: data.payment ?? null,
  });
}
