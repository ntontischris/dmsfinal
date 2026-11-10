import { SpacesSystemMessages } from "@/modules/notifications";

export const metadata = { title: "Ρυθμίσεις · Μηνύματα συστήματος" };

// K2 Μηνύματα συστήματος (#173): πάντα ενεργά, αλλάζει μόνο το κείμενο. Μόνο όποιος «Διαχειρίζεται Αυτοματισμούς».
export default function SystemMessagesPage() {
  return <SpacesSystemMessages />;
}
