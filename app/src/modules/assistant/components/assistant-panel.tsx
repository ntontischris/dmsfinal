"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";

import {
  ASSISTANT_NOTE,
  ASSISTANT_TITLE,
  RETENTION_NOTE,
  SUGGESTIONS,
  WELCOME_TEXT,
} from "../labels";
import type { AssistantChat } from "../use-assistant";
import { AssistantComposer } from "./assistant-composer";
import { AssistantTurn, type AssistantAudience } from "./assistant-turn";

// Το παράθυρο A9: panel στο desktop, πλήρης οθόνη στο κινητό. Esc κλείνει, το Tab μένει μέσα στο παράθυρο.

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function trapFocus(event: KeyboardEvent<HTMLElement>, root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

interface PanelProps {
  audience: AssistantAudience;
  chat: AssistantChat;
  onClose: () => void;
}

function Welcome({
  audience,
  onPick,
}: {
  audience: AssistantAudience;
  onPick: (q: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="m-0 max-w-[92%] rounded-md border px-3 py-2 text-sm">
        {WELCOME_TEXT}
      </p>
      <div className="grid justify-items-start gap-1">
        <span className="text-sm text-muted-foreground">Δοκίμασε:</span>
        {SUGGESTIONS[audience].map((question) => (
          <Button
            key={question}
            size="sm"
            className="max-w-full text-left"
            onClick={() => onPick(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AssistantPanel({ audience, chat, onClose }: PanelProps) {
  const root = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("input")?.focus();
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [chat.turns]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab" && root.current) {
      trapFocus(event, root.current);
    }
  };
  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-40 flex flex-col gap-3 bg-card p-3 md:inset-auto md:right-4 md:bottom-4 md:h-[min(40rem,calc(100dvh-6rem))] md:w-[26rem] md:rounded-md md:border"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="assistant-title" className="m-0 text-base font-semibold">
          {ASSISTANT_TITLE}
        </h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={chat.reset} disabled={chat.isBusy}>
            Νέα Συζήτηση
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Κλείσιμο
          </Button>
        </div>
      </div>
      <p className="m-0 text-sm text-muted-foreground">{ASSISTANT_NOTE}</p>
      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        {chat.turns.length === 0 ? (
          <Welcome audience={audience} onPick={chat.ask} />
        ) : (
          <ol className="m-0 grid list-none gap-3 p-0">
            {chat.turns.map((turn) => (
              <AssistantTurn key={turn.id} turn={turn} audience={audience} />
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>
      <AssistantComposer isBusy={chat.isBusy} onAsk={chat.ask} />
      <p className="m-0 text-sm text-muted-foreground">{RETENTION_NOTE}</p>
    </div>
  );
}
