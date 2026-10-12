import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Segmented, Tabs } from "@/components/ui/segmented";

import {
  SENDS_PATH,
  sendsHref,
  type SendsQuery,
  type SendsTab,
} from "../sends-helpers";
import {
  CHANNEL_LABELS,
  FILTER_APPLY,
  FILTER_CHANNEL,
  FILTER_CHANNEL_ALL,
  FILTER_CLIENT,
  FILTER_CLIENT_ALL,
  SENDS_EMPTY_TEXT,
  SENDS_EMPTY_TITLE,
  SENDS_LATER,
  SENDS_OLDER,
  SENDS_RETENTION,
  SENDS_TABS_LABEL,
  TAB_NOTES,
  tabLabel,
} from "../sends-labels";
import type { SendsPage } from "../sends-schema";
import { SendsTable } from "./sends-table";

// K3 «Ιστορικό αποστολών»: καρτέλες Στάλθηκαν / Προγραμματισμένα / Απέτυχαν (N), φίλτρα Κανάλι και Πελάτης, «Παλαιότερα».

const TABS: readonly SendsTab[] = ["sent", "scheduled", "failed"];
const CHANNELS = ["notification", "email"] as const;

function ChannelFilter({ query }: { query: SendsQuery }) {
  return (
    <Segmented
      label={FILTER_CHANNEL}
      options={[
        {
          label: FILTER_CHANNEL_ALL,
          href: sendsHref({ ...query, channel: null, cursor: null }),
          isCurrent: query.channel === null,
        },
        ...CHANNELS.map((channel) => ({
          label: CHANNEL_LABELS[channel],
          href: sendsHref({ ...query, channel, cursor: null }),
          isCurrent: query.channel === channel,
        })),
      ]}
    />
  );
}

// Ο Πελάτης με φόρμα GET: η επιλογή ζει στη διεύθυνση, όπως η καρτέλα και το κανάλι.
function ClientFilter({
  query,
  clients,
}: {
  query: SendsQuery;
  clients: SendsPage["clients"];
}) {
  return (
    <form
      action={SENDS_PATH}
      method="get"
      className="flex flex-wrap items-end gap-2"
    >
      {query.tab !== "sent" && (
        <input type="hidden" name="tab" value={query.tab} />
      )}
      {query.channel && (
        <input type="hidden" name="channel" value={query.channel} />
      )}
      <label className="grid gap-1.5">
        <span className="kit-label">{FILTER_CLIENT}</span>
        <Select name="client" defaultValue={query.client ?? ""}>
          <option value="">{FILTER_CLIENT_ALL}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit">{FILTER_APPLY}</Button>
    </form>
  );
}

interface SendsScreenProps {
  page: SendsPage;
  query: SendsQuery;
  canRetry: boolean;
}

export function SendsScreen({ page, query, canRetry }: SendsScreenProps) {
  const last = page.items.at(-1);
  return (
    <section className="grid gap-4">
      <Tabs
        label={SENDS_TABS_LABEL}
        options={TABS.map((tab) => ({
          label: tabLabel(tab, page.failed),
          href: sendsHref({ ...query, tab, cursor: null }),
          isCurrent: tab === query.tab,
        }))}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ClientFilter query={query} clients={page.clients} />
        <ChannelFilter query={query} />
      </div>
      <p className="m-0 text-sm text-muted-foreground">
        {TAB_NOTES[query.tab]}
      </p>
      {page.items.length > 0 ? (
        <SendsTable
          sends={page.items}
          hasActions={query.tab === "failed"}
          canRetry={canRetry}
        />
      ) : (
        <Notice kind="empty" title={SENDS_EMPTY_TITLE}>
          {SENDS_EMPTY_TEXT}
        </Notice>
      )}
      {page.hasMore && last && (
        <div>
          <Link
            href={sendsHref({ ...query, cursor: { at: last.at, id: last.id } })}
            className={buttonVariants()}
          >
            {query.tab === "scheduled" ? SENDS_LATER : SENDS_OLDER}
          </Link>
        </div>
      )}
      <p className="m-0 text-sm text-muted-foreground">{SENDS_RETENTION}</p>
    </section>
  );
}
