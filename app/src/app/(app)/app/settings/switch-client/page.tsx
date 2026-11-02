import { redirect } from "next/navigation";

import { lookOf } from "@/components/shell/read-look";
import { SpacesSwitchClient, getViewer } from "@/modules/access";

export const metadata = { title: "Εναλλαγή Πελάτη" };

// A4 Εναλλαγή Πελάτη: μόνο στη νέα εμφάνιση (Χώροι). Στην παλιά η εναλλαγή είναι ο επιλογέας Πελάτη της μπάρας.
export default async function SwitchClientPage() {
  const viewer = await getViewer();
  if ((await lookOf(viewer)) === "spaces")
    return <SpacesSwitchClient viewer={viewer} />;
  redirect("/app");
}
