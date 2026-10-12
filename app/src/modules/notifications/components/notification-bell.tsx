"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";

import { refreshBell } from "../actions";
import { NOTIFICATIONS_PATH, badgeText, bellLabel } from "../helpers";
import { ALL_NOTIFICATIONS, BELL_EMPTY, NEW_BADGE } from "../labels";
import type { Bell } from "../view-schema";
import { OpenButton } from "./open-button";

// Α9: ανανέωση του μετρητή κάθε 30″, μόνο όσο η σελίδα είναι ορατή (και μόλις ξαναγίνει ορατή). Χωρίς router.refresh().
export const BELL_REFRESH_MS = 30_000;

// Η τιμή του server ισχύει μέχρι να έρθει νεότερη από το polling· νέα τιμή του server (π.χ. μετά από «Άνοιγμα») κερδίζει.
function useLiveBell(initial: Bell): Bell {
  const [polled, setPolled] = useState<{ base: Bell; bell: Bell } | null>(null);
  useEffect(() => {
    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      const next = await refreshBell();
      if (next) setPolled({ base: initial, bell: next });
    };
    const timer = setInterval(poll, BELL_REFRESH_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [initial]);
  return polled && polled.base === initial ? polled.bell : initial;
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function BellList({ bell }: { bell: Bell }) {
  if (bell.latest.length === 0)
    return (
      <p className="m-0 px-3 py-2 text-sm text-muted-foreground">
        {BELL_EMPTY}
      </p>
    );
  return (
    <ul className="m-0 grid list-none gap-0.5 p-0">
      {bell.latest.map((item) => (
        <li key={item.id}>
          <OpenButton
            id={item.id}
            className="grid w-full gap-0.5 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted"
          >
            <span className="flex items-center gap-2 font-medium">
              {!item.isRead && <span className="sr-only">{NEW_BADGE}: </span>}
              {!item.isRead && (
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-primary"
                />
              )}
              {item.title}
            </span>
            <span className="line-clamp-2 text-muted-foreground">
              {item.body}
            </span>
          </OpenButton>
        </li>
      ))}
    </ul>
  );
}

// Κλείνει με Escape ή με κλικ έξω από το καμπανάκι.
function useDismiss(
  isOpen: boolean,
  rootRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent | MouseEvent) => {
      const outside =
        event instanceof MouseEvent &&
        !rootRef.current?.contains(event.target as Node);
      if (outside || (event instanceof KeyboardEvent && event.key === "Escape"))
        onClose();
    };
    document.addEventListener("keydown", close);
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("mousedown", close);
    };
  }, [isOpen, rootRef, onClose]);
}

export function NotificationBell({ initial }: { initial: Bell }) {
  const bell = useLiveBell(initial);
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setIsOpen(false), []);
  useDismiss(isOpen, rootRef, close);
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={bellLabel(bell.unread)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="relative inline-flex size-9 items-center justify-center rounded-sm border border-transparent text-muted-foreground hover:text-foreground"
      >
        <BellIcon />
        {bell.unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destructive px-1 text-center text-xs font-semibold leading-5 text-background"
          >
            {badgeText(bell.unread)}
          </span>
        )}
      </button>
      <div
        id={panelId}
        hidden={!isOpen}
        className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border bg-card p-1 shadow-lg"
      >
        <BellList bell={bell} />
        <Link
          href={NOTIFICATIONS_PATH}
          onClick={close}
          className="mt-1 block rounded-sm border-t px-3 py-2 text-sm font-medium no-underline hover:bg-muted"
        >
          {ALL_NOTIFICATIONS}
        </Link>
      </div>
    </div>
  );
}
