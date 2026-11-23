import { SpacesCatalogue } from "@/modules/catalogue";
import { WithClientsDeck } from "@/modules/sales";

export const metadata = { title: "Κατάλογος" };

// C1: η λίστα Πακέτων και Υπηρεσιών. Τα ποσά που ο θεατής δεν δικαιούται δεν φτάνουν ποτέ εδώ: η βάση στέλνει null.
export default function CataloguePage() {
  return (
    <WithClientsDeck active="C1">
      <SpacesCatalogue />
    </WithClientsDeck>
  );
}
