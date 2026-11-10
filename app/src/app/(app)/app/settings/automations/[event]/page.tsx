import { SpacesAutomationEvent } from "@/modules/notifications";

export const metadata = { title: "Ρυθμίσεις · Αυτοματισμοί" };

interface EventPageProps {
  params: Promise<{ event: string }>;
}

// K1: η σελίδα ενός Γεγονότος με τους Αυτοματισμούς του (και τις Αργίες στο «Αργία»).
export default async function AutomationEventPage({ params }: EventPageProps) {
  const { event } = await params;
  return <SpacesAutomationEvent code={decodeURIComponent(event)} />;
}
