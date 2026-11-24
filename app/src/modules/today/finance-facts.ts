import { z } from "zod";

// Τ8: τα σχήματα για τα χρήματα της Σήμερα, από τα ίδια RPC/κανόνες με τις κάρτες των Τιμολογίων.

const billablesTotalSchema = z.object({ total: z.number() });

// public.today_received: received null = ο θεατής δεν βλέπει ποσά.
const receivedSchema = z.object({
  month: z.string(),
  received: z.number().nullable(),
});

export type MonthReceived = z.output<typeof receivedSchema>;

export const parseBillablesTotal = (data: unknown): number =>
  billablesTotalSchema.parse(data).total;

export const parseMonthReceived = (data: unknown): MonthReceived =>
  receivedSchema.parse(data);

// Το «Μπήκαν» φαίνεται μόνο για τον μήνα των δεικτών (ίδια «σήμερα» Αθήνας· εδώ πιάνεται μια αλλαγή μήνα ανάμεσα στις δύο
// κλήσεις) και μόνο σε όποιον βλέπει ποσά.
export const receivedFor = (
  month: string,
  monthReceived: MonthReceived | null,
): number | null =>
  monthReceived && monthReceived.month === month ? monthReceived.received : null;
