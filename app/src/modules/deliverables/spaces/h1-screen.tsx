import Link from "next/link";

import { getViewer, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Segmented } from "@/spaces/kit/segmented";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { deliverablesCaps } from "../caps";
import { CLIENT_QUEUE_NOTE } from "../labels";
import { parseQueueView, queueViewsOf } from "../helpers";
import { listDeliverableQueue, listPendingCharges } from "../queries";
import { getDeliverableRules } from "../queries-rules";
import type { DeliverableCard, QueueView } from "../types";
import {
  EMPTY,
  VIEW_LABELS,
  filterOptions,
  filterQueue,
  lateCount,
  textQuery,
  type RawQuery,
  type QueueFilter,
} from "./h1-model";
import { ChargesCard, RulesCard } from "./h1-panels";
import { ReviewTable } from "./h1-review";
import { ClientQueueTable, ForMeTable, type ListQuery } from "./h1-rows";

import "./h1.css";

// «Με αφορά»: ο Χρήστης δουλεύει Παραδοτέα μόνο στις Παραγωγές όπου είναι Μέλος (το Εύρος το κρίνει η βάση).
const isScopedOf = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" &&
  viewer.team?.permissions["deliverables.work"] === "mine" &&
  viewer.team.permissions["deliverables.review"] !== "all";

const hrefH1 = (query: ListQuery): string => hrefOf("H1", query);

// H1 Παραδοτέα στη νέα εμφάνιση (prototype `screens/H1.tsx`): η ουρά της βάσης ανά καρτέλα, με φίλτρα ατόμου,
// πελάτη και «Καθυστερούν». Όλες οι καρτέλες διαβάζονται μαζί, για τα πλήθη τους.
export async function SpacesDeliverables({ query: raw }: { query: RawQuery }) {
  const query = textQuery(raw);
  const viewer = await getViewer();
  const caps = deliverablesCaps(viewer);
  if (!caps.canQueue)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την ουρά Παραδοτέων τη βλέπει όποιος «Δουλεύει Παραδοτέα» ή «Ελέγχει
          Παραδοτέα».
        </StateNotice>
      </div>
    );
  const views = queueViewsOf(caps.canReview);
  const view = parseQueueView(query.view, views);
  const [queues, charges, rules] = await Promise.all([
    Promise.all(views.map((v) => listDeliverableQueue(v))),
    caps.canSeeCharges ? listPendingCharges() : null,
    caps.canReview ? getDeliverableRules() : null,
  ]);
  if (queues.some((q) => !q.ok) || (charges !== null && !charges.ok))
    return (
      <div data-spaces>
        <ErrorNotice what="την Ουρά Παραδοτέων" />
      </div>
    );
  const itemsOf = (v: QueueView): readonly DeliverableCard[] => {
    const result = queues[views.indexOf(v)];
    return result?.ok ? result.data : [];
  };
  const viewerId = viewer.status === "signed-in" ? viewer.userId : undefined;
  const isMineOnly = query.who === "me" && viewerId !== undefined;
  const filter: QueueFilter = {
    person: query.person,
    client: query.client,
    isLateOnly: query.late === "1",
    onlyAssignee: isMineOnly ? viewerId : undefined,
  };
  const unfiltered = itemsOf(view);
  const shown = filterQueue(unfiltered, filter);
  const back: ListQuery = {
    view: view === views[0] ? undefined : view,
    who: isMineOnly ? "me" : undefined,
    person: query.person,
    client: query.client,
    late: query.late,
  };
  return (
    <div data-spaces>
      {isScopedOf(viewer) && (
        <p className="note">
          Με αφορά: μόνο Παραδοτέα Παραγωγών όπου είσαι Μέλος.
        </p>
      )}
      {charges?.ok && <ChargesCard items={charges.data} />}
      <nav className="tabs" aria-label="Προβολή ουράς">
        {views.map((v) => (
          <Link
            key={v}
            className="tab"
            aria-current={v === view ? "page" : undefined}
            href={hrefH1({
              view: v === views[0] ? undefined : v,
              who: back.who,
            })}
          >
            {VIEW_LABELS[v]} ({itemsOf(v).length})
          </Link>
        ))}
      </nav>
      {viewerId && (
        <WhoChoice
          items={unfiltered}
          viewerId={viewerId}
          isMineOnly={isMineOnly}
          back={back}
        />
      )}
      <QueueFilters
        items={unfiltered}
        filter={filter}
        back={back}
        hasLate={view === "mine"}
      />
      {shown.length === 0 ? (
        <StateNotice kind="empty" title={EMPTY[view].title}>
          {EMPTY[view].text}
        </StateNotice>
      ) : view === "mine" ? (
        <ForMeTable items={shown} back={back} />
      ) : view === "review" ? (
        <ReviewTable items={shown} />
      ) : (
        <>
          <p className="note">{CLIENT_QUEUE_NOTE}</p>
          <ClientQueueTable items={shown} back={back} />
        </>
      )}
      {rules?.ok && <RulesCard rules={rules.data} />}
    </div>
  );
}

