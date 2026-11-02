import Link from "next/link";
import type { ReactNode } from "react";

import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  AUDIT_CLEAR_FILTERS,
  AUDIT_EMPTY_TEXT,
  AUDIT_EMPTY_TITLE,
  AUDIT_FIRST_PAGE,
  AUDIT_NO_ACCESS,
  AUDIT_NO_RESULTS_TITLE,
  AUDIT_NOTE,
  AUDIT_OLDER,
} from "../labels";
import { getAuditOptions, getAuditPage } from "../queries";
import type { AuditPage } from "../schema";
import { activeKeys, auditHref, type AuditQuery } from "../url";
import { P1_CLEAR_HREF, p1RowOf } from "./p1-adapter";
import { AuditFilterBar } from "./p1-filters";
import { AuditTable } from "./p1-table";

import "./p1.css";

interface SpacesAuditProps {
  canView: boolean;
  query: AuditQuery;
  // Η «Εξαγωγή» σε Excel/CSV με τα ίδια φίλτρα (SpacesAuditExport των Αναφορών, μόνο για όποιον «Εξάγει δεδομένα»).
  exportAction?: ReactNode;
}

function Pager({ page, query }: { page: AuditPage; query: AuditQuery }) {
  const last = page.items.at(-1);
  if (!query.cursor && !(page.hasMore && last)) return null;
  return (
    <div className="btn-row">
      {query.cursor && (
        <Link className="button" href={auditHref(query.filters)}>
          {AUDIT_FIRST_PAGE}
        </Link>
      )}
      {page.hasMore && last && (
        <Link
          className="button"
          href={auditHref(query.filters, { at: last.at, id: String(last.id) })}
        >
          {AUDIT_OLDER}
        </Link>
      )}
    </div>
  );
}

function Results({ page, query }: { page: AuditPage; query: AuditQuery }) {
  const isFiltered = activeKeys(query.filters).length > 0 || !!query.cursor;
  if (page.items.length === 0)
    return isFiltered ? (
      <StateNotice kind="empty" title={AUDIT_NO_RESULTS_TITLE}>
        <Link href={P1_CLEAR_HREF}>{AUDIT_CLEAR_FILTERS}</Link>
      </StateNotice>
    ) : (
      <StateNotice kind="empty" title={AUDIT_EMPTY_TITLE}>
        {AUDIT_EMPTY_TEXT}
      </StateNotice>
    );
  return (
    <>
      <AuditTable rows={page.items.map(p1RowOf)} />
      <Pager page={page} query={query} />
    </>
  );
}

// P1 Ίχνος ενεργειών στη νέα εμφάνιση (prototype `screens/P1.tsx`): μόνο προσθήκη, φίλτρα στη διεύθυνση.
// Η βάση ξανακρίνει το «Βλέπει ίχνος ενεργειών» και κρύβει ποσά και κόστος σε όποιον δεν τα βλέπει.
export async function SpacesAudit({
  canView,
  query,
  exportAction,
}: SpacesAuditProps) {
  if (!canView)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {AUDIT_NO_ACCESS}
        </StateNotice>
      </div>
    );
  const [page, options] = await Promise.all([
    getAuditPage(query),
    getAuditOptions(),
  ]);
  if (!page.ok || !options.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το Ίχνος ενεργειών" />
      </div>
    );
  return (
    <div data-spaces>
      <p className="note">{AUDIT_NOTE}</p>
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
