import { SpacesDeliverableSettings } from "@/modules/deliverables";

export const metadata = { title: "Ρυθμίσεις · Παραδοτέα" };

// Ρυθμίσεις › Παραδοτέα (O5): οι Κανόνες Παραδοτέων. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default function DeliverableSettingsPage() {
  return <SpacesDeliverableSettings />;
}
