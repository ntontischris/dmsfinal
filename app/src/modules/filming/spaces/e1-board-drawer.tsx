"use client";

import { useEffect, useState } from "react";

import { Drawer } from "@/spaces/kit/drawer";

import { loadFilmingCard } from "../actions-board";
import {
  approveFilming,
  cancelFilming,
  markFilmingNoShow,
  rejectFilming,
  undoFilmingOutcome,
} from "../actions-transitions";
import type { FilmingCard } from "../types";
import {
  columnTitle,
  type BoardColumnId,
  type BoardMove,
} from "./e1-board-model";
import { DecisionRow, DoneForm, MoveForm, Notes } from "./e3-actions";
import { outcomeNotes } from "./e3-outcome";
import { useRun, type FormAction } from "./e3-run";
import { LastDone, ReasonForm } from "./e3-ui";

// Η μετακίνηση στον Πίνακα ανοίγει εδώ τη φόρμα της ενέργειας (οι ίδιες με τη σελίδα Γυρίσματος). Τίποτα δεν αλλάζει
// πριν το «Επιβεβαίωση»· η κάρτα φορτώνεται από τη βάση και το viewerCan της αποφασίζει τι επιτρέπεται.

export interface PendingMove {
  filmingId: string;
  label: string;
  to: BoardColumnId;
  moves: readonly BoardMove[];
}

const MOVE_LABELS: Readonly<Record<BoardMove, string>> = {
  approve: "Έγκριση",
  reject: "Απόρριψη",
  done: "Έγινε",
  noshow: "Δεν έγινε",
  cancel: "Ακύρωση",
  move: "Νέα μέρα/ώρα",
  undo: "Αναίρεση",
};

const isPermitted = (card: FilmingCard, move: BoardMove): boolean => {
  const can = card.viewerCan;
  const byMove: Readonly<Record<BoardMove, boolean>> = {
    approve: can.approve,
    reject: can.reject,
    done: can.markDone,
    noshow: can.markNoShow,
    cancel: can.cancel,
    move: can.reschedule,
    undo: can.undo,
  };
  return byMove[move];
};

function useCard(filmingId: string) {
  const [loaded, setLoaded] = useState<{
    id: string;
    card: FilmingCard | null;
    error: string | null;
  } | null>(null);
  useEffect(() => {
    let isLive = true;
    loadFilmingCard(filmingId).then((result) => {
      if (isLive) setLoaded({ id: filmingId, ...result });
    });
    return () => {
      isLive = false;
    };
  }, [filmingId]);
  return loaded?.id === filmingId ? loaded : null;
}

interface MoveFormProps {
  card: FilmingCard;
  move: BoardMove;
  onClose: () => void;
}

function ActionForm({ card, move, onClose }: MoveFormProps) {
  const { run, isPending, result } = useRun();
  const send = (action: FormAction, fields: Record<string, string>) =>
    run(action, fields, onClose);
  const id = { filmingId: card.id };
  const formProps = { card, isPending, onSend: send, onClose };
  const reason = (
    label: string,
    confirmLabel: string,
    action: FormAction,
    isDanger = false,
  ) => (
    <ReasonForm
      label={label}
      confirmLabel={confirmLabel}
      isDanger={isDanger}
      isPending={isPending}
      onConfirm={(text) => send(action, { ...id, reason: text })}
      onClose={onClose}
    />
  );
  return (
    <div className="stack">
      {result?.tone === "error" && (
        <LastDone log={[result.text]} tone="error" />
      )}
      {move === "approve" && (
        <DecisionRow
          note="Το Γύρισμα περνά στα Προγραμματισμένα."
          isPending={isPending}
          yes={{ label: "Έγκριση", onClick: () => send(approveFilming, id) }}
          no={{ label: "Άκυρο", onClick: onClose }}
        />
      )}
      {move === "reject" &&
        reason("Λόγος απόρριψης", "Απόρριψη", rejectFilming, true)}
      {move === "done" && <DoneForm {...formProps} />}
      {move === "noshow" && (
        <DecisionRow
          note={outcomeNotes(card, "noshow").join(" ")}
          isDanger
          isPending={isPending}
          yes={{
            label: "Επιβεβαίωση «δεν έγινε»",
            onClick: () => send(markFilmingNoShow, id),
          }}
          no={{ label: "Άκυρο", onClick: onClose }}
        />
      )}
      {move === "cancel" &&
        reason("Λόγος ακύρωσης", "Ακύρωση Γυρίσματος", cancelFilming, true)}
      {move === "move" && <MoveForm {...formProps} />}
      {move === "undo" && <Notes lines={outcomeNotes(card, "undo")} />}
      {move === "undo" &&
        reason("Λόγος αναίρεσης", "Αναίρεση", undoFilmingOutcome)}
    </div>
  );
}

function Body({
  pending,
  onClose,
}: {
  pending: PendingMove;
  onClose: () => void;
}) {
  const loaded = useCard(pending.filmingId);
  const [chosen, setChosen] = useState<BoardMove | null>(
    pending.moves.length === 1 ? pending.moves[0]! : null,
  );
  if (loaded === null) return <p className="muted">Φόρτωση…</p>;
  if (loaded.card === null) return <p className="note">{loaded.error}</p>;
  const card = loaded.card;
  const allowed = pending.moves.filter((move) => isPermitted(card, move));
  if (allowed.length === 0)
    return (
      <p className="note">
        Αυτή η μετακίνηση δεν επιτρέπεται για αυτό το Γύρισμα.
      </p>
    );
  const move = chosen !== null && allowed.includes(chosen) ? chosen : null;
  return (
    <div className="stack">
      <p className="muted">{pending.label}</p>
      {allowed.length > 1 && (
        <div className="btn-row" role="group" aria-label="Τι έγινε">
          {allowed.map((option) => (
            <button
              key={option}
              type="button"
              className="button"
              aria-pressed={option === move}
              data-primary={option === move ? "true" : undefined}
              onClick={() => setChosen(option)}
            >
              {MOVE_LABELS[option]}
            </button>
          ))}
        </div>
      )}
      {move !== null && (
        <ActionForm key={move} card={card} move={move} onClose={onClose} />
      )}
    </div>
  );
}

export function BoardMoveDrawer({
  pending,
  onClose,
}: {
  pending: PendingMove | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      isOpen={pending !== null}
      title={pending ? `Μετακίνηση σε «${columnTitle(pending.to)}»` : ""}
      onClose={onClose}
    >
      {pending && (
        <Body
          key={`${pending.filmingId}-${pending.to}`}
          pending={pending}
          onClose={onClose}
        />
      )}
    </Drawer>
  );
}
