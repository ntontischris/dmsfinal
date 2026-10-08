import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  NewItemForm,
  catalogueCaps,
  listProvisionKinds,
} from "@/modules/catalogue";

export const metadata = { title: "Νέο στοιχείο Καταλόγου" };

const EYEBROW = "C2 · Κατάλογος";

function BackLink() {
  return (
    <Link
      href="/app/catalogue"
      className={buttonVariants({ variant: "ghost" })}
    >
      ← Κατάλογος
    </Link>
  );
}

// Οτιδήποτε άλλο εκτός από «service» θεωρείται Πακέτο (μηνιαίο προεπιλεγμένο).
const isServiceType = (type: string | undefined): boolean => type === "service";

// C2 (νέο): γράφει όποιος Διαχειρίζεται Κατάλογο. Η βάση ελέγχει ξανά τα Δικαιώματα σε κάθε εγγραφή.
export default async function NewCatalogueItemPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const viewer = await getViewer();
  const caps = catalogueCaps(viewer);
  if (!caps.canManage)
    return (
      <>
        <ScreenHeader eyebrow={EYEBROW} title="Νέο στοιχείο" />
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Στον Κατάλογο γράφει όποιος «Διαχειρίζεται Κατάλογο».
          </p>
        </AccessNotice>
      </>
    );

  const [{ type }, kinds] = await Promise.all([
    searchParams,
    listProvisionKinds(),
  ]);
  const isService = isServiceType(type);

  return (
    <>
      <ScreenHeader
        eyebrow={EYEBROW}
        title={isService ? "Νέα Υπηρεσία" : "Νέο Πακέτο"}
      >
        <BackLink />
      </ScreenHeader>
      {!kinds.ok ? (
        <Notice kind="error" title="Δεν φόρτωσαν τα είδη Παροχής">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      ) : (
        <div className="max-w-2xl">
          <Panel label="Στοιχεία">
            <NewItemForm
              kinds={kinds.data}
              canEditPrice={caps.canEditPrice}
              initialType={isService ? "service" : "package_monthly"}
            />
          </Panel>
        </div>
      )}
    </>
  );
}
