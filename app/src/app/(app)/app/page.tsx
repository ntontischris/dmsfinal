import { SpacesFirstSteps } from "@/modules/access";
import { SpacesToday, TODAY_TITLE } from "@/modules/today";

export const metadata = { title: TODAY_TITLE };

// A1 Σήμερα: ό,τι με περιμένει, μία κάρτα για κάθε ουρά όπου έχω πρόσβαση. Φρέσκα σε κάθε άνοιγμα.
// Πάνω της, μέχρι να κλείσει, η κάρτα «Πρώτα βήματα» (a3, module access).
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { customize } = await searchParams;
  return (
    <>
      <SpacesFirstSteps />
      <SpacesToday isCustomizing={customize === "1"} />
    </>
  );
}
