"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { ASSISTANT_TITLE } from "../labels";
import { useAssistant } from "../use-assistant";
import { AssistantPanel } from "./assistant-panel";
import type { AssistantAudience } from "./assistant-turn";

// Το κουμπί του Βοηθού σε κάθε οθόνη του /app. Ανοίγει το παράθυρο (στο κινητό σε όλη την οθόνη). Η Συζήτηση κρατιέται όσο
// μένεις στη σελίδα, και όταν κλείνεις το παράθυρο· «Νέα Συζήτηση» ξεκινά από την αρχή.
export function AssistantLauncher({
  audience,
}: {
  audience: AssistantAudience;
}) {
  const [isOpen, setOpen] = useState(false);
  const launcher = useRef<HTMLSpanElement>(null);
  const chat = useAssistant();
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.querySelector("button")?.focus());
  };
  return (
    <>
      {!isOpen && (
        <span ref={launcher} className="fixed right-4 bottom-4 z-30">
          <Button
            variant="primary"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            {ASSISTANT_TITLE}
          </Button>
        </span>
      )}
      {isOpen && (
        <AssistantPanel audience={audience} chat={chat} onClose={close} />
      )}
    </>
  );
}
