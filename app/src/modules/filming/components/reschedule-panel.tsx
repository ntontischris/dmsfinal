import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import { withdrawRescheduleRequest } from "../actions-book";
import { decideRescheduleRequest } from "../actions-booking";
import { formatDateTime } from "../helpers-time";
import type { FilmingCard } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

// E3: μετάθεση. Ο Πελάτης βλέπει τη δική του (μετάθεση ή απόσυρση)· η ομάδα αποφασίζει (έγκριση ή απόρριψη με λόγο).
export function ReschedulePanel({
  card,
  newTimeProblem,
}: {
  card: FilmingCard;
  newTimeProblem: string | null;
}) {
  const offer = card.viewerCan.clientReschedule && card.agreement && card.kind;
  const { pendingReschedule, slotProblem } = card.signals;
  if (!pendingReschedule && !offer && !slotProblem) return null;
  return (
    <Panel label="Μετάθεση">
      <div className="grid gap-4">
        {slotProblem && (
          <Notice kind="empty" title="Η ώρα του Γυρίσματος έχει πρόβλημα">
            <p className="m-0">{slotProblem}</p>
          </Notice>
        )}
        {pendingReschedule && (
          <div className="grid gap-3">
            <p className="m-0 text-sm">
              Αίτημα μετάθεσης σε {formatDateTime(pendingReschedule.startsAt)} — αναμένει έγκριση.
            </p>
            {card.viewerCan.clientWithdrawReschedule && (
              <ActionForm action={withdrawRescheduleRequest} submitLabel="Απόσυρση" variant="default" size="sm">
                <input type="hidden" name="filmingId" value={card.id} />
              </ActionForm>
            )}
            {card.viewerCan.decideReschedule && (
              <DecisionForms filmingId={card.id} newTimeProblem={newTimeProblem} />
            )}
          </div>
        )}
        {offer && card.agreement && card.kind && (
          <Link
            href={`/app/book?reschedule=${card.id}&agreement=${card.agreement.id}&kind=${card.kind.id}`}
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            Μετάθεση
          </Link>
        )}
      </div>
    </Panel>
  );
}

function DecisionForms({
  filmingId,
  newTimeProblem,
}: {
  filmingId: string;
  newTimeProblem: string | null;
}) {
  return (
    <div className="grid gap-3">
      {newTimeProblem && (
        <Notice kind="empty" title="Η νέα ώρα έχει πρόβλημα">
          <p className="m-0">{newTimeProblem}</p>
        </Notice>
      )}
      <ActionForm action={decideRescheduleRequest} submitLabel="Έγκριση" variant="default" size="sm">
        <input type="hidden" name="filmingId" value={filmingId} />
        <input type="hidden" name="accept" value="accept" />
      </ActionForm>
      <ActionForm action={decideRescheduleRequest} submitLabel="Απόρριψη" variant="danger" size="sm">
        <input type="hidden" name="filmingId" value={filmingId} />
        <input type="hidden" name="accept" value="refuse" />
        <Field label="Λόγος απόρριψης">
          <Input name="reason" maxLength={500} required />
        </Field>
        <MutedNote>Η απόρριψη κρατά το Γύρισμα στην παλιά ώρα.</MutedNote>
      </ActionForm>
    </div>
  );
}
