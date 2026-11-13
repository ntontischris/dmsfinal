import Link from "next/link";
import { z } from "zod";

import { getViewer, type Viewer } from "@/modules/access";
import { agreementCaps } from "@/modules/agreements";
import { SpacesHistoryLink } from "@/modules/audit";
import { costsCaps } from "@/modules/costs";
import {
  SpacesNewDeliverable,
  deliverablesCaps,
  getDeliverableCandidates,
} from "@/modules/deliverables";
import { messagesCaps, threadHref } from "@/modules/messages";
import { salesCaps } from "@/modules/sales";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { productionsCaps } from "../caps";
import { memberChoices, ownerChoices, periodLabel } from "../helpers";
import {
  getProduction,
  listMemberCandidates,
  listOwnerCandidates,
} from "../queries";
import type { ProductionDetail } from "../types";
import { STATE_WORDS } from "./g1-rows";
import { G2ClientPage } from "./g2-client";
import { G2State } from "./g2-live";
import { G2Members } from "./g2-members";
import { G2Money } from "./g2-money";
import {
  cancellationOf,
  deliveryBlockers,
  deliveryOf,
  memberRowsOf,
  productionStats,
} from "./g2-model";
import { G2Messages, G2Trail } from "./g2-notes";
import { G2Deliverables, G2Filmings, G2Provisions } from "./g2-sections";
import { G2Tasks } from "./g2-tasks";

import "./g2.css";

function Missing() {
  return (
    <div data-spaces>
      <StateNotice kind="empty" title="Η Παραγωγή δεν βρέθηκε">
        <p>
          <Link href={hrefOf("G1")}>Πίσω στις Παραγωγές</Link>
        </p>
      </StateNotice>
    </div>
  );
}

function Header({
  production,
  viewer,
}: {
  production: ProductionDetail;
  viewer: Viewer;
}) {
  const { client, agreement, period } = production;
  const canOpenClient = salesCaps(viewer).canViewClients;
  const canOpenAgreement = agreementCaps(viewer).canView;
  return (
    <header className="g2-header">
      <dl className="dl">
        <dt>Πελάτης</dt>
        <dd>
          {client === null ? (
            "Εσωτερική Παραγωγή"
          ) : canOpenClient ? (
            <Link href={hrefOf("B2", { id: client.id })}>{client.name}</Link>
          ) : (
            client.name
          )}
        </dd>
        {agreement && (
          <>
            <dt>Συμφωνία</dt>
            <dd>
              {canOpenAgreement ? (
                <Link href={hrefOf("D2", { id: agreement.id })}>
                  {agreement.title}
                </Link>
              ) : (
                agreement.title
              )}{" "}
              · {period ? periodLabel(period.starts) : "εφάπαξ"}
            </dd>
          </>
        )}
      </dl>
      <span className="g2-inline">
        {costsCaps(viewer).canView && (
          <Link href={`/app/productions/${production.id}/costs`}>
            Κόστος και ώρες
          </Link>
        )}
        <SpacesHistoryLink
          viewer={viewer}
          entity="productions"
          id={production.id}
        />
      </span>
    </header>
  );
}

// Οι λίστες υποψηφίων φορτώνουν μόνο όπου το Δικαίωμα τις θέλει (μεταβίβαση, Μέλη/Εργασίες, Παραδοτέα), όπως η παλιά σελίδα.
async function loadCandidates(production: ProductionDetail, viewer: Viewer) {
  const [owners, members, deliverables] = await Promise.all([
    production.viewerCan.transfer ? listOwnerCandidates() : null,
    production.viewerCan.members ? listMemberCandidates() : null,
    deliverablesCaps(viewer).canWork
      ? getDeliverableCandidates(production.id)
      : null,
  ]);
  const failed = [owners, members, deliverables].some(
    (read) => read !== null && !read.ok,
  );
  return {
    failed,
    owners: owners?.ok ? owners.data : [],
    people: members?.ok ? members.data : [],
    deliverables: deliverables?.ok ? deliverables.data : null,
  };
}

