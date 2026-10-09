import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import {
  NewInternalDetails,
  ProductionList,
  listFilterSchema,
  listOwnerCandidates,
  listProductions,
  productionsCaps,
  tabState,
} from "@/modules/productions";

import { LoadError, NoAccess } from "./productions-parts";

export const metadata = { title: "Παραγωγές" };

const EYEBROW = "G1 · Παραγωγές";
const DEFAULT_FILTER = { tab: "open", internal: false } as const;

// G1: οι Παραγωγές. Η καρτέλα και το «Εσωτερικές» είναι στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
export default async function ProductionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const caps = productionsCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} eyebrow={EYEBROW} />;

  const parsed = listFilterSchema.safeParse(await searchParams);
  const filter = parsed.success ? parsed.data : DEFAULT_FILTER;
  const [productions, candidates] = await Promise.all([
    listProductions({ state: tabState(filter.tab), internalOnly: filter.internal }),
    caps.canCreateInternal ? listOwnerCandidates() : null,
  ]);
  if (!productions.ok || (candidates !== null && !candidates.ok)) return <LoadError />;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Παραγωγές">
        {caps.canCreateInternal && (
          <NewInternalDetails candidates={candidates?.ok ? candidates.data : []} />
        )}
      </ScreenHeader>
      <ProductionList productions={productions.data} tab={filter.tab} internalOnly={filter.internal} />
    </>
  );
}
