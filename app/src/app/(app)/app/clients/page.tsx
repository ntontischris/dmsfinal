import { SpacesClients, parseB1Filters } from "@/modules/sales";

export const metadata = { title: "Πελάτες" };

// B1: όλοι οι Πελάτες φαίνονται με όνομα και Υπεύθυνο· ανοίγουν μόνο όσοι αφορούν τον θεατή (αποφασίζει η βάση).
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    new?: string;
    deleted?: string;
    status?: string;
    noshoot?: string;
    package?: string;
  }>;
}) {
  const params = await searchParams;
  const { q, new: newStamp, deleted } = params;
  return (
    <SpacesClients
      query={typeof q === "string" ? q.trim() : ""}
      filters={parseB1Filters(params)}
      newStamp={typeof newStamp === "string" ? newStamp : undefined}
      isDeleted={deleted === "1"}
    />
  );
}