const messagesHrefOf = (
  viewer: Viewer,
  production: ProductionDetail,
): string | null =>
  production.client !== null && messagesCaps(viewer).canChat
    ? threadHref(production.client.id, { production: production.id })
    : null;

// G2 Παραγωγή στη νέα εμφάνιση (prototype `screens/G2.tsx`). Ο Χρήστης πελάτη παίρνει την όψη πελάτη (g2-client)·
// για την ομάδα, ό,τι δεν επιτρέπεται δεν εμφανίζεται και η βάση ξαναελέγχει κάθε ενέργεια (viewerCan).
export async function SpacesProduction({ id }: { id: string }) {
  const viewer = await getViewer();
  if (!productionsCaps(viewer).canView)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Τις Παραγωγές τις βλέπει όποιος «Βλέπει Παραγωγές».</p>
        </StateNotice>
      </div>
    );
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return <Missing />;
  const read = await getProduction(parsed.data);
  if (!read.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η Παραγωγή" />
      </div>
    );
  if (read.data === null) return <Missing />;
  const production = read.data;
  if (productionsCaps(viewer).isClient)
    return (
      <div data-spaces>
        <G2ClientPage production={production} viewer={viewer} />
      </div>
    );
  const candidates = await loadCandidates(production, viewer);
  if (candidates.failed)
    return (
      <div data-spaces>
        <ErrorNotice what="η Παραγωγή" />
      </div>
    );
  return (
    <div data-spaces>
      <G2Page production={production} viewer={viewer} candidates={candidates} />
    </div>
  );
}

function G2Page({
  production,
  viewer,
  candidates,
}: {
  production: ProductionDetail;
  viewer: Viewer;
  candidates: Awaited<ReturnType<typeof loadCandidates>>;
}) {
  const { viewerCan } = production;
  const ownerId = production.owner?.id ?? null;
  const members = memberRowsOf(production);
  const meId = viewer.status === "signed-in" ? viewer.userId : "";
  return (
    <div className="g2">
      <header className="page-head">
        <h1>
          {production.title}
          <span className="page-head-dot">.</span>
        </h1>
      </header>
      <Strip stats={productionStats(production)} now={null} />
      <Header production={production} viewer={viewer} />
      <G2State
        productionId={production.id}
        state={production.state}
        stateWord={STATE_WORDS[production.state]}
        owner={production.owner}
        ownerChoices={ownerChoices(candidates.owners, ownerId)}
        can={viewerCan}
        blockers={deliveryBlockers(production)}
        delivery={deliveryOf(production)}
        cancellation={cancellationOf(production)}
      />
      <G2Provisions production={production} />
      {!production.isInternal && <G2Money productionId={production.id} />}
      <G2Filmings filmings={production.filmings} />
      <G2Deliverables
        production={production}
        newForm={
          candidates.deliverables && (
            <SpacesNewDeliverable
              productionId={production.id}
              defaultTitle={
                production.client
                  ? `${production.client.name} — ${production.title}`
                  : production.title
              }
              isInternal={production.isInternal}
              candidates={candidates.deliverables}
            />
          )
        }
      />
      <G2Tasks
        productionId={production.id}
        tasks={production.tasks}
        people={candidates.people}
        memberIds={members.map((member) => member.userId)}
        meId={meId}
        canEdit={viewerCan.members && production.state === "open"}
        isOpen={production.state === "open"}
      />
      <G2Members
        productionId={production.id}
        members={members}
        ownerName={production.owner?.name ?? "Χωρίς υπεύθυνο"}
        choices={memberChoices(candidates.people, ownerId, production.members)}
        canManage={viewerCan.members}
      />
      <G2Messages
        isInternal={production.isInternal}
        threadHref={messagesHrefOf(viewer, production)}
      />
      {viewerCan.members && <G2Trail history={production.history} />}
    </div>
  );
}
