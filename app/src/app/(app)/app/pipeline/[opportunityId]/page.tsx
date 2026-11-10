import { SpacesOpportunity } from "@/modules/sales";

export const metadata = { title: "Ευκαιρία" };

// B4 Ευκαιρία. Δεν υπάρχει καμία ενέργεια «κερδισμένη»: έρχεται μόνο με την υπογραφή της Συμφωνίας (ADR 0009).
export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  return <SpacesOpportunity opportunityId={opportunityId} />;
}
