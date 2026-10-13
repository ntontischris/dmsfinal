import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer, isClientViewer } from "@/modules/access";
import {
  LIBRARY_EYEBROW,
  LIBRARY_TITLE,
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  LibraryScreen,
  NO_ACCOUNT_TEXT,
  SearchScreen,
  getLibrary,
  parseQuery,
  searchKnowledge,
} from "@/modules/knowledge";

export const metadata = { title: LIBRARY_TITLE };

interface KnowledgePageProps {
  searchParams: Promise<{ q?: string }>;
}

function ErrorNotice() {
  return (
    <Notice kind="error" title={LOAD_ERROR_TITLE}>
      <p className="m-0">{LOAD_ERROR_TEXT}</p>
    </Notice>
  );
}

// Βιβλιοθήκη ή αποτελέσματα αναζήτησης, ανάλογα με το ?q=.
async function Body({ q, isClient }: { q: string; isClient: boolean }) {
  if (q) {
    const found = await searchKnowledge(q);
    return found.ok ? (
      <SearchScreen q={q} result={found.data} isClient={isClient} />
    ) : (
      <ErrorNotice />
    );
  }
  const library = await getLibrary();
  return library.ok ? (
    <LibraryScreen library={library.data} isClient={isClient} />
  ) : (
    <ErrorNotice />
  );
}

// A8 για κάθε Χρήστη (ομάδας ή πελάτη): μόνο τα δημοσιευμένα του Κοινού του. Η αναζήτηση ζει στη διεύθυνση (?q=).
export default async function KnowledgePage({
  searchParams,
}: KnowledgePageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const header = (
    <ScreenHeader eyebrow={LIBRARY_EYEBROW} title={LIBRARY_TITLE}>
      {can(viewer, "knowledge.manage") && (
        <Link className={buttonVariants()} href="/app/knowledge/manage">
          Διαχείριση Γνώσης →
        </Link>
      )}
    </ScreenHeader>
  );
  return (
    <>
      {header}
      {viewer.status === "signed-in" ? (
        <Body q={parseQuery(params.q)} isClient={isClientViewer(viewer)} />
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_ACCOUNT_TEXT}</p>
        </AccessNotice>
      )}
    </>
  );
}
