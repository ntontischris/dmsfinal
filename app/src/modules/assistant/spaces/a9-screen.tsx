"use client";

import { useRef, useState } from "react";

import type { AssistantAudience } from "../components/assistant-turn";
import { ASSISTANT_TITLE } from "../labels";
import { useAssistant } from "../use-assistant";
import { A9Panel } from "./a9-panel";

import "./a9.css";

// A9 Βοηθός στη νέα εμφάνιση: το κουμπί σε κάθε οθόνη του /app ανοίγει το πάνελ του prototype (στο κινητό σε όλη την
// οθόνη). Ίδια συμπεριφορά με τον AssistantLauncher: η Συζήτηση κρατιέται όσο μένεις στη σελίδα, και όταν κλείνει το
// παράθυρο· «Νέα Συζήτηση» ξεκινά από την αρχή.
export function SpacesAssistant({ audience }: { audience: AssistantAudience }) {
  const [isOpen, setOpen] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const chat = useAssistant();
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus());
  };
  return (
    <div data-spaces>
      {!isOpen && (
        <button
          ref={launcher}
          type="button"
          className="button a9-launch"
          data-primary="true"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          {ASSISTANT_TITLE}
        </button>
      )}
      {isOpen && <A9Panel audience={audience} chat={chat} onClose={close} />}
    </div>
  );
}
