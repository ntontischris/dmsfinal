import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/modules/access";
import {
  COST_TITLE,
  CostLoadError,
  CostMissing,
  CostNoAccess,
  CostSummary,
  EstimateForm,
  HoursForm,
  costsCaps,
  getCostDetail,
  isInternalCost,
} from "@/modules/costs";

export const metadata = { title: COST_TITLE };

const EYEBROW = "G3 · Κόστος και ώρες";

// Η φόρμα ωρών μιας Παραγωγής. Όποιος δεν «Διαχειρίζεται κόστος» βλέπει μόνο τα νούμερα· η βάση ξαναελέγχει κάθε εγγραφή.
export default async function ProductionCostsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!costsCaps(viewer).canView) return <CostNoAccess viewer={viewer} eyebrow={EYEBROW} />;

  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return <CostMissing eyebrow={EYEBROW} />;

  const detail = await getCostDetail(parsed.data);
  if (!detail.ok) return <CostLoadError />;
  if (detail.data === null) return <CostMissing eyebrow={EYEBROW} />;
  const row = detail.data;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={row.title}>
        <Link href={`/app/productions/${row.productionId}`} className={buttonVariants({ variant: "ghost" })}>
          ← Παραγωγή
        </Link>
      </ScreenHeader>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <CostSummary row={row} />
        {row.canEdit ? (
          <HoursForm row={row} />
        ) : (
          <p className="m-0 text-sm text-muted-foreground">
            Μόνο ανάγνωση: τις ώρες και το κόστος τα γράφει όποιος «Διαχειρίζεται κόστος».
          </p>
        )}
        {row.canEdit && isInternalCost(row) && <EstimateForm row={row} />}
      </div>
    </>
  );
}
