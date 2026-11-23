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
import { nearestStage, resolveStage, type Override } from "./b3-drag-target";

// Πόσα pixel πρέπει να κινηθεί ο δείκτης για να θεωρηθεί σύρσιμο και όχι κλικ.
const DRAG_THRESHOLD = 6;
const CONTROLS = "button, select, input, textarea, label";

interface Grab {
  id: string;
  base: string;
  from: string;
  el: HTMLElement;
  x: number;
  y: number;
  isDragging: boolean;
}

// Η Στήλη όπου θα πέσει η κάρτα: η πιο κοντινή στον δείκτη, ακόμα κι αν αφεθεί σε κενό ή κάτω από κοντή Στήλη.
const stageAt = (x: number, y: number): string | null =>
  nearestStage(
    [...document.querySelectorAll<HTMLElement>("[data-stage-id]")].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.dataset.stageId ?? "",
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
        };
      },
    ),
    x,
    y,
  );

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
  const [moved, setMoved] = useState<Readonly<Record<string, Override>>>({});
  const [overStage, setOverStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const grabRef = useRef<Grab | null>(null);

  const stageOf = (card: BoardCard): string =>
    resolveStage(card.stageId, moved[card.id]);

  const save = (grab: Grab, to: string) => {
    const { id, base } = grab;
    setError(null);
    setMoved((prev) => ({ ...prev, [id]: { base, to } }));
    const form = new FormData();
    form.set("opportunityId", id);
    form.set("stageId", to);
    startTransition(async () => {
      const result = await moveOpportunityStage(INITIAL_FORM_STATE, form);
      if (!result.error) return router.refresh();
      setError(result.error);
      setMoved((prev) => ({ ...prev, [id]: { base, to: base } }));
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
    if (to && to !== grab.from) save(grab, to);
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
          base: card.stageId,
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
