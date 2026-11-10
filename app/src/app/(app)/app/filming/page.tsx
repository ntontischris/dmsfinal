import { SpacesFilmings, listFilterSchema } from "@/modules/filming";

export const metadata = { title: "Γυρίσματα" };

// E1: τα Γυρίσματα. Η καρτέλα είναι στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
export default async function FilmingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab } = listFilterSchema.parse(await searchParams);
  return <SpacesFilmings tab={tab} />;
}
