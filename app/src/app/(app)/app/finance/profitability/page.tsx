import { SpacesProfitability } from "@/modules/costs";

export const metadata = { title: "Κερδοφορία" };

// I7 Κερδοφορία (Χώροι).
export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <SpacesProfitability
      view={typeof query.view === "string" ? query.view : undefined}
    />
  );
}
