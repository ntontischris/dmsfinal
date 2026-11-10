import { SpacesReadiness } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Έλεγχος ετοιμότητας" };

// O7 Έλεγχος ετοιμότητας: τι λείπει πριν το σύστημα ανοίξει σε πελάτες.
export default async function ReadinessPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const { open } = await searchParams;
  return <SpacesReadiness isConfirming={open === "confirm"} />;
}
