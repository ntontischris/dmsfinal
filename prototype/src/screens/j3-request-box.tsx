import Link from "next/link";

import type { MessageRequest } from "@/data/messages";
import { Badge } from "@/screens/shared";

import { fmtWhen } from "./j-message";
import "./j3.css";

export interface ClosingLinkView {
  label: string;
  href: string;
}

interface RequestBoxProps {
  request: MessageRequest;
  link?: ClosingLinkView;
}

// Ό,τι βλέπει ο πελάτης για ένα Αίτημα: είδος, κατάσταση, αποτέλεσμα. Ποτέ υπεύθυνο ή ημέρες ανοιχτό.
export function RequestBox({ request, link }: RequestBoxProps) {
  const { closing, state } = request;
  return (
    <div className="j3-req">
      <div className="j3-req-head">
        <strong>Αίτημα · {request.kind}</strong>
        <Badge tone={state === "ανοιχτό" ? "attention" : undefined}>
          {state}
        </Badge>
        {closing && <span className="muted">{fmtWhen(closing.when)}</span>}
      </div>
      {state === "ολοκληρώθηκε" && link && (
        <Link href={link.href}>{link.label}</Link>
      )}
      {state === "ολοκληρώθηκε" && closing?.comment && <p>{closing.comment}</p>}
      {state === "απορρίφθηκε" && closing?.reply && (
        <p>Απάντηση της ομάδας: {closing.reply}</p>
      )}
    </div>
  );
}
