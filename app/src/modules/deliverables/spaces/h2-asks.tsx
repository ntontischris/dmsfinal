import { Fragment } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import type { DeliverableDetail } from "../types";
import { OPEN_REQUEST_SOURCE, clientAsksOf, fmtDay } from "./h2-model";

import "./h1.css";

// Όλα όσα ζήτησε ο πελάτης σε ένα σημείο, πάνω από τις Εκδόσεις (prototype `screens/h2-asks.tsx`).
export function H2ClientAsks({ detail }: { detail: DeliverableDetail }) {
  const asks = clientAsksOf(detail);
  if (asks.length === 0) return null;
  return (
    <Panel
      label="Τι ζήτησε ο πελάτης"
      aside={
        <span className="muted">
          {asks.length} {asks.length === 1 ? "σημείο" : "σημεία"}
        </span>
      }
    >
      <RowList>
        {asks.map((ask) => (
          <Fragment key={ask.id}>
            <ListRow
              lead={<Avatar name={ask.who} size={32} />}
              title={ask.who}
              sub={fmtDay(ask.when)}
              aside={
                <Badge
                  tone={
                    ask.source === OPEN_REQUEST_SOURCE ? "strong" : undefined
                  }
                >
                  {ask.source}
                </Badge>
              }
            />
            <li className="sx-extra">
              <p>{ask.text}</p>
            </li>
          </Fragment>
        ))}
      </RowList>
    </Panel>
  );
}
