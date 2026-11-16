"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";

import { NO_CLIENT_LABEL } from "../labels";
import { BoardMoveDrawer, type PendingMove } from "./e1-board-drawer";
import {
  columnTitle,
  movesFor,
  targetsOf,
  type BoardCaps,
  type BoardColumn,
  type BoardColumnId,
} from "./e1-board-model";
import { whenLabel } from "./e1-format";
import { clientSignalsOf, signalsOf, type E1Filming } from "./e1-groups";

// Ο Πίνακας της E1: σύρε μια κάρτα σε άλλη στήλη ή πάτα «Μετακίνηση σε…». Η μετακίνηση ανοίγει το συρτάρι με τη
// φόρμα της ενέργειας· σύρεται μόνο ό,τι έχει επιτρεπτό προορισμό, και ο Χρήστης πελάτη μόνο βλέπει.

interface BoardProps {
  columns: readonly BoardColumn[];
  nowMs: number;
  caps: BoardCaps;
  isClient: boolean;
}

const titleOf = (filming: E1Filming): string =>
  `${filming.clientName ?? NO_CLIENT_LABEL} — ${filming.productionTitle}`;

function Signals({
  filming,
  nowMs,
  isClient,
}: {
  filming: E1Filming;
  nowMs: number;
  isClient: boolean;
}) {
  const labels = isClient
    ? clientSignalsOf(filming).map((signal) => signal.label)
    : signalsOf(filming, nowMs).map((signal) => signal.label);
  const crew =
    !isClient && filming.crew
      ? `Συνεργείο ${filming.crew.confirmed}/${filming.crew.total}`
      : null;
  const isCrewShort =
    filming.crew !== null && filming.crew.confirmed < filming.crew.total;
  if (labels.length === 0 && crew === null) return null;
  return (
    <ul className="e1b-signals">
      {crew && <li data-attention={isCrewShort}>{crew}</li>}
      {labels.map((label) => (
        <li key={label} data-attention="true">
          {label}
        </li>
      ))}
    </ul>
  );
}

interface CardProps {
  filming: E1Filming;
  targets: readonly BoardColumnId[];
  nowMs: number;
  isClient: boolean;
  onMove: (filming: E1Filming, to: BoardColumnId) => void;
}

function MoveMenu({
  filming,
  targets,
  onMove,
}: Pick<CardProps, "filming" | "targets" | "onMove">) {
  return (
    <details className="e1b-menu">
      <summary>Μετακίνηση σε…</summary>
      <div className="e1b-menu-pop">
        {targets.map((to) => (
          <button
            key={to}
            type="button"
            className="button"
            onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              onMove(filming, to);
            }}
          >
            {columnTitle(to)}
          </button>
        ))}
      </div>
    </details>
  );
}

function Card({ filming, targets, nowMs, isClient, onMove }: CardProps) {
  const isDraggable = targets.length > 0;
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: filming.id,
      disabled: !isDraggable,
    });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <li
      ref={setNodeRef}
      className="e1b-card"
      data-dragging={isDragging}
      data-draggable={isDraggable}
      style={style}
    >
      {isDraggable && (
        <button
          type="button"
          className="e1b-grip"
          aria-label={`Σύρε το «${titleOf(filming)}»`}
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true">⋮⋮</span>
        </button>
      )}
      <Link className="e1b-title" href={hrefOf("E3", { id: filming.id })}>
        {titleOf(filming)}
      </Link>
      <p className="e1b-when">
        {whenLabel(filming.date, filming.start, filming.end)}
      </p>
      {filming.location && <p className="e1b-where">{filming.location}</p>}
      <Signals filming={filming} nowMs={nowMs} isClient={isClient} />
      {isDraggable && (
        <MoveMenu filming={filming} targets={targets} onMove={onMove} />
      )}
    </li>
  );
}

function Column({
  column,
  isTarget,
  children,
}: {
  column: BoardColumn;
  isTarget: boolean | null;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: isTarget === false,
  });
  return (
    <section
      ref={setNodeRef}
      className="e1b-col"
      aria-label={column.title}
      data-attention={column.isAttention && column.filmings.length > 0}
      data-target={isTarget === null ? undefined : isTarget}
      data-over={isOver && isTarget === true}
    >
      <header className="e1b-col-head">
        <h2>{column.title}</h2>
        <span className="e1b-count">{column.filmings.length}</span>
      </header>
      {column.filmings.length === 0 ? (
        <p className="e1b-empty">Τίποτα εδώ.</p>
      ) : (
        <ul className="e1b-cards">{children}</ul>
      )}
    </section>
  );
}

export function E1Board({ columns, nowMs, caps, isClient }: BoardProps) {
  const [dragged, setDragged] = useState<E1Filming | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const all = columns.flatMap((column) => column.filmings);
  const draggedTargets = dragged ? targetsOf(dragged, nowMs, caps) : null;
  const requestMove = (filming: E1Filming, to: BoardColumnId) => {
    const moves = movesFor(filming, to, nowMs, caps);
    if (moves.length > 0)
      setPending({ filmingId: filming.id, label: titleOf(filming), to, moves });
  };
  const handleDragStart = (event: DragStartEvent) =>
    setDragged(all.find((filming) => filming.id === event.active.id) ?? null);
  const handleDragEnd = (event: DragEndEvent) => {
    setDragged(null);
    const filming = all.find((item) => item.id === event.active.id);
    const to = columns.find((column) => column.id === event.over?.id)?.id;
    if (filming && to) requestMove(filming, to);
  };
  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDragged(null)}
      >
        <div className="e1b-board" aria-label="Πίνακας Γυρισμάτων">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              isTarget={
                draggedTargets === null
                  ? null
                  : draggedTargets.includes(column.id)
              }
            >
              {column.filmings.map((filming) => (
                <Card
                  key={filming.id}
                  filming={filming}
                  targets={isClient ? [] : targetsOf(filming, nowMs, caps)}
                  nowMs={nowMs}
                  isClient={isClient}
                  onMove={requestMove}
                />
              ))}
            </Column>
          ))}
        </div>
      </DndContext>
      <BoardMoveDrawer pending={pending} onClose={() => setPending(null)} />
    </>
  );
}
