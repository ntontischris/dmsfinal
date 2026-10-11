import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { AccessNotice, can, type Viewer } from "@/modules/access";
import {
  ClientDetailView,
  ClientQueueView,
  getClientDeliverable,
  listClientDeliverables,
} from "@/modules/deliverables";

import { LoadError, Missing } from "./page-parts";

// Η όψη του Χρήστη πελάτη για τα Παραδοτέα: H3 (λίστα) και H4 (σελίδα). Το route είναι το ίδιο με της ομάδας.

const QUEUE_EYEBROW = "H3 · Παραδοτέα";
const DETAIL_EYEBROW = "H4 · Παραδοτέο";

function ClientNoAccess({ viewer, eyebrow }: { viewer: Viewer; eyebrow: string }) {
  return (
    <>
      <ScreenHeader eyebrow={eyebrow} title="Παραδοτέα" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">Τα Παραδοτέα των Παραγωγών σου τα βλέπει όποιος έχει πρόσβαση στις Παραγωγές.</p>
      </AccessNotice>
    </>
  );
}

export async function ClientQueueScreen({ viewer }: { viewer: Viewer }) {
  if (!can(viewer, "c.productions")) return <ClientNoAccess viewer={viewer} eyebrow={QUEUE_EYEBROW} />;
  const result = await listClientDeliverables();
  return (
    <>
      <ScreenHeader eyebrow={QUEUE_EYEBROW} title="Παραδοτέα" />
      <div className="mt-4">{result.ok ? <ClientQueueView view={result.data} /> : <LoadError />}</div>
    </>
  );
}

export async function ClientDetailScreen({ viewer, id }: { viewer: Viewer; id: string }) {
  if (!can(viewer, "c.productions")) return <ClientNoAccess viewer={viewer} eyebrow={DETAIL_EYEBROW} />;
  const result = await getClientDeliverable(id);
  if (!result.ok) return <LoadError />;
  if (result.data === null) return <Missing />;
  return (
    <>
      <ScreenHeader eyebrow={DETAIL_EYEBROW} title={result.data.title}>
        <Link href="/app/deliverables" className={buttonVariants({ variant: "ghost" })}>
          ← Παραδοτέα
        </Link>
      </ScreenHeader>
      <div className="mt-4">
        <ClientDetailView detail={result.data} />
      </div>
    </>
  );
}
