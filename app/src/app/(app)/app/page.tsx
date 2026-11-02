import { lookOf } from "@/components/shell/read-look";
import { getViewer } from "@/modules/access";
import { SpacesToday, TODAY_TITLE, TodayScreen } from "@/modules/today";

export const metadata = { title: TODAY_TITLE };

// A1 Σήμερα: ό,τι με περιμένει, μία κάρτα για κάθε ουρά όπου έχω πρόσβαση. Φρέσκα σε κάθε άνοιγμα.
// Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ customize }, look] = await Promise.all([searchParams, getViewer().then(lookOf)]);
  if (look === "spaces") return <SpacesToday isCustomizing={customize === "1"} />;
  return <TodayScreen isCustomizing={customize === "1"} />;
}
