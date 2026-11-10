import { SpacesMessageSettings } from "@/modules/messages";

export const metadata = { title: "Ρυθμίσεις · Μηνύματα" };

// Ρυθμίσεις › Μηνύματα: οι χρόνοι της Συνομιλίας. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default function MessageSettingsPage() {
  return <SpacesMessageSettings />;
}
