import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  ItemScreen,
  LIBRARY_EYEBROW,
  LIBRARY_TITLE,
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  NOT_IN_AUDIENCE_TEXT,
  getItem,
} from "@/modules/knowledge";

export const metadata = { title: LIBRARY_TITLE };

interface KnowledgeItemPageProps {
  params: Promise<{ id: string }>;
}

// Ένα στοιχείο της Γνώσης (A8). Ανύπαρκτο, πρόχειρο ή εκτός Κοινού φαίνονται ίδια: «δεν ανήκει στο Κοινό σου».
export default async function KnowledgeItemPage({
  params,
}: KnowledgeItemPageProps) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);
  const isValid = z.uuid().safeParse(id).success;
  const result =
    viewer.status === "signed-in" && isValid ? await getItem(id) : null;
  if (result?.ok && result.data)
    return (
      <>
        <ScreenHeader eyebrow={LIBRARY_EYEBROW} title={result.data.title} />
        <ItemScreen item={result.data} />
      </>
    );
  return (
    <>
      <ScreenHeader eyebrow={LIBRARY_EYEBROW} title={LIBRARY_TITLE} />
      <p className="mt-0">
        <Link href="/app/knowledge">← Γνώση</Link>
      </p>
      {result?.ok === false ? (
        <Notice kind="error" title={LOAD_ERROR_TITLE}>
          <p className="m-0">{LOAD_ERROR_TEXT}</p>
        </Notice>
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NOT_IN_AUDIENCE_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
