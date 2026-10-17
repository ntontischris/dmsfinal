import { Badge } from "@/components/ui/badge";
import { Rows } from "@/components/ui/rows";

import {
  deadlineBadge,
  fmtDay,
  GDPR_EMPTY,
  KIND_LABEL,
  SUBJECT_KIND_LABEL,
} from "../labels";
import type { GdprRequest } from "../schemas";
import { CompleteRequestForm } from "./complete-form";

// Πού ζει το υποκείμενο: Χρήστης ομάδας στη N1, Επαφή και Πελάτης στη B2. Ο Χρήστης πελάτη δεν έχει δική του σελίδα.
const subjectHref = (request: GdprRequest): string | undefined => {
  if (request.subjectKind === "team_user")
    return `/app/team/${request.subjectId}`;
  if (request.subjectKind === "client_user") return undefined;
  return `/app/clients/${request.subjectId}`;
};

function RequestMeta({ request }: { request: GdprRequest }) {
  return (
    <>
      {SUBJECT_KIND_LABEL[request.subjectKind]} · Λήψη{" "}
      {fmtDay(request.receivedOn)} · προθεσμία {fmtDay(request.deadline)}
      {request.note && <span className="block">{request.note}</span>}
    </>
  );
}

// Ν6: το μητρώο, ανοιχτά πρώτα κατά προθεσμία. Το σήμα δείχνει τις μέρες που μένουν, όπως τις μετρά η βάση.
export function RegisterList({
  requests,
}: {
  requests: readonly GdprRequest[];
}) {
  if (requests.length === 0)
    return (
      <p className="m-0 p-4 text-sm text-muted-foreground">{GDPR_EMPTY}</p>
    );
  return (
    <Rows
      isNumbered={false}
      items={requests.map((request) => {
        const title = `${KIND_LABEL[request.kind]}: ${request.subjectLabel}`;
        const badge = deadlineBadge(request);
        return {
          id: request.id,
          title,
          href: subjectHref(request),
          meta: <RequestMeta request={request} />,
          aside: (
            <>
              <Badge tone={badge.tone}>{badge.text}</Badge>
              {!request.completedOn && (
                <CompleteRequestForm id={request.id} label={title} />
              )}
            </>
          ),
        };
      })}
    />
  );
}
