import Link from "next/link";
import type { ReactNode } from "react";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, type Viewer } from "@/modules/access";

import {
  AUDIT_CLEAR_FILTERS,
  AUDIT_EMPTY_TEXT,
  AUDIT_EMPTY_TITLE,
  AUDIT_EYEBROW,
  AUDIT_FIRST_PAGE,
  AUDIT_LOAD_ERROR_TEXT,
  AUDIT_LOAD_ERROR_TITLE,
  AUDIT_NO_ACCESS,
  AUDIT_NO_RESULTS_TITLE,
  AUDIT_NOTE,
  AUDIT_OLDER,
  AUDIT_RETRY,
  AUDIT_TITLE,
} from "../labels";
import { getAuditOptions, getAuditPage } from "../queries";
import type { AuditPage } from "../schema";
import { NO_FILTERS, activeKeys, auditHref, type AuditQuery } from "../url";
import { AuditFilterBar } from "./audit-filters";
import { AuditTable } from "./audit-table";

interface AuditScreenProps {
  viewer: Viewer;
  query: AuditQuery;
  // Η «Εξαγωγή» με τα ίδια φίλτρα (τη δίνει η σελίδα από τις Αναφορές, μόνο σε όποιον «Εξάγει δεδομένα»).
  exportAction?: ReactNode;
}

function Results({ page, query }: { page: AuditPage; query: AuditQuery }) {
  const isFiltered = activeKeys(query.filters).length > 0;
  const last = page.items.at(-1);
  if (page.items.length === 0)
    return isFiltered || query.cursor ? (
      <Notice kind="empty" title={AUDIT_NO_RESULTS_TITLE}>
        <Link href={auditHref(NO_FILTERS)}>{AUDIT_CLEAR_FILTERS}</Link>
      </Notice>
    ) : (
      <Notice kind="empty" title={AUDIT_EMPTY_TITLE}>
        <p className="m-0">{AUDIT_EMPTY_TEXT}</p>
      </Notice>
    );
  return (
    <>
      <AuditTable items={page.items} />
      <div className="flex flex-wrap gap-2">
        {query.cursor && (
          <Link
            href={auditHref(query.filters)}
            className={buttonVariants({ variant: "ghost" })}
          >
            {AUDIT_FIRST_PAGE}
          </Link>
        )}
        {page.hasMore && last && (
          <Link
            href={auditHref(query.filters, {
              at: last.at,
              id: String(last.id),
            })}
            className={buttonVariants()}
          >
            {AUDIT_OLDER}
          </Link>
        )}
      </div>
    </>
  );
}

async function AuditBody({
  query,
  exportAction,
}: Omit<AuditScreenProps, "viewer">) {
  const [page, options] = await Promise.all([
    getAuditPage(query),
    getAuditOptions(),
  ]);
  if (!page.ok || !options.ok)
    return (
      <Notice kind="error" title={AUDIT_LOAD_ERROR_TITLE}>
        <p className="m-0">{AUDIT_LOAD_ERROR_TEXT}</p>
        <Link href={auditHref(query.filters, query.cursor)}>{AUDIT_RETRY}</Link>
      </Notice>
    );
  return (
    <div className="grid min-w-0 gap-4">
      <AuditFilterBar
        filters={query.filters}
        options={options.data}
        subject={page.data.subject}
      />
      {exportAction}
      <Results page={page.data} query={query} />
    </div>
  );
}

// P1 «Ίχνος ενεργειών» (#214): ποιος, πότε, τι, πριν → μετά, με φίλτρα στη διεύθυνση. Θέλει «Βλέπει ίχνος ενεργειών»· η
// βάση το ξανακρίνει και κρύβει ποσά και κόστος σε όποιον δεν τα βλέπει.
export function AuditScreen({ viewer, query, exportAction }: AuditScreenProps) {
  return (
    <>
      <ScreenHeader eyebrow={AUDIT_EYEBROW} title={AUDIT_TITLE} />
      {can(viewer, "audit.view") ? (
        <div className="grid min-w-0 gap-4">
          <p className="m-0 text-sm text-muted-foreground">{AUDIT_NOTE}</p>
          <AuditBody query={query} exportAction={exportAction} />
        </div>
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{AUDIT_NO_ACCESS}</p>
        </AccessNotice>
      )}
    </>
  );
}
