"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { DeliverableCandidates } from "@/modules/deliverables";

import type { ThreadProduction } from "../view-schema";
import { filmingFromRequestHref } from "./guide-signal";
import type { J2Request } from "./j2-adapter";
import { DeliverableFromRequest } from "./j2-deliverable-form";
import { ProductionPick } from "./j2-request-help";

// Ό,τι χρειάζεται η φόρμα νέου Παραδοτέου (υποψήφια της Παραγωγής) ή ένα κείμενο γιατί δεν υπάρχει.
// isSuggested = το Αίτημα δεν έχει ετικέτα και η Παραγωγή προτάθηκε.
export type DeliverableSource =
  | {
      productionId: string;
      isSuggested: boolean;
      defaultTitle: string;
      candidates: DeliverableCandidates;
    }
  | { note: string; needsTag?: boolean };

export interface RequestActionsProps {
  messageId: string;
  clientId: string;
  request: J2Request;
  assignable: readonly { id: string; name: string }[];
  deliverable: DeliverableSource;
  // Οι Παραγωγές για την ετικέτα του «Νέο Παραδοτέο» (κενό = δεν μπορεί να βάλει ετικέτα).
  productions: readonly ThreadProduction[];
  viewerId: string | null;
  hasAgreement: boolean;
}

// Ο σύνδεσμος του «Κλείσιμο Γυρίσματος» (μέσα στον οδηγό, μέσω του «Στήνω γύρισμα»).
export function useFilmingHref(messageId: string, clientId: string): string {
  const pathname = usePathname();
  const search = useSearchParams();
  return filmingFromRequestHref(
    `/app/filming/new?fromRequest=${messageId}&client=${clientId}`,
    { pathname, search },
  );
}

// Η Παραγωγή του νέου Παραδοτέου: προτεινόμενη και αλλάζει εδώ, ή κείμενο γιατί δεν γίνεται.
export function DeliverablePart(
  props: RequestActionsProps & { submitLabel?: string; onDone: () => void; onCancel?: () => void },
) {
  const { messageId, deliverable, productions, viewerId } = props;
  if ("note" in deliverable)
    return deliverable.needsTag ? (
      <ProductionPick messageId={messageId} productions={productions} selected={null} />
    ) : (
      <p className="muted">{deliverable.note}</p>
    );
  return (
    <>
      {deliverable.isSuggested && productions.length > 1 && (
        <ProductionPick
          messageId={messageId}
          productions={productions}
          selected={deliverable.productionId}
        />
      )}
      <DeliverableFromRequest
        messageId={messageId}
        productionId={deliverable.productionId}
        defaultTitle={deliverable.defaultTitle}
        candidates={deliverable.candidates}
        viewerId={viewerId}
        submitLabel={props.submitLabel}
        onDone={props.onDone}
        onCancel={props.onCancel}
      />
    </>
  );
}

