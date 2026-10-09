import { Tabs } from "@/components/ui/segmented";

// Οι καρτέλες της σελίδας Ρυθμίσεων. Οι υπόλοιπες ενότητες (Γυρίσματα, Παραδοτέα) προστίθενται εδώ μαζί με το module τους, ώστε κάθε τιμή να έχει μία πηγή.
const TABS = [
  { id: "company", label: "Εταιρεία", href: "/app/settings/company" },
  { id: "sales", label: "Πωλήσεις", href: "/app/settings/sales" },
  { id: "agreements", label: "Συμφωνίες", href: "/app/settings/agreements" },
  { id: "finance", label: "Οικονομικά", href: "/app/settings/finance" },
  { id: "filming", label: "Γυρίσματα", href: "/app/settings/filming" },
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
