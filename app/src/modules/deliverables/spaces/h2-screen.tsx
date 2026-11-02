import Link from "next/link";
import type { ReactNode } from "react";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { deliverablesCaps } from "../caps";
import { getDeliverable, getDeliverableCandidates } from "../queries";
import { getDeliverableRules } from "../queries-rules";
import type { DeliverableDetail, DeliverablesCaps } from "../types";
import { textQuery, type RawQuery } from "./h1-model";
import { H2Actions } from "./h2-actions";
import { H2Cancel, H2FinalFiles, H2Trail } from "./h2-after";
import { H2ClientAsks } from "./h2-asks";
import { H2Header } from "./h2-header";
import { H2Charge, H2Requests } from "./h2-money";
import { goesToReviewOf, type H2Context } from "./h2-model";
import { H2Versions } from "./h2-versions";

import "./h2.css";

interface SpacesDeliverableProps {
  // null: η διεύθυνση δεν έχει έγκυρο id.
  id: string | null;
  query: RawQuery;
}

const wrap = (children: ReactNode) => <div data-spaces>{children}</div>;

const parseVersion = (value: string | undefined): number | undefined => {
  const version = Number(value);
  return Number.isInteger(version) && version > 0 ? version : undefined;
};

function NotFound() {
  return wrap(
    <StateNotice kind="empty" title="Το Παραδοτέο δεν βρέθηκε">
      <p>
        <Link href={hrefOf("H1")}>Πίσω στην ουρά Παραδοτέων</Link>
      </p>
    </StateNotice>,
  );
}

const contextOf = (
  detail: DeliverableDetail,
  caps: DeliverablesCaps,
  extra: Pick<H2Context, "assignees" | "internalReview" | "initialVersion">,
): H2Context => ({
  ...extra,
  canSeeAmounts: caps.canSeeAmounts,
  canReview: caps.canReview,
  goesToReview: goesToReviewOf(
    detail.client === null,
    extra.internalReview,
    caps.canReview,
  ),
  productionHref: hrefOf("G2", { id: detail.productionId }),
  filmingHref: detail.filmingId ? hrefOf("E3", { id: detail.filmingId }) : null,
});

// H2 Παραδοτέο (ομάδα) στη νέα εμφάνιση (prototype `screens/H2.tsx`): μία ανάγνωση του Παραδοτέου (deliverable_view),
// και όσων χρειάζονται οι ενέργειες (υποψήφιοι Ανατεθειμένοι, Κανόνες). Κάθε κουμπί είναι η πραγματική ενέργεια.
export async function SpacesDeliverable({
  id,
  query: raw,
}: SpacesDeliverableProps) {
  const query = textQuery(raw);
  const caps = deliverablesCaps(await getViewer());
  if (!caps.canQueue)
    return wrap(
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>Αυτή η σελίδα είναι για την ομάδα.</p>
      </StateNotice>,
    );
  if (id === null) return <NotFound />;
  const [detail, rules] = await Promise.all([
    getDeliverable(id),
    getDeliverableRules(),
  ]);
  if (!detail.ok) return wrap(<ErrorNotice what="το Παραδοτέο" />);
  if (detail.data === null) return <NotFound />;
  const candidates = caps.canWork
    ? await getDeliverableCandidates(detail.data.productionId)
    : null;
  if (candidates !== null && !candidates.ok)
    return wrap(<ErrorNotice what="το Παραδοτέο" />);

  const ctx = contextOf(detail.data, caps, {
    assignees:
      candidates?.ok && candidates.data ? candidates.data.assignees : null,
    internalReview: rules.ok ? rules.data.internalReview : null,
    initialVersion: parseVersion(query.v),
  });
  const panel = { detail: detail.data, ctx };
  // Πίσω στη λίστα Παραδοτέων με την ίδια προβολή και τα ίδια φίλτρα.
  const backHref = hrefOf("H1", {
    view: query.view,
    person: query.person,
    client: query.client,
    late: query.late,
  });
  // Ο τίτλος όπως στο prototype: το Παραδοτέο ως τίτλος σελίδας (η κεφαλίδα του κελύφους γράφει μόνο τον Χώρο).
  return wrap(
    <>
      <header className="page-head">
        <h1>
          {detail.data.title}
          <span className="page-head-dot">.</span>
        </h1>
      </header>
      <nav aria-label="Διαδρομή" className="h2-back">
        <Link href={backHref}>‹ Παραδοτέα</Link>
      </nav>
      <div className="h2">
        <H2Header {...panel} />
        <H2ClientAsks detail={detail.data} />
        {/* Οι ενέργειες (π.χ. «Νέα Έκδοση») πριν από το ιστορικό των Εκδόσεων, για να μη χρειάζεται κύλιση. */}
        <H2Actions {...panel} />
        <H2Versions {...panel} />
        <H2Charge {...panel} />
        <H2Requests {...panel} />
        <H2FinalFiles {...panel} />
        <H2Cancel {...panel} />
        <H2Trail detail={detail.data} />
      </div>
    </>,
  );
}
