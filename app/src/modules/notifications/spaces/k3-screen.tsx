import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { FilterBar, type FilterGroup } from "@/spaces/kit/filter-bar";
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
import {
  CHANNEL_LABELS,
  FILTER_CHANNEL,
  FILTER_CHANNEL_ALL,
  FILTER_CLIENT,
  FILTER_CLIENT_ALL,
  TAB_NOTES,
} from "../sends-labels";
import type { SendsPage } from "../sends-schema";
import { KSubnav } from "./k-subnav";
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

const TAB_NAMES: Readonly<Record<SendsTab, string>> = {
  sent: "Στάλθηκαν",
  scheduled: "Προγραμματισμένα",
  failed: "Απέτυχαν",
};

// Κατάσταση (οι παλιές καρτέλες), Πελάτης (όσοι έχουν αποστολές, από τη βάση) και Κανάλι. Ζουν στη διεύθυνση.
function groupsOf(query: SendsQuery, page: SendsPage) {
  const href = (extra: Partial<SendsQuery>) =>
    sendsHref({ ...query, cursor: null, ...extra });
  const status: FilterGroup = {
    label: "Κατάσταση",
    options: TABS.map((t) => ({
      label: TAB_NAMES[t],
      href: href({ tab: t }),
      isCurrent: t === query.tab,
      count: t === "failed" ? page.failed : undefined,
    })),
  };
  const client: FilterGroup = {
    label: FILTER_CLIENT,
    isSearchable: true,
    all: {
      label: FILTER_CLIENT_ALL,
      href: href({ client: null }),
      isCurrent: !query.client,
    },
    options: page.clients.map((c) => ({
      label: c.name,
      href: href({ client: c.id }),
      isCurrent: query.client === c.id,
    })),
  };
  const channel: FilterGroup = {
    label: FILTER_CHANNEL,
    all: {
      label: FILTER_CHANNEL_ALL,
      href: href({ channel: null }),
      isCurrent: !query.channel,
    },
    options: CHANNELS.map((ch) => ({
      label: CHANNEL_LABELS[ch],
      href: href({ channel: ch }),
      isCurrent: query.channel === ch,
    })),
  };
  return {
    filters: [status, client, channel],
    clearHref: href({ client: null, channel: null }),
  };
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
      <FilterBar name="k3-filters" {...groupsOf(query, page)} />
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
            href={sendsHref({
              ...query,
              cursor: { at: last.at, id: last.id },
            })}
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

// K3 Ιστορικό αποστολών στη νέα εμφάνιση (prototype `screens/K3.tsx`): στήλη φίλτρων (Κατάσταση, Πελάτης, Κανάλι), «Ξαναστείλε».
export async function SpacesSends({ params }: { params: SendsParams }) {
  const viewer = await getViewer();
  const caps = sendsCaps(viewer);
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
  // Οι καρτέλες μόνο για όποιον ανοίγει και τους Αυτοματισμούς· όποιος έρχεται από την Υγεία βλέπει μόνο το Ιστορικό.
  return (
    <div data-spaces>
      {can(viewer, "automations.manage") && <KSubnav current="sends" />}
      <Log query={query} page={result.data} canRetry={caps.canRetry} />
    </div>
  );
}
