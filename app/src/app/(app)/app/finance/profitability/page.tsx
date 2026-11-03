import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import { SpacesProfitability } from "@/modules/costs";

export const metadata = { title: "Κερδοφορία" };

// I7 Κερδοφορία: μόνο στη νέα εμφάνιση (Χώροι). Η παλιά δείχνει μια σύντομη ένδειξη.
export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const query = await searchParams;
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesProfitability
        view={typeof query.view === "string" ? query.view : undefined}
      />
    );
  return (
    <>
      <ScreenHeader eyebrow="I7 · Οικονομικά" title="Κερδοφορία" />
      <p className="m-0 mt-4 text-sm text-muted-foreground">
        Διαθέσιμο στη Νέα εμφάνιση.
      </p>
    </>
  );
}
