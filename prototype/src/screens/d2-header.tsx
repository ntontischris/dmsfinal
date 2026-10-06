"use client";

import Link from "next/link";

import { costOfAgreement, statusLabel } from "@/data/agreements";
import { revisionNumber, type Contact } from "@/screens/d2-model";
import type { SectionProps } from "@/screens/d2-ui";
import { Badge } from "@/screens/shared";

export interface D2Context {
  clientName: string;
  clientHref: string | null;
  opportunity: { title: string; href: string } | null;
  ownerName: string;
  actor: string;
  contacts: readonly Contact[];
}

interface HeaderProps extends SectionProps {
  context: D2Context;
}

export function D2Header({
  draft,
  update,
  isEditing,
  caps,
  context,
}: HeaderProps) {
  const isTeam = !caps.isClient;
  const isLowMargin =
    caps.canSeeCost &&
    draft.lines.length > 0 &&
    costOfAgreement(draft).isLowMargin;
  return (
    <header className="d2-header">
      {isEditing ? (
        <input
          className="input d2-title"
          aria-label="Τίτλος Συμφωνίας"
          placeholder="Τίτλος, π.χ. Βίντεο εγκαινίων"
          value={draft.title}
          onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
        />
      ) : (
        <h1>{draft.title || "Χωρίς τίτλο"}</h1>
      )}
      <p className="muted">
        {context.clientHref ? (
          <Link href={context.clientHref}>{context.clientName}</Link>
        ) : (
          context.clientName
        )}
        {isTeam && context.opportunity && (
          <>
            {" · Ευκαιρία "}
            <Link href={context.opportunity.href}>
              {context.opportunity.title}
            </Link>
          </>
        )}
        {isTeam && ` · Υπεύθυνος: ${context.ownerName}`}
      </p>
      <span className="btn-row">
        <Badge tone="strong">
          {caps.isClient && draft.state === "πρόταση"
            ? "πρόταση"
            : statusLabel(draft)}
        </Badge>
        <Badge>{draft.kind}</Badge>
        {isTeam && <Badge>αναθεώρηση {revisionNumber(draft)}</Badge>}
        {isLowMargin && <Badge tone="attention">χαμηλό περιθώριο</Badge>}
        {caps.isReadOnly && isTeam && <Badge>Μόνο ανάγνωση</Badge>}
      </span>
    </header>
  );
}
