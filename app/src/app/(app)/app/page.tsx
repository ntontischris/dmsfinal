import { SpacesFirstSteps, getViewer } from "@/modules/access";
import { SpacesToday, TODAY_TITLE } from "@/modules/today";
import { FlowHome } from "@/spaces/flows/flow-home";

export const metadata = { title: TODAY_TITLE };

// A1 Σήμερα: ό,τι με περιμένει, μία κάρτα για κάθε ουρά όπου έχω πρόσβαση. Φρέσκα σε κάθε άνοιγμα.
// Πάνω της, μέχρι να κλείσει, η κάρτα «Πρώτα βήματα» (a3, module access).
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ customize }, viewer] = await Promise.all([searchParams, getViewer()]);
  // Prototype οδηγών (proto/flows): η ουρά και οι πόρτες της ομάδας πάνω από την ενημέρωση.
  const isTeam = viewer.status === "signed-in" && viewer.team !== null;
  return (
    <>
      <SpacesFirstSteps />
      {isTeam && <FlowHome />}
      <SpacesToday isCustomizing={customize === "1"} />
    </>
  );
}
