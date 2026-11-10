import { SpacesFinanceSettings } from "@/modules/costs";

export const metadata = { title: "Ρυθμίσεις · Οικονομικά" };

// O6 Ρυθμίσεις › Οικονομικά (το μέρος του κόστους). Τη βλέπει όποιος «Βλέπει κόστος και κερδοφορία»·
// αλλάζει μόνο όποιος «Διαχειρίζεται κόστος».
export default function FinanceSettingsPage() {
  return <SpacesFinanceSettings />;
}
