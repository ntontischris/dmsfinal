"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

import { QUESTION_MAX_CHARS } from "../limits";

// Η γραμμή ερώτησης: έως 1.000 χαρακτήρες (φράγμα 4), με μετρητή.
export function AssistantComposer({
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
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="Ερώτηση"
        placeholder="Ρώτα κάτι…"
        maxLength={QUESTION_MAX_CHARS}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-w-0 flex-[1_1_10rem]"
      />
      <Button
        type="submit"
        variant="primary"
        disabled={isBusy || text.trim() === ""}
      >
        Στείλε
      </Button>
      <span className="text-sm text-muted-foreground tabular-nums">
        {text.length}/{QUESTION_MAX_CHARS}
      </span>
    </form>
  );
}
