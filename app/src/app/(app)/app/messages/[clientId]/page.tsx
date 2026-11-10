import { z } from "zod";

import { SpacesThread, parseFilter, parseProduction } from "@/modules/messages";

export const metadata = { title: "Συνομιλία" };

interface ThreadPageProps {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ production?: string; filter?: string }>;
}

// J2: η Συνομιλία ενός Πελάτη (?production= ετικέτα και προεπιλογή του συντάκτη, ?filter=untagged|internal).
// Μόνο για την ομάδα· η οθόνη δείχνει την άρνηση σε όποιον δεν έχει «Συνομιλεί με πελάτη».
export default async function ThreadPage({
  params,
  searchParams,
}: ThreadPageProps) {
  const [{ clientId }, query] = await Promise.all([params, searchParams]);
  const parsed = z.uuid().safeParse(clientId);
  return (
    <SpacesThread
      clientId={parsed.success ? parsed.data : undefined}
      filters={{
        filter: parseFilter(query.filter),
        production: parseProduction(query.production),
      }}
    />
  );
}
