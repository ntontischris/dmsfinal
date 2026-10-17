import { getViewer } from "@/modules/access";
import { GDPR_TITLE, GdprScreen } from "@/modules/gdpr";

export const metadata = { title: GDPR_TITLE };

// N1 Αιτήματα GDPR: μόνο ο Ιδιοκτήτης. Η βάση αρνείται σε κάθε άλλον, και μέσα από τις συναρτήσεις.
export default async function GdprPage() {
  return <GdprScreen viewer={await getViewer()} />;
}
