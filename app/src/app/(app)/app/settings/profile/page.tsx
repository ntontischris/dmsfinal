import { redirect } from "next/navigation";

import { lookOf } from "@/components/shell/read-look";
import { getViewer } from "@/modules/access";
import { SpacesProfile } from "@/modules/settings";

export const metadata = { title: "Προφίλ και προτιμήσεις" };

// A3 Προφίλ και προτιμήσεις: μόνο στη νέα εμφάνιση (Χώροι). Στην παλιά τα ίδια ζουν σκόρπια: γλώσσα στις Ειδοποιήσεις,
// σύνδεσμος ημερολογίου στο Ημερολόγιο, θέμα στη μπάρα· η σελίδα στέλνει στις Προτιμήσεις Ειδοποιήσεων.
export default async function ProfilePage() {
  const viewer = await getViewer();
  if ((await lookOf(viewer)) === "spaces") return <SpacesProfile />;
  redirect("/app/notifications?tab=prefs");
}
