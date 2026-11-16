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
import {
  ArrowRight,
  CalendarClock,
  EllipsisVertical,
  GripVertical,
  MapPin,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { hrefOf } from "@/spaces/data/screens";
import { useSpacesRoot } from "@/spaces/kit/drawer";
import { Badge } from "@/spaces/ui/badge";
import {
  Card as UiCard,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/spaces/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/spaces/ui/dropdown-menu";
import { Progress } from "@/spaces/ui/progress";

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
  closedHref: string;
}

const titleOf = (filming: E1Filming): string =>
  `${filming.clientName ?? NO_CLIENT_LABEL} — ${filming.productionTitle}`;

function CrewMeter({ crew }: { crew: { confirmed: number; total: number } }) {
  const isShort = crew.confirmed < crew.total;
  const percent =
    crew.total === 0 ? 0 : Math.round((crew.confirmed / crew.total) * 100);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" aria-hidden="true" />
          Συνεργείο
        </span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            isShort ? "text-destructive" : "text-foreground",
          )}
        >
          {crew.confirmed}/{crew.total}
        </span>
      </div>
      <Progress
        value={percent}
        aria-label={`Συνεργείο ${crew.confirmed} από ${crew.total}`}
        className={cn(
          "h-1.5 bg-muted",
          isShort && "[&>[data-slot=progress-indicator]]:bg-destructive",
        )}
      />
    </div>
  );
}

function Signals({ labels }: { labels: readonly string[] }) {
  if (labels.length === 0) return null;
  return (
    <ul className="flex list-none flex-wrap gap-1.5 p-0">
      {labels.map((label) => (
        <li key={label}>
          <Badge className="gap-1 px-2.5 py-1 font-semibold">
            <TriangleAlert aria-hidden="true" />
            {label}
          </Badge>
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
  const { anchorRef, root } = useSpacesRoot();
  return (
    <>
      <span ref={anchorRef} hidden />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={`Μετακίνηση του «${titleOf(filming)}» σε…`}
        >
          <EllipsisVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          container={root}
          align="end"
          className="min-w-52 rounded-xl p-1.5"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Μετακίνηση σε…
          </DropdownMenuLabel>
          {targets.map((to) => (
            <DropdownMenuItem
              key={to}
              className="min-h-11 rounded-lg"
              onSelect={() => onMove(filming, to)}
            >
              <ArrowRight aria-hidden="true" />
              {columnTitle(to)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const signalLabelsOf = (
  filming: E1Filming,
  nowMs: number,
  isClient: boolean,
): readonly string[] =>
  (isClient ? clientSignalsOf(filming) : signalsOf(filming, nowMs)).map(
    (signal) => signal.label,
  );

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
  const crew = !isClient ? filming.crew : null;
  const labels = signalLabelsOf(filming, nowMs, isClient);
  return (
    <li
      ref={setNodeRef}
      className="e1b-card"
      data-dragging={isDragging}
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
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
      )}
      <UiCard
        className={cn(
          "gap-3 rounded-2xl py-4 shadow-none transition-colors hover:border-border-strong",
          isDraggable && "pl-6",
          isDragging && "border-primary",
        )}
      >
        <CardHeader className="gap-1 px-4">
          <CardTitle className="text-base leading-snug">
            <Link className="e1b-title" href={hrefOf("E3", { id: filming.id })}>
              {titleOf(filming)}
            </Link>
          </CardTitle>
          {isDraggable && (
            <CardAction className="-mt-1.5 -mr-2">
              <MoveMenu filming={filming} targets={targets} onMove={onMove} />
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="grid gap-1.5 px-4 text-sm">
          <p className="m-0 flex items-center gap-2 font-semibold tabular-nums">
            <CalendarClock className="size-4 text-primary" aria-hidden="true" />
            {whenLabel(filming.date, filming.start, filming.end)}
          </p>
          {filming.location && (
            <p className="m-0 flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {filming.location}
            </p>
          )}
        </CardContent>
        {(crew || labels.length > 0) && (
          <CardFooter className="flex-col items-stretch gap-3 px-4">
            {crew && <CrewMeter crew={crew} />}
            <Signals labels={labels} />
          </CardFooter>
        )}
      </UiCard>
    </li>
  );
}

function ClosedFoot({ column, href }: { column: BoardColumn; href: string }) {
  if (column.id !== "closed" || column.total === 0) return null;
  return (
    <footer className="e1b-col-foot">
      {column.total > column.filmings.length && (
        <span>
          Βλέπεις τα {column.filmings.length} πιο πρόσφατα από {column.total}.
        </span>
      )}
      <Link href={href}>Όλα τα κλειστά →</Link>
    </footer>
  );
}

function Column({
  column,
  isTarget,
  closedHref,
  children,
}: {
  column: BoardColumn;
  isTarget: boolean | null;
  closedHref: string;
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
        <span className="e1b-count">{column.total}</span>
      </header>
      {column.id === "closed" && (
        <p className="e1b-col-note">Τον τελευταίο μήνα</p>
      )}
      {column.filmings.length === 0 ? (
        <p className="e1b-empty">Τίποτα εδώ.</p>
      ) : (
        <ul className="e1b-cards">{children}</ul>
      )}
      <ClosedFoot column={column} href={closedHref} />
    </section>
  );
}

export function E1Board({
  columns,
  nowMs,
  caps,
  isClient,
  closedHref,
}: BoardProps) {
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
              closedHref={closedHref}
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
