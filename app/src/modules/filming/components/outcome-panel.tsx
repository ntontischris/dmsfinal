import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import {
  markFilmingDone,
  markFilmingNoShow,
  undoFilmingOutcome,
} from "../actions-transitions";
import { athensDate, athensTime } from "../helpers-time";
import { RescheduleForm } from "./reschedule-form";
import type { FilmingCard } from "../types";

import { ActionForm } from "./action-form";
import { TwoStepAction } from "./two-step-action";
import { MutedNote } from "./form-fields";

interface OutcomePanelProps {
  card: FilmingCard;
  defaultHours: number | null;
}

// Το αποτέλεσμα και η μετάθεση: «έγινε», «δεν έγινε», αλλαγή ώρας και αναίρεση με λόγο. Τα πεδία έχουν τις τιμές του Γυρίσματος.
export function OutcomePanel({ card, defaultHours }: OutcomePanelProps) {
  const can = card.viewerCan;
  const hasAny = can.markDone || can.markNoShow || can.reschedule || can.undo;
  if (!hasAny) return null;
  return (
    <Panel label="Αποτέλεσμα και μετάθεση">
      <div className="grid gap-5">
        {can.markDone && <DoneForms card={card} />}
        {can.reschedule && (
          <RescheduleForm
            filmingId={card.id}
            date={athensDate(card.startsAt)}
            time={athensTime(card.startsAt)}
            hours={card.hours}
            measure={card.kind?.measure ?? null}
            defaultHours={defaultHours}
          />
        )}
        {can.undo && <UndoForm filmingId={card.id} />}
      </div>
    </Panel>
  );
}

function DoneForms({ card }: { card: FilmingCard }) {
  return (
    <div className="grid gap-3">
      <ActionForm
        action={markFilmingDone}
        submitLabel="Έγινε"
        variant="primary"
        size="sm"
      >
        <input type="hidden" name="filmingId" value={card.id} />
        <Field
          label="Πραγματικές ώρες"
          hint="Προσυμπληρώνεται με τις κλεισμένες ώρες."
        >
          <Input
            name="actualHours"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0.5"
            max="24"
            required
            defaultValue={card.hours}
          />
        </Field>
      </ActionForm>
      {card.viewerCan.markNoShow && (
        <TwoStepAction
          action={markFilmingNoShow}
          triggerLabel="Δεν έγινε"
          confirmLabel="Ναι, δεν έγινε"
          question="Το «δεν έγινε» καίει την Παροχή, αν το ορίζει ο Κανόνας της Συμφωνίας."
        >
          <input type="hidden" name="filmingId" value={card.id} />
        </TwoStepAction>
      )}
    </div>
  );
}

function UndoForm({ filmingId }: { filmingId: string }) {
  return (
    <div className="grid gap-2">
      <MutedNote>
        Η αναίρεση γυρίζει το Γύρισμα σε «προγραμματισμένο». Θέλει λόγο.
      </MutedNote>
      <ActionForm
        action={undoFilmingOutcome}
        submitLabel="Αναίρεση αποτελέσματος"
        variant="default"
        size="sm"
      >
        <input type="hidden" name="filmingId" value={filmingId} />
        <Field label="Λόγος αναίρεσης (υποχρεωτικός)">
          <Input name="reason" required maxLength={500} />
        </Field>
      </ActionForm>
    </div>
  );
}
