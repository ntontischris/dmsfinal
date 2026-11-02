import Link from "next/link";

import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { getSends } from "../queries-sends";
import {
  parseSendsChannel,
  parseSendsClient,
  parseSendsCursor,
  parseSendsTab,
  sendsCaps,
  sendsHref,
  type SendsQuery,
  type SendsTab,
} from "../sends-helpers";
import { CHANNEL_LABELS, TAB_NOTES, tabLabel } from "../sends-labels";
import type { SendsPage } from "../sends-schema";
import { SendTable } from "./k3-table";

import "./k3.css";

const TABS: readonly SendsTab[] = ["sent", "scheduled", "failed"];
const CHANNELS = ["notification", "email"] as const;

function Denied() {
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        Το Ιστορικό αποστολών το βλέπει όποιος «Διαχειρίζεται Αυτοματισμούς» ή
        «Βλέπει Υγεία συστήματος».
      </StateNotice>
    </div>
  );
}

// Τα φίλτρα του prototype ως χάπια: Πελάτης (όσοι έχουν αποστολές, από τη βάση) και Κανάλι. Ζουν στη διεύθυνση.
function Filters({ query, page }: { query: SendsQuery; page: SendsPage }) {
  const href = (extra: Partial<SendsQuery>) =>
    sendsHref({ ...query, cursor: null, ...extra });
  return (
    <div className="k3-filters">
      <span className="muted">Πελάτης:</span>
      <Link href={href({ client: null })} aria-current={!query.client}>
        όλοι
      </Link>
      {page.clients.map((c) => (
        <Link
          key={c.id}
          href={href({ client: c.id })}
          aria-current={query.client === c.id}
        >
          {c.name}
        </Link>
      ))}
      <span className="muted">Κανάλι:</span>
      <Link href={href({ channel: null })} aria-current={!query.channel}>
        όλα
      </Link>
      {CHANNELS.map((ch) => (
        <Link
          key={ch}
          href={href({ channel: ch })}
          aria-current={query.channel === ch}
        >
          {CHANNEL_LABELS[ch]}
        </Link>
      ))}
    </div>
  );
}

function Log({
  query,
  page,
  canRetry,
}: {
  query: SendsQuery;
  page: SendsPage;
  canRetry: boolean;
}) {
  const last = page.items.at(-1);
  return (
    <>
      <nav className="tabs" aria-label="Ιστορικό αποστολών">
        {TABS.map((t) => (
          <Link
            key={t}
            className="tab"
            aria-current={t === query.tab ? "page" : undefined}
            href={sendsHref({ ...query, tab: t, cursor: null })}
          >
            {tabLabel(t, page.failed)}
          </Link>
        ))}
      </nav>
      <Filters query={query} page={page} />
      <p className="note">{TAB_NOTES[query.tab]}</p>
      {page.items.length > 0 ? (
        <SendTable
          sends={page.items}
          hasRetry={query.tab === "failed"}
          canRetry={canRetry}
        />
      ) : (
        <StateNotice kind="empty" title="Καμία αποστολή εδώ">
          Δεν υπάρχει τίποτα για αυτά τα φίλτρα.
        </StateNotice>
      )}
      {page.hasMore && last && (
        <p className="btn-row">
          <Link
            className="button"
            href={sendsHref({ ...query, cursor: { at: last.at, id: last.id } })}
          >
            {query.tab === "scheduled" ? "Επόμενα" : "Παλαιότερα"}
          </Link>
        </p>
      )}
      <p className="note">
        Κρατιέται 12 μήνες: μόνο τι, σε ποιον, πότε και αποτέλεσμα, όχι το σώμα
        του μηνύματος. Ο πελάτης δεν βλέπει Ιστορικό. Ανά Πελάτη υπάρχει στη
        Σελίδα Πελάτη, καρτέλα «Αποστολές».
      </p>
    </>
  );
}

export interface SendsParams {
  tab?: string;
  channel?: string;
  client?: string;
  before?: string;
  beforeId?: string;
}

// K3 Ιστορικό αποστολών στη νέα εμφάνιση (prototype `screens/K3.tsx`): καρτέλες, φίλτρα Πελάτη και Καναλιού, «Ξαναστείλε».
export async function SpacesSends({ params }: { params: SendsParams }) {
  const caps = sendsCaps(await getViewer());
  if (!caps.canView) return <Denied />;
  const query: SendsQuery = {
    tab: parseSendsTab(params.tab),
    channel: parseSendsChannel(params.channel),
    client: parseSendsClient(params.client),
    cursor: parseSendsCursor(params.before, params.beforeId),
  };
  const result = await getSends(query);
  if (!result.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="το Ιστορικό αποστολών" />
      </div>
    );
  // null = η βάση λέει «χωρίς Δικαίωμα».
  if (!result.data) return <Denied />;
  return (
    <div data-spaces>
      <Log query={query} page={result.data} canRetry={caps.canRetry} />
    </div>
  );
}
