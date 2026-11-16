import {
  SpacesFilmings,
  boardParamsSchema,
  listFilterSchema,
} from "@/modules/filming";

export const metadata = { title: "Γυρίσματα" };

// E1: τα Γυρίσματα. Η όψη (Πίνακας/Λίστα), η καρτέλα και τα φίλτρα είναι στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
export default async function FilmingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { tab } = listFilterSchema.parse(params);
  return <SpacesFilmings tab={tab} board={boardParamsSchema.parse(params)} />;
}
