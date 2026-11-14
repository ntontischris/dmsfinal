import Link from "next/link";

import { sectionHref } from "@/modules/knowledge";

import { getSalesSettings } from "../queries-settings";

// «Οδηγός πωλήσεων» (b15): η Ενότητα της Γνώσης που όρισε η Διαχείριση (Ρυθμίσεις › Πωλήσεις). Χωρίς Ενότητα,
// ή αν η ρύθμιση δεν διαβαστεί (η ανάγνωση καταγράφει το λάθος), ο σύνδεσμος απλώς δεν φαίνεται.
export async function GuideLink() {
  const settings = await getSalesSettings();
  if (!settings.ok || settings.data.guideSectionId === null) return null;
  return (
    <Link className="button" href={sectionHref(settings.data.guideSectionId)}>
      Οδηγός πωλήσεων →
    </Link>
  );
}
