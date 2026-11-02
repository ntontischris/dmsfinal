import Link from "next/link";

import { Badge } from "@/spaces/screens/shared";

import type { J3Link, J3Request } from "./j3-adapter";

import "./j3.css";

export function J3LinkView({ link }: { link: J3Link }) {
  return link.isExternal ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer">
      {link.label}
    </a>
  ) : (
    <Link href={link.href}>{link.label}</Link>
  );
}

// Ό,τι βλέπει ο πελάτης για ένα Αίτημα (prototype `screens/j3-request-box.tsx`): είδος, κατάσταση, αποτέλεσμα.
// Ποτέ υπεύθυνο ή ημέρες ανοιχτό.
export function RequestBox({ request }: { request: J3Request }) {
  return (
    <div className="j3-req">
      <div className="j3-req-head">
        <strong>{request.title}</strong>
        <Badge tone={request.isOpen ? "attention" : undefined}>
          {request.state}
        </Badge>
        {request.closedWhen && (
          <span className="muted">{request.closedWhen}</span>
        )}
      </div>
      {request.links.map((link) => (
        <J3LinkView key={link.href} link={link} />
      ))}
      {request.comment && <p>{request.comment}</p>}
      {request.reply && <p>Απάντηση της ομάδας: {request.reply}</p>}
    </div>
  );
}
