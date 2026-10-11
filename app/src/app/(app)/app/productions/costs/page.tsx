import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/modules/access";
import {
  COST_TITLE,
  CostGroupTabs,
  CostList,
  CostLoadError,
  CostNoAccess,
  GROUP_LABELS,
  costsCaps,
  listCostRows,
  parseCostGroup,
  type CostGroup,
} from "@/modules/costs";

export const metadata = { title: COST_TITLE };

const EYEBROW = "G3 · Κόστος και ώρες";

const EMPTY_TEXT: Readonly<Record<CostGroup, string>> = {
  needs_hours: "Καμία Παραγωγή δεν περιμένει πραγματικές ώρες.",
  overrun: "Καμία Παραγωγή δεν έχει υπέρβαση.",
  rest: "Καμία άλλη Παραγωγή σε αυτή την ομάδα.",
};

// G3: κόστος και ώρες όλων των Παραγωγών, σε τρεις ομάδες. Η ομάδα ζει στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (!costsCaps(viewer).canView) return <CostNoAccess viewer={viewer} eyebrow={EYEBROW} />;

  const group = parseCostGroup((await searchParams).group);
  const rows = await listCostRows(group);
  if (!rows.ok) return <CostLoadError />;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={COST_TITLE}>
        <Link href="/app/productions" className={buttonVariants({ variant: "ghost" })}>
          ← Παραγωγές
        </Link>
      </ScreenHeader>
      <div className="mt-4 grid gap-4">
        <CostGroupTabs group={group} />
        <CostList rows={rows.data} emptyText={EMPTY_TEXT[group]} />
        <p className="m-0 text-sm text-muted-foreground">
          {GROUP_LABELS[group]}: τα σήματα είναι ενδείξεις και δεν κλειδώνουν τίποτα.
        </p>
      </div>
    </>
  );
}
