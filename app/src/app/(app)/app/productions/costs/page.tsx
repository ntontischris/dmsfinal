import { COST_TITLE, SpacesCosts } from "@/modules/costs";

export const metadata = { title: COST_TITLE };

// G3: κόστος και ώρες όλων των Παραγωγών, με την Παραγωγή στο ?production=· η βάση αποφασίζει τι βλέπεις.
export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { production } = await searchParams;
  return <SpacesCosts production={typeof production === "string" ? production : undefined} />;
}