// «Μόνο εμένα / Όλη η ομάδα»: ό,τι έχει Ανατεθειμένο εμένα ή όλη η ουρά. Μένει στη διεύθυνση (who=me).
function WhoChoice(props: {
  items: readonly DeliverableCard[];
  viewerId: string;
  isMineOnly: boolean;
  back: ListQuery;
}) {
  const mine = filterQueue(props.items, { onlyAssignee: props.viewerId });
  return (
    <Segmented
      label="Ποιανού"
      options={[
        {
          label: "Μόνο εμένα",
          href: hrefH1({ ...props.back, who: "me" }),
          isCurrent: props.isMineOnly,
          count: mine.length,
        },
        {
          label: "Όλη η ομάδα",
          href: hrefH1({ ...props.back, who: undefined }),
          isCurrent: !props.isMineOnly,
          count: props.items.length,
        },
      ]}
    />
  );
}

// Φίλτρα ανά άτομο, πελάτη και «Καθυστερούν»: απλή φόρμα GET, χωρίς JavaScript.
function QueueFilters(props: {
  items: readonly DeliverableCard[];
  filter: QueueFilter;
  back: ListQuery;
  hasLate: boolean;
}) {
  const { people, clients } = filterOptions(props.items);
  const late = lateCount(props.items);
  const hrefWith = (change: ListQuery) => hrefH1({ ...props.back, ...change });
  const isFiltered =
    !!props.filter.person || !!props.filter.client || !!props.filter.isLateOnly;
  return (
    <form className="h1-toolbar" method="get" action={hrefH1({})}>
      {props.back.view && (
        <input type="hidden" name="view" value={props.back.view} />
      )}
      {props.back.late && (
        <input type="hidden" name="late" value={props.back.late} />
      )}
      {props.back.who && (
        <input type="hidden" name="who" value={props.back.who} />
      )}
      {people.length > 1 && (
        <select
          className="select"
          name="person"
          aria-label="Άτομο"
          defaultValue={props.filter.person ?? ""}
        >
          <option value="">Όλα τα άτομα</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <select
        className="select"
        name="client"
        aria-label="Πελάτης"
        defaultValue={props.filter.client ?? ""}
      >
        <option value="">Όλοι οι πελάτες</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="submit" className="button">
        Φίλτρο
      </button>
      {props.hasLate && (
        <Link
          className="button"
          data-primary={props.filter.isLateOnly}
          aria-pressed={props.filter.isLateOnly}
          href={hrefWith({ late: props.filter.isLateOnly ? undefined : "1" })}
        >
          Καθυστερούν ({late})
        </Link>
      )}
      {isFiltered && (
        <Link
          href={hrefWith({
            person: undefined,
            client: undefined,
            late: undefined,
          })}
        >
          Καθάρισμα φίλτρων
        </Link>
      )}
    </form>
  );
}
