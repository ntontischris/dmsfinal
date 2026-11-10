import { SpacesSystemMessage } from "@/modules/notifications";

export const metadata = { title: "Ρυθμίσεις · Μηνύματα συστήματος" };

interface SystemMessagePageProps {
  params: Promise<{ code: string }>;
}

// K2: ο editor ενός Μηνύματος συστήματος.
export default async function SystemMessagePage({
  params,
}: SystemMessagePageProps) {
  const { code } = await params;
  return <SpacesSystemMessage code={code} />;
}
