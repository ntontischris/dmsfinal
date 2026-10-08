import { Tabs } from "@/components/ui/segmented";

// Οι καρτέλες της σελίδας Ρυθμίσεων. Οι υπόλοιπες ενότητες (Συμφωνίες, Γυρίσματα, Παραδοτέα,
// Οικονομικά) προστίθενται εδώ μαζί με το module τους, ώστε κάθε τιμή να έχει μία πηγή.
const TABS = [
  { id: "company", label: "Εταιρεία", href: "/app/settings/company" },
  { id: "sales", label: "Πωλήσεις", href: "/app/settings/sales" },
  {
    id: "readiness",
    label: "Έλεγχος ετοιμότητας",
    href: "/app/settings/readiness",
  },
] as const;

export type SettingsTab = (typeof TABS)[number]["id"];

export function SettingsTabs({ current }: { current: SettingsTab }) {
  return (
    <Tabs
      label="Ενότητες Ρυθμίσεων"
      options={TABS.map((tab) => ({
        label: tab.label,
        href: tab.href,
        isCurrent: tab.id === current,
      }))}
    />
  );
}
