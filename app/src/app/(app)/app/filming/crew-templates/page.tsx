import { SpacesCrewTemplates } from "@/modules/filming";

export const metadata = { title: "Πρότυπα Συνεργείου" };

// E7: τα Πρότυπα Συνεργείου. Τα βλέπει και τα αλλάζει όποιος «Διαχειρίζεται Συνεργείο».
export default function CrewTemplatesPage() {
  return <SpacesCrewTemplates />;
}
