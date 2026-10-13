import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  MANAGE_EYEBROW,
  MANAGE_TITLE,
  ManageScreen,
  NO_MANAGE_TEXT,
  getManageList,
  getOpenUnansweredCount,
  parseManageTab,
  parseStatusFilter,
} from "@/modules/knowledge";

export const metadata = { title: MANAGE_TITLE };

interface ManagePageProps {
  searchParams: Promise<{ tab?: string; status?: string; section?: string }>;
}

// L1 Διαχείριση Γνώσης: μόνο με «Διαχειρίζεται Γνώση». Φίλτρα κατάστασης και Ενότητας στη διεύθυνση.
export default async function KnowledgeManagePage({
  searchParams,
}: ManagePageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const status = parseStatusFilter(params.status);
  const section = z.uuid().safeParse(params.section);
  const sectionId = section.success ? section.data : null;
  const [result, openUnanswered] =
    viewer.status === "signed-in"
      ? await Promise.all([
          getManageList(status, sectionId),
          getOpenUnansweredCount(),
        ])
      : [null, null];
  return (
    <>
      <ScreenHeader eyebrow={MANAGE_EYEBROW} title={MANAGE_TITLE} />
      {result?.ok === false ? (
        <Notice kind="error" title={LOAD_ERROR_TITLE}>
          <p className="m-0">{LOAD_ERROR_TEXT}</p>
        </Notice>
      ) : result?.data ? (
        <ManageScreen
          list={result.data}
          tab={parseManageTab(params.tab)}
          status={status}
          sectionId={sectionId}
          openUnanswered={openUnanswered}
          canManageSettings={can(viewer, "settings.manage")}
        />
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_MANAGE_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
