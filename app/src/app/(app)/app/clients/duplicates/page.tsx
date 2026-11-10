import { SpacesDuplicates } from "@/modules/sales";

export const metadata = { title: "Πιθανά διπλά" };

// B6: μόνο όποιος «Συγχωνεύει Πελάτες» βλέπει τα ζευγάρια (η βάση επιστρέφει κενό στους άλλους).
export default function DuplicatesPage() {
  return <SpacesDuplicates />;
}
