import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import {
  approveFilming,
  cancelFilming,
  decideCancelRequest,
  rejectFilming,
} from "../actions-transitions";
import { formatDateTime } from "../helpers";
import type { FilmingCard } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

interface DecisionPanelProps {
  card: FilmingCard;
}

// Οι αποφάσεις της ομάδας: έγκριση ή απόρριψη, ακύρωση με λόγο, και απάντηση σε αίτημα ακύρωσης του Πελάτη.
// Κάθε φόρμα φαίνεται μόνο αν το viewerCan το επιτρέπει· η βάση ελέγχει ξανά.
export function DecisionPanel({ card }: DecisionPanelProps) {
  const can = card.viewerCan;
  const hasAny = can.approve || can.cancel || can.decideCancel;
  return (
    <Panel label="Αποφάσεις">
      {!hasAny ? (
        <MutedNote>Καμία απόφαση για σένα σε αυτό το Γύρισμα.</MutedNote>
      ) : (
        <div className="grid gap-5">
          {can.approve && <ApproveForms card={card} />}
          {can.decideCancel && card.cancelRequest && (
            <CancelRequestForms
              card={card}
              reason={card.cancelRequest.reason}
            />
          )}
          {can.cancel && <CancelForm filmingId={card.id} />}
        </div>
      )}
    </Panel>
  );
}

function ApproveForms({ card }: { card: FilmingCard }) {
  if (card.state !== "pending") return null;
  return (
    <div className="grid gap-3">
      <ActionForm
        action={approveFilming}
        submitLabel="Έγκριση"
        variant="primary"
        size="sm"
      >
        <input type="hidden" name="filmingId" value={card.id} />
      </ActionForm>
      <ActionForm
        action={rejectFilming}
        submitLabel="Απόρριψη"
        variant="danger"
        size="sm"
      >
        <input type="hidden" name="filmingId" value={card.id} />
        <Field label="Λόγος απόρριψης (υποχρεωτικός)">
          <Input name="reason" required maxLength={500} />
        </Field>
      </ActionForm>
    </div>
  );
}

function CancelRequestForms({ card, reason }: { card: FilmingCard; reason: string }) {
  return (
    <div className="grid gap-3">
      <p className="m-0 text-sm">
        Αίτημα ακύρωσης (
        {formatDateTime(card.cancelRequest?.at ?? card.startsAt)}): {reason}
      </p>
      <ActionForm
        action={decideCancelRequest}
        submitLabel="Δέχομαι την ακύρωση"
        variant="default"
        size="sm"
      >
        <input type="hidden" name="filmingId" value={card.id} />
        <input type="hidden" name="accept" value="accept" />
      </ActionForm>
      <ActionForm
        action={decideCancelRequest}
        submitLabel="Αρνούμαι"
        variant="default"
        size="sm"
      >
        <input type="hidden" name="filmingId" value={card.id} />
        <input type="hidden" name="accept" value="refuse" />
        <Field label="Λόγος άρνησης (προαιρετικός)">
          <Input name="reason" maxLength={500} />
        </Field>
      </ActionForm>
    </div>
  );
}

function CancelForm({ filmingId }: { filmingId: string }) {
  return (
    <ActionForm
      action={cancelFilming}
      submitLabel="Ακύρωση Γυρίσματος"
      variant="danger"
      size="sm"
    >
      <input type="hidden" name="filmingId" value={filmingId} />
      <Field label="Λόγος ακύρωσης (υποχρεωτικός)">
        <Input name="reason" required maxLength={500} />
      </Field>
    </ActionForm>
  );
}
