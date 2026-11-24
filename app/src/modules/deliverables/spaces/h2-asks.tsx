import { Badge } from "@/spaces/screens/shared";

import type { DeliverableDetail } from "../types";
import { H2Box, H2Person } from "./h2-box";
import { OPEN_REQUEST_SOURCE, clientAsksOf, fmtDay } from "./h2-model";

// Όλα όσα ζήτησε ο πελάτης σε ένα σημείο, πάνω από τις Εκδόσεις (prototype `screens/h2-asks.tsx`).
export function H2ClientAsks({ detail }: { detail: DeliverableDetail }) {
  const asks = clientAsksOf(detail);
  if (asks.length === 0) return null;
  return (
    <H2Box
      title="Τι ζήτησε ο πελάτης"
      hint={`${asks.length} ${asks.length === 1 ? "σημείο" : "σημεία"}`}
      isOpen
    >
      <ul className="ml-list">
        {asks.map((ask) => (
          <li key={ask.id} className="ml-line">
            <H2Person name={ask.who} />
            <span className="ml-main">
              <strong>{ask.who}</strong>
              <small>{fmtDay(ask.when)}</small>
              <span className="h2-text">{ask.text}</span>
            </span>
            <span className="ml-quick">
              <Badge
                tone={ask.source === OPEN_REQUEST_SOURCE ? "strong" : undefined}
              >
                {ask.source}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </H2Box>
  );
}
