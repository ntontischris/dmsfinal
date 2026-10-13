"use client";

import { useCallback, useRef, useState } from "react";

import { decodeEvent, type AssistantEvent, type SourceView } from "./events";
import { ERROR_TEXT } from "./labels";

// Η κατάσταση του παραθύρου: οι ερωτήσεις της τρέχουσας Συζήτησης και η ροή της απάντησης από τον server.

export type TurnStatus =
  "streaming" | "done" | "unknown" | "unavailable" | "error";

export interface Turn {
  id: number;
  question: string;
  answer: string;
  status: TurnStatus;
  sources: SourceView[];
  reason?: "unavailable" | "capped";
}

export function applyEvent(turn: Turn, event: AssistantEvent): Turn {
  switch (event.type) {
    case "text":
      return { ...turn, answer: turn.answer + event.delta };
    case "done":
      return { ...turn, status: "done", sources: event.sources };
    case "unknown":
      return { ...turn, status: "unknown", answer: event.text };
    case "unavailable":
      return { ...turn, status: "unavailable", reason: event.reason };
    case "error":
      return { ...turn, status: "error", answer: event.message };
    default:
      return turn;
  }
}

async function errorOf(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message = (body as { error?: unknown } | null)?.error;
  return typeof message === "string" ? message : ERROR_TEXT;
}

async function* readEvents(response: Response): AsyncGenerator<AssistantEvent> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const event = decodeEvent(line);
      if (event) yield event;
    }
    if (done) break;
  }
  const last = decodeEvent(buffer);
  if (last) yield last;
}

export function useAssistant() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isBusy, setBusy] = useState(false);
  const conversation = useRef<string | null>(null);
  const nextId = useRef(1);

  const ask = useCallback(async (question: string) => {
    const id = nextId.current++;
    const patch = (change: (turn: Turn) => Turn) =>
      setTurns((all) =>
        all.map((turn) => (turn.id === id ? change(turn) : turn)),
      );
    setTurns((all) => [
      ...all,
      { id, question, answer: "", status: "streaming", sources: [] },
    ]);
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.current,
          question,
        }),
      });
      if (!response.ok) {
        const message = await errorOf(response);
        return patch((turn) => ({ ...turn, status: "error", answer: message }));
      }
      for await (const event of readEvents(response)) {
        if (event.type === "conversation") conversation.current = event.id;
        patch((turn) => applyEvent(turn, event));
      }
      // Η ροή έκλεισε χωρίς τελικό γεγονός (done/unknown/unavailable/error): κάτι κόπηκε στη μέση.
      patch((turn) =>
        turn.status === "streaming"
          ? { ...turn, status: "error", answer: ERROR_TEXT, sources: [] }
          : turn,
      );
    } catch {
      patch((turn) => ({ ...turn, status: "error", answer: ERROR_TEXT }));
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    conversation.current = null;
    setTurns([]);
  }, []);

  return { turns, isBusy, ask, reset };
}

export type AssistantChat = ReturnType<typeof useAssistant>;
