import { getViewer } from "@/modules/access";
import { GDPR_TITLE, SpacesGdpr } from "@/modules/gdpr";

export const metadata = { title: GDPR_TITLE };

// N1 Αιτήματα GDPR: μόνο ο Ιδιοκτήτης. Η βάση αρνείται σε κάθε άλλον, και μέσα από τις συναρτήσεις.
export default async function GdprPage({
  searchParams,
}: {
  searchParams: Promise<{ anonymize?: string }>;
}) {
  const [viewer, { anonymize }] = await Promise.all([getViewer(), searchParams]);
  return (
    <SpacesGdpr
      viewer={viewer}
      anonymize={typeof anonymize === "string" ? anonymize : undefined}
    />
  );
}
