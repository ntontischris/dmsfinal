import { z } from "zod";

import {
  MANAGE_TITLE,
  SpacesKnowledgeManage,
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
  const params = await searchParams;
  const section = z.uuid().safeParse(params.section);
  return (
    <SpacesKnowledgeManage
      tab={parseManageTab(params.tab)}
      status={parseStatusFilter(params.status)}
      sectionId={section.success ? section.data : null}
    />
  );
}
