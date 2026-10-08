import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  PipelineBoard,
  athensToday,
  groupByStage,
  isForgotten,
  listPipeline,
  listSalesLists,
  salesCaps,
  type Opportunity,
  type SalesCaps,
} from "@/modules/sales";

export const metadata = { title: "Pipeline Ευκαιριών" };

const TITLE = "Pipeline Ευκαιριών";
const EYEBROW = "B3 · Πελάτες και Πωλήσεις";

function PipelineHeader({ caps }: { caps: SalesCaps }) {
  return (
    <ScreenHeader eyebrow={EYEBROW} title={TITLE}>
      {caps.canManageSettings && (
        <Link
          href="/app/settings/sales"
          className={buttonVariants({ variant: "ghost" })}
        >
          ⚙ Ρυθμίσεις
        </Link>
      )}
    </ScreenHeader>
  );
}

function ForgottenFilter({
  isFiltered,
  forgottenCount,
}: {
  isFiltered: boolean;
  forgottenCount: number;
}) {
  return (
    <Segmented
      label="Φίλτρο Ευκαιριών"
      options={[
        { label: "Όλες", href: "/app/pipeline", isCurrent: !isFiltered },
        {
          label: "Μόνο ξεχασμένες (πέρασε το Επόμενο βήμα)",
          href: "/app/pipeline?forgotten=1",
          isCurrent: isFiltered,
          count: forgottenCount,
        },
      ]}
    />
  );
}

// Το φίλτρο «ξεχασμένες» δεν βρήκε τίποτα: μήνυμα αντί για άδειες στήλες.
function NoForgotten() {
  return (
    <Notice kind="empty" title="Καμία ξεχασμένη Ευκαιρία">
      <p className="m-0">Όλα τα Επόμενα βήματα είναι στην ώρα τους.</p>
    </Notice>
  );
}

// Ο Υπεύθυνος της Ευκαιρίας και όποιος διαχειρίζεται όλους τους Πελάτες τη δουλεύουν· οι υπόλοιποι την βλέπουν μόνο.
const canWorkOn = (caps: SalesCaps, o: Opportunity): boolean =>
  caps.manageScope === "all" ||
  (caps.userId !== null && o.managerId === caps.userId);

async function PipelineBody({
  caps,
  isFiltered,
}: {
  caps: SalesCaps;
  isFiltered: boolean;
}) {
  const [pipeline, lists] = await Promise.all([
    listPipeline(),
    listSalesLists(),
  ]);
  if (!pipeline.ok || !lists.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσε το Pipeline">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );

  const today = athensToday();
  const { open, closed } = pipeline.data;
  if (open.length === 0 && closed.length === 0)
    return (
      <Notice kind="empty" title="Δεν υπάρχουν ανοιχτές Ευκαιρίες">
        <p className="m-0">
          Μια Ευκαιρία γεννιέται από τη φόρμα της Ιστοσελίδας ή όταν την
          καταχωρείς εσύ.
        </p>
      </Notice>
    );

  const forgotten = open.filter((o) => isForgotten(o, today));
  const shown = isFiltered ? forgotten : open;
  return (
    <div className="grid gap-4">
      <ForgottenFilter
        isFiltered={isFiltered}
        forgottenCount={forgotten.length}
      />
      {isFiltered && shown.length === 0 ? (
        <NoForgotten />
      ) : (
        <PipelineBoard
          columns={groupByStage(lists.data.stages, shown)}
          closed={closed}
          lists={lists.data}
          today={today}
          canWork={(o) => canWorkOn(caps, o)}
        />
      )}
    </div>
  );
}

// B3 Pipeline Ευκαιριών: οι ανοιχτές Ευκαιρίες ανά Στάδιο και οι πρόσφατα κλεισμένες. Τη σελίδα τη βλέπει όποιος «Διαχειρίζεται Πελάτες».
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ forgotten?: string }>;
}) {
  const { forgotten } = await searchParams;
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canManage)
    return (
      <>
        <ScreenHeader eyebrow={EYEBROW} title={TITLE} />
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Το Pipeline το βλέπει όποιος «Διαχειρίζεται Πελάτες και Ευκαιρίες».
          </p>
        </AccessNotice>
      </>
    );

  return (
    <>
      <PipelineHeader caps={caps} />
      <PipelineBody caps={caps} isFiltered={forgotten === "1"} />
    </>
  );
}
