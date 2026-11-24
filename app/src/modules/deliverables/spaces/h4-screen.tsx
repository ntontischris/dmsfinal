import Link from "next/link";
import type { ReactNode } from "react";

import { canSeeClientWork, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { getClientDeliverable } from "../client-queries";
import type { ClientDeliverableDetail } from "../client-types";
import {
  answerNoticeOf,
  selectedNumberOf,
  versionsInOrder,
} from "./h4-adapter";
import { H4After, H4FinalFiles } from "./h4-after";
import { H4Decision } from "./h4-decision";
import { H4Hero, VersionTabs } from "./h4-parts";
import { H4Review } from "./h4-review";

import "../../finance/spaces/money-lines.css";
import "./h34.css";

interface SpacesClientDeliverableProps {
  viewer: Viewer;
  // null: η διεύθυνση δεν έχει έγκυρο id.
  id: string | null;
  query: RawQuery;
}

type RawQuery = Readonly<Record<string, string | string[] | undefined>>;

const wrap = (children: ReactNode) => <div data-spaces>{children}</div>;

function NotFound() {
  return wrap(
    <StateNotice kind="empty" title="Το Παραδοτέο δεν βρέθηκε">
      <p>
        <Link href={hrefOf("H1")}>Πίσω στα Παραδοτέα</Link>
      </p>
    </StateNotice>,
  );
}

function Versions({
  detail,
  requested,
}: {
  detail: ClientDeliverableDetail;
  requested: string | undefined;
}) {
  const versions = versionsInOrder(detail.versions);
  const selected = selectedNumberOf(versions, requested);
  const version = versions.find((v) => v.number === selected);
  const latest = versions.at(-1)?.number;
  if (!version || latest === undefined)
    return (
      <p className="ml-empty">
        Δεν έχει σταλεί ακόμα Έκδοση. Θα ειδοποιηθείς μόλις είναι έτοιμη.
      </p>
    );
  const notice = answerNoticeOf(detail);
  const isLatest = version.number === latest;
  return (
    <>
      <VersionTabs
        deliverableId={detail.id}
        versions={versions}
        selected={version.number}
      />
      <H4Review
        key={version.number}
        deliverableId={detail.id}
        version={version}
        canReportBroken={detail.can.reportLink}
        canComment={detail.can.comment && isLatest}
      >
        {/* Στη θέση της απόφασης: τι έγινε, ποιος ειδοποιήθηκε, τι ακολουθεί. */}
        {notice && (
          <section className="ml-box h34-done" role="status">
            <h2>{notice.title}</h2>
            {notice.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>
        )}
        {/* Η απόφαση αμέσως κάτω από το βίντεο: είναι ο λόγος που μπήκε ο πελάτης. */}
        {detail.can.answer && isLatest && (
          <H4Decision
            deliverableId={detail.id}
            roundsUsed={detail.roundsUsed}
            roundsLimit={detail.roundsLimit}
            isOverLimit={detail.overLimit}
          />
        )}
      </H4Review>
    </>
  );
}

// H4 Παραδοτέο, όψη πελάτη, στη νέα εμφάνιση (prototype `screens/H4.tsx`): μία ανάγνωση (client_deliverable_view).
// Κάθε κουμπί είναι η πραγματική ενέργεια του πελάτη· τι επιτρέπεται το λέει η βάση (`can`).
export async function SpacesClientDeliverable({
  viewer,
  id,
  query: raw,
}: SpacesClientDeliverableProps) {
  if (!canSeeClientWork(viewer))
    return wrap(
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>
          Τα Παραδοτέα των Παραγωγών σου τα βλέπει όποιος έχει πρόσβαση στις
          Παραγωγές.
        </p>
      </StateNotice>,
    );
  if (id === null) return <NotFound />;
  const result = await getClientDeliverable(id);
  if (!result.ok) return wrap(<ErrorNotice what="το Παραδοτέο" />);
  if (result.data === null) return <NotFound />;

  const detail = result.data;
  const isApproved = detail.state === "approved";
  // Ο τίτλος: το Παραδοτέο, στην κεφαλίδα· από κάτω τα κουτιά, με τη σειρά που τα χρειάζεται ο πελάτης.
  return wrap(
    <div className="h34">
      <H4Hero detail={detail} />
      <div className="ml-stack">
        {/* Η λήψη του τελικού αρχείου ψηλά: είναι ο λόγος που ξαναμπαίνει ο πελάτης. */}
        {(isApproved || detail.finalFilesUrl !== null) && (
          <H4FinalFiles finalLink={detail.finalFilesUrl} />
        )}
        <Versions
          detail={detail}
          requested={typeof raw.v === "string" ? raw.v : undefined}
        />
        {(detail.can.requestChange || detail.openRequest !== null) && (
          <H4After
            deliverableId={detail.id}
            request={detail.openRequest}
            canRequest={detail.can.requestChange}
          />
        )}
        {detail.state === "in_progress" &&
          detail.versions.length > 0 &&
          answerNoticeOf(detail) === null && (
            <p className="note">
              Η ομάδα δουλεύει πάνω στο Παραδοτέο. Θα ειδοποιηθείς όταν υπάρξει
              νέα Έκδοση.
            </p>
          )}
        <p className="note">Δεν εγκρίνεται τίποτα αυτόματα.</p>
      </div>
    </div>,
  );
}
