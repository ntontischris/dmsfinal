import Link from "next/link";

import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice } from "@/spaces/screens/shared";

import { getClientSends } from "../queries-sends";
import { formatWhen, sendsHref, whatOf } from "../sends-helpers";
import {
  CLIENT_SENDS_EMPTY,
  CLIENT_SENDS_NOTE,
  SENDS_TITLE,
  STATE_LABELS,
} from "../sends-labels";
import {
  clientSendsGroups,
  isClientSendsFiltered,
  type ClientSendsFilter,
} from "./b2-sends-filters";
import { sendsSummary } from "./b2-sends-model";
import "../../finance/spaces/money-lines.css";
import "./b2-sends.css";

interface SpacesClientSendsProps {
  clientId: string;
  hasHistoryLink: boolean;
  filter: ClientSendsFilter;
}

// «Τι στάλθηκε στον Πελάτη» της B2 (prototype `screens/b2-sections.tsx` DispatchList): οι τελευταίες αποστολές προς
// τους Χρήστες του Πελάτη, χωρίς περιεχόμενο, με φίλτρα Κατάσταση και Κανάλι. Η σελίδα τη δείχνει μόνο σε όσους
// επιτρέπεται· η βάση το ξανακρίνει.
export async function SpacesClientSends({
  clientId,
  hasHistoryLink,
  filter,
}: SpacesClientSendsProps) {
  const result = await getClientSends(clientId, null, filter);
  if (!result.ok) return <ErrorNotice what="Τι στάλθηκε στον Πελάτη" />;
  if (!result.data) return null;
  const { items, hasMore } = result.data;
  return (
    <section className="b2-sends">
      <h4 className="sr-only">Τι στάλθηκε στον Πελάτη</h4>
      <FilterBar
        name="b2-sends-filters"
        {...clientSendsGroups(clientId, filter)}
      />
      {items.length === 0 ? (
        <p>
          {isClientSendsFiltered(filter)
            ? "Δεν υπάρχει τίποτα για αυτά τα φίλτρα."
            : CLIENT_SENDS_EMPTY}
        </p>
      ) : (
        <>
          <p>{sendsSummary(items, hasMore)}</p>
          <ul className="ml-list">
            {items.map((send) => (
              <li key={send.id} className="ml-line">
                <span className="ml-main">
                  <strong>{whatOf(send)}</strong>
                  <small>
                    <time dateTime={send.at}>{formatWhen(send.at)}</time>
                    {send.recipientName && ` · ${send.recipientName}`}
                  </small>
                </span>
                <span
                  className="ml-tag"
                  data-tone={send.state === "failed" ? "warn" : undefined}
                >
                  {STATE_LABELS[send.state]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted">
        {CLIENT_SENDS_NOTE}
        {hasHistoryLink && (
          <>
            {" "}
            <Link
              href={sendsHref({
                tab: "sent",
                channel: null,
                client: clientId,
                cursor: null,
              })}
            >
              {SENDS_TITLE}
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
