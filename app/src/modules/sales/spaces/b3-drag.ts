"use client";

import { useRouter } from "next/navigation";
import {
  startTransition,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { moveOpportunityStage } from "../actions-opportunities";
import type { BoardCard } from "./b3-adapter";

// Πόσα pixel πρέπει να κινηθεί ο δείκτης για να θεωρηθεί σύρσιμο και όχι κλικ.
const DRAG_THRESHOLD = 6;
const CONTROLS = "button, select, input, textarea, label";

interface Grab {
  id: string;
  from: string;
  el: HTMLElement;
  x: number;
  y: number;
  isDragging: boolean;
}

// Η Στήλη κάτω από τον δείκτη (η κάρτα που σέρνεται δεν πιάνει τον δείκτη όσο κινείται).
const stageAt = (x: number, y: number): string | null =>
  document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-stage-id]")
    ?.getAttribute("data-stage-id") ?? null;

function lift(grab: Grab, dx: number, dy: number) {
  grab.el.style.transform = `translate(${dx}px, ${dy}px) rotate(1.5deg)`;
  grab.el.style.pointerEvents = "none";
  grab.el.dataset.dragging = "true";
}

function settle(grab: Grab) {
  grab.el.style.transform = "";
  grab.el.style.pointerEvents = "";
  delete grab.el.dataset.dragging;
}

// Ένα κλικ αμέσως μετά από σύρσιμο (π.χ. πάνω στον τίτλο-σύνδεσμο) δεν ανοίγει τη σελίδα.
function swallowNextClick() {
  const stop = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", stop, true), 300);
}

// Σύρσιμο κάρτας σε άλλη Στήλη με ποντίκι, αφή ή γραφίδα: η κάρτα πάει αμέσως εκεί και στέλνεται
// η ίδια ενέργεια με τη λίστα «Μετακίνηση σε Στάδιο». Αν γυρίσει λάθος, η κάρτα γυρίζει πίσω.
export function useStageDrag() {
  const router = useRouter();
  const [moved, setMoved] = useState<Readonly<Record<string, string>>>({});
  const [overStage, setOverStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const grabRef = useRef<Grab | null>(null);

  const stageOf = (card: BoardCard): string => moved[card.id] ?? card.stageId;

  const save = (id: string, from: string, to: string) => {
    setError(null);
    setMoved((prev) => ({ ...prev, [id]: to }));
    const form = new FormData();
    form.set("opportunityId", id);
    form.set("stageId", to);
    startTransition(async () => {
      const result = await moveOpportunityStage(INITIAL_FORM_STATE, form);
      if (!result.error) return router.refresh();
      setError(result.error);
      setMoved((prev) => ({ ...prev, [id]: from }));
    });
  };

  const onMove = (event: ReactPointerEvent) => {
    const grab = grabRef.current;
    if (!grab) return;
    const dx = event.clientX - grab.x;
    const dy = event.clientY - grab.y;
    if (!grab.isDragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    grab.isDragging = true;
    lift(grab, dx, dy);
    setOverStage(stageAt(event.clientX, event.clientY));
  };

  const onUp = (event: ReactPointerEvent) => {
    const grab = grabRef.current;
    grabRef.current = null;
    setOverStage(null);
    if (!grab?.isDragging) return;
    const to = stageAt(event.clientX, event.clientY);
    settle(grab);
    swallowNextClick();
    if (to && to !== grab.from) save(grab.id, grab.from, to);
  };

  const onCancel = () => {
    const grab = grabRef.current;
    grabRef.current = null;
    setOverStage(null);
    if (grab?.isDragging) settle(grab);
  };

  const cardProps = (card: BoardCard) => {
    if (!card.canWork) return {};
    return {
      "data-draggable": "true",
      onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest(CONTROLS)) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        grabRef.current = {
          id: card.id,
          from: stageOf(card),
          el: event.currentTarget,
          x: event.clientX,
          y: event.clientY,
          isDragging: false,
        };
      },
      onPointerMove: onMove,
      onPointerUp: onUp,
      onPointerCancel: onCancel,
      onDragStart: (event: ReactDragEvent) => event.preventDefault(),
    };
  };

  const columnProps = (stageId: string) => ({
    "data-stage-id": stageId,
    "data-drop-over": overStage === stageId || undefined,
  });

  return { stageOf, cardProps, columnProps, error };
}
