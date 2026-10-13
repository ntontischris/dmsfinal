import { appOrigin } from "@/lib/app-origin";

// Άμεση προσπάθεια (Γ6): μετά από αποθήκευση, δημοσίευση, Κοινό ή Αρχείο, ο server action καλεί το cron route για το στοιχείο,
// με after() της Next (μετά την απάντηση στον χρήστη). Χωρίς item: ένας γύρος της ουράς (π.χ. μετά το «ξαναφτιάξε όλα»).
// Το cron κάθε λεπτού είναι το δίχτυ ασφαλείας.
export const KNOWLEDGE_INDEX_PATH = "/api/cron/knowledge-index";

export const kickPath = (itemId?: string): string =>
  `${KNOWLEDGE_INDEX_PATH}?${new URLSearchParams(itemId ? { item: itemId } : { kick: "1" }).toString()}`;

export async function kickKnowledgeIndex(
  itemId?: string,
  secret: string | undefined = process.env.CRON_SECRET,
): Promise<void> {
  if (!secret) return;
  await fetch(`${appOrigin()}${kickPath(itemId)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  }).catch(() => console.error("kickKnowledgeIndex", "το σκούντημα απέτυχε"));
}
