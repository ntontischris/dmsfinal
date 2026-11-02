"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type { AssistantAudience } from "../components/assistant-turn";
import {
  ASSISTANT_NOTE,
  ASSISTANT_TITLE,
  RETENTION_NOTE,
  SUGGESTIONS,
  UNAVAILABLE_TEXT,
  WELCOME_TEXT,
} from "../labels";
import { QUESTION_MAX_CHARS } from "../limits";
import type { AssistantChat, Turn } from "../use-assistant";
import { A9Turn, Answer } from "./a9-turn";

// Το πάνελ A9 του prototype (`screens/A9.tsx` › Panel) ως παράθυρο: Esc κλείνει, το Tab μένει μέσα.

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

// Οι αναγνώστες οθόνης ακούνε μόνο την ολοκληρωμένη απάντηση ή την κατάσταση, όχι κάθε κομμάτι της ροής.
function announcement(turn: Turn | undefined): string {
  if (!turn || turn.status === "streaming") return "";
  if (turn.status === "unavailable")
    return UNAVAILABLE_TEXT[turn.reason ?? "unavailable"];
  return turn.answer;
}

function Welcome({
  audience,
  onPick,
}: {
  audience: AssistantAudience;
  onPick: (q: string) => void;
}) {
  return (
    <>
      <Answer>
        <p>{WELCOME_TEXT}</p>
      </Answer>
      <div className="a9-sugg">
        <span className="muted">Δοκίμασε:</span>
        {SUGGESTIONS[audience].map((question) => (
          <button
            key={question}
            type="button"
            className="button"
            onClick={() => onPick(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </>
  );
}

// Η γραμμή ερώτησης: έως 1.000 χαρακτήρες, με μετρητή.
function InputBar({
  isBusy,
  onAsk,
}: {
  isBusy: boolean;
  onAsk: (question: string) => void;
}) {
  const [text, setText] = useState("");
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = text.trim();
    if (!question || isBusy) return;
    setText("");
    onAsk(question);
  };
  return (
    <form className="a9-input" onSubmit={onSubmit}>
      <input
        className="input"
        type="text"
        aria-label="Ερώτηση"
        placeholder="Ρώτα κάτι…"
        maxLength={QUESTION_MAX_CHARS}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isBusy || text.trim() === ""}
      >
        Στείλε
      </button>
      <span className="a9-count">
        {text.length}/{QUESTION_MAX_CHARS}
      </span>
    </form>
  );
}

interface A9PanelProps {
  audience: AssistantAudience;
  chat: AssistantChat;
  onClose: () => void;
}

export function A9Panel({ audience, chat, onClose }: A9PanelProps) {
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
      className="a9-dock"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a9-title"
      onKeyDown={onKeyDown}
    >
      <section className="a9-panel" aria-label={ASSISTANT_TITLE}>
        <div className="a9-head">
          <h2 id="a9-title">{ASSISTANT_TITLE}</h2>
          <div className="a9-actions">
            <button
              type="button"
              className="button"
              onClick={chat.reset}
              disabled={chat.isBusy}
            >
              Νέα Συζήτηση
            </button>
            <button type="button" className="button" onClick={onClose}>
              Κλείσιμο
            </button>
          </div>
        </div>
        <p className="note">{ASSISTANT_NOTE}</p>
        <div className="a9-msgs">
          {chat.turns.length === 0 ? (
            <Welcome audience={audience} onPick={chat.ask} />
          ) : (
            <ol className="a9-turns">
              {chat.turns.map((turn) => (
                <A9Turn key={turn.id} turn={turn} audience={audience} />
              ))}
            </ol>
          )}
          <div ref={end} />
        </div>
        <p className="a9-live" aria-live="polite">
          {announcement(chat.turns.at(-1))}
        </p>
        <InputBar isBusy={chat.isBusy} onAsk={chat.ask} />
        <p className="muted">{RETENTION_NOTE}</p>
      </section>
    </div>
  );
}
