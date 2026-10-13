import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  ItemEditor,
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  MANAGE_EYEBROW,
  MANAGE_TITLE,
  NO_MANAGE_TEXT,
  getManageItem,
} from "@/modules/knowledge";

export const metadata = { title: MANAGE_TITLE };

interface EditPageProps {
  params: Promise<{ id: string }>;
}

// L1 επεξεργαστής στοιχείου: μόνο με «Διαχειρίζεται Γνώση».
export default async function KnowledgeEditPage({ params }: EditPageProps) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);
  const isValid = z.uuid().safeParse(id).success;
  const result =
    viewer.status === "signed-in" && isValid ? await getManageItem(id) : null;
  const item = result?.ok ? result.data?.item : null;
  if (result?.ok && result.data && item)
    return (
      <>
        <ScreenHeader eyebrow={MANAGE_EYEBROW} title={item.title} />
        <ItemEditor item={item} options={result.data} />
      </>
    );
  return (
    <>
      <ScreenHeader eyebrow={MANAGE_EYEBROW} title={MANAGE_TITLE} />
      <p className="mt-0">
        <Link href="/app/knowledge/manage">← Διαχείριση Γνώσης</Link>
      </p>
      {result?.ok === false ? (
        <Notice kind="error" title={LOAD_ERROR_TITLE}>
          <p className="m-0">{LOAD_ERROR_TEXT}</p>
        </Notice>
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_MANAGE_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
