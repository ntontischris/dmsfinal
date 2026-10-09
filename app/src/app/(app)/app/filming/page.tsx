import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/modules/access";
import {
  FilmingList,
  filmingCaps,
  listFilmings,
  listFilterSchema,
} from "@/modules/filming";

import { LoadError, NoAccess } from "./filming-parts";

export const metadata = { title: "Γυρίσματα" };

const EYEBROW = "E1 · Γυρίσματα";

// E1: τα Γυρίσματα. Η καρτέλα είναι στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
export default async function FilmingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canView)
    return (
      <NoAccess
        viewer={viewer}
        eyebrow={EYEBROW}
        message="Τα Γυρίσματα τα βλέπει όποιος «Βλέπει Γυρίσματα»."
      />
    );

  const { tab } = listFilterSchema.parse(await searchParams);
  const rows = await listFilmings(tab);
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Γυρίσματα">
        {caps.canApprove && (
          <Link href="/app/filming/queue" className={buttonVariants({ variant: "ghost" })}>
            Ουρά έγκρισης
          </Link>
        )}
        {caps.canBook && (
          <Link href="/app/filming/new" className={buttonVariants({ variant: "primary" })}>
            Νέο Γύρισμα
          </Link>
        )}
      </ScreenHeader>
      {rows.ok ? <FilmingList rows={rows.data} tab={tab} /> : <LoadError />}
    </>
  );
}
