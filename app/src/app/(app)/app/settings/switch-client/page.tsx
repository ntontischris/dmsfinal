import { SpacesSwitchClient, getViewer } from "@/modules/access";

export const metadata = { title: "Εναλλαγή Πελάτη" };

// A4 Εναλλαγή Πελάτη: ο Χρήστης πελάτη με πρόσβαση σε πολλούς Πελάτες διαλέγει με ποιον δουλεύει.
export default async function SwitchClientPage() {
  return <SpacesSwitchClient viewer={await getViewer()} />;
}
