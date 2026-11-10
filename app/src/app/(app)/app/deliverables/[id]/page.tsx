import { z } from "zod";

import { getViewer, isClientViewer } from "@/modules/access";
import { SpacesClientDeliverable, SpacesDeliverable } from "@/modules/deliverables";

export const metadata = { title: "Παραδοτέο" };

// H2: ένα Παραδοτέο. Ό,τι δεν επιτρέπεται στον θεατή δεν εμφανίζεται· η βάση ξαναελέγχει κάθε ενέργεια.
// Ο Χρήστης πελάτη βλέπει την H4.
export default async function DeliverablePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const parsed = z.uuid().safeParse((await params).id);
  const id = parsed.success ? parsed.data : null;
  if (isClientViewer(viewer))
    return <SpacesClientDeliverable viewer={viewer} id={id} query={await searchParams} />;
  return <SpacesDeliverable id={id} query={await searchParams} />;
}
