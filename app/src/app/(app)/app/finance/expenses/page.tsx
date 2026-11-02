import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import { SpacesExpenses } from "@/modules/costs";

export const metadata = { title: "Έξοδα και Κόστος ώρας" };

// I6 Έξοδα και Κόστος ώρας: μόνο στη νέα εμφάνιση (Χώροι). Η παλιά δείχνει μια σύντομη ένδειξη.
export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const query = await searchParams;
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesExpenses
        month={typeof query.month === "string" ? query.month : undefined}
      />
    );
  return (
    <>
      <ScreenHeader eyebrow="I6 · Οικονομικά" title="Έξοδα και Κόστος ώρας" />
      <p className="m-0 mt-4 text-sm text-muted-foreground">
        Διαθέσιμο στη Νέα εμφάνιση.
      </p>
    </>
  );
}
