import { SpacesProductions } from "@/modules/productions";

export const metadata = { title: "Παραγωγές" };

// G1: οι Παραγωγές. Η καρτέλα και το «Εσωτερικές» είναι στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
export default async function ProductionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SpacesProductions query={await searchParams} />;
}
