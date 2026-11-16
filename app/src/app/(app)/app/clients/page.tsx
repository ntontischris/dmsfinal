import { SpacesClients, parseB1Filters } from "@/modules/sales";
import { isPickingClient } from "@/spaces/flows/flows";
import { parsePage } from "@/spaces/kit/pager-model";

export const metadata = { title: "Πελάτες" };

// B1: όλοι οι Πελάτες φαίνονται με όνομα και Υπεύθυνο· ανοίγουν μόνο όσοι αφορούν τον θεατή (αποφασίζει η βάση).
export default async function ClientsPage({
  searchParams,
}: {
  // Και ένα φίλτρο ανά στήλη (?city=, ?owner=, …) και η σελίδα (?page=).
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { q, new: newStamp, deleted } = params;
  // Στο βήμα «Για ποιον Πελάτη;» του οδηγού η λίστα είναι μέσα στον οδηγό· ο πίνακας θα έβγαζε από αυτόν.
  if (isPickingClient(params.job, params.step)) return null;
  return (
    <SpacesClients
      query={typeof q === "string" ? q.trim() : ""}
      filters={parseB1Filters(params)}
      page={parsePage(params.page)}
      newStamp={typeof newStamp === "string" ? newStamp : undefined}
      isDeleted={deleted === "1"}
    />
  );
}
