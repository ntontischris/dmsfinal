import { z } from "zod";

import { SpacesBlockedTime } from "@/modules/calendar";

export const metadata = { title: "Κλεισμένος χρόνος" };

// A6: επεξεργασία κλεισμένου χρόνου. Διαγραφή με επιβεβαίωση· μετατροπή σε Γύρισμα αν το επιτρέπει η βάση.
export default async function BlockedTimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsedId = z.uuid().safeParse((await params).id);
  return <SpacesBlockedTime id={parsedId.success ? parsedId.data : null} />;
}
