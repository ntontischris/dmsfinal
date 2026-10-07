import { redirect } from "next/navigation";

// Οι Ρυθμίσεις ανοίγουν στην πρώτη καρτέλα.
export default function SettingsPage() {
  redirect("/app/settings/company");
}
