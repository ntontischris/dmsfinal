import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";

import {
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  NO_AMOUNTS_NOTE,
  PARTIAL_BADGE,
} from "../labels";
import { RetryButton } from "./retry-button";

// Κοινά κομμάτια των σωμάτων Αναφορών: σφάλμα με «Ξαναδοκίμασε», άδειο, «ως σήμερα», σημείωση χωρίς ποσά.

export function ReportError({ title }: { title: string }) {
  return (
    <Notice kind="error" title={LOAD_ERROR_TITLE(title)}>
      <p className="m-0">{LOAD_ERROR_TEXT}</p>
      <RetryButton />
    </Notice>
  );
}

export function ReportEmpty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Notice kind="empty" title={title}>
      <p className="m-0">{children}</p>
    </Notice>
  );
}

export function PartialBadge({ isPartial }: { isPartial: boolean }) {
  return isPartial ? <Badge tone="strong">{PARTIAL_BADGE}</Badge> : null;
}

export function ReportNote({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground">{children}</p>;
}

// Ό,τι κάνουν όλα τα σώματα γύρω από τα δεδομένα: σημείωση χωρίς ποσά πάνω, ενέργειες (Ργ) κάτω.
export function ReportFrame(props: {
  amounts: boolean;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-4">
      {!props.amounts && <ReportNote>{NO_AMOUNTS_NOTE}</ReportNote>}
      {props.children}
      {props.actions}
    </div>
  );
}
