import { lookOf } from "@/components/shell/read-look";
import { getViewer } from "@/modules/access";
import { GDPR_TITLE, GdprScreen, SpacesGdpr } from "@/modules/gdpr";

export const metadata = { title: GDPR_TITLE };

// N1 Αιτήματα GDPR: μόνο ο Ιδιοκτήτης. Η βάση αρνείται σε κάθε άλλον, και μέσα από τις συναρτήσεις.
// Στη νέα εμφάνιση (Χώροι) η οθόνη στο ύφος του prototype· αλλιώς η σημερινή.
export default async function GdprPage({
  searchParams,
}: {
  searchParams: Promise<{ anonymize?: string }>;
}) {
  const viewer = await getViewer();
  if ((await lookOf(viewer)) === "spaces") {
    const { anonymize } = await searchParams;
    return (
      <SpacesGdpr
        viewer={viewer}
        anonymize={typeof anonymize === "string" ? anonymize : undefined}
      />
    );
  }
  return <GdprScreen viewer={viewer} />;
}
