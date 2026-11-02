"use client";

import { useEffect, useRef } from "react";

import type { FormState } from "@/lib/form-state";

import { useFileTask } from "../export/components/use-file-task";
import { EXPORTING } from "../export/labels";

// Το DoneButton του prototype (`components/feedback-buttons.tsx`) πάνω σε πραγματική εργασία «φτιάξε και κατέβασε αρχείο»:
// το ίδιο κουμπί και το ίδιο μήνυμα δίπλα του (✓ / !), που παίρνει την εστίαση όταν φανεί.
export function FileButton(props: {
  label: string;
  isPrimary?: boolean;
  task: () => Promise<FormState>;
}) {
  const { isPending, state, run } = useFileTask();
  const ref = useRef<HTMLSpanElement>(null);
  const text = state.error ?? state.notice ?? null;
  const isError = state.error !== undefined;
  useEffect(() => {
    if (text !== null) ref.current?.focus();
  }, [text]);
  return (
    <>
      <button
        type="button"
        className="button"
        data-primary={props.isPrimary ? "true" : undefined}
        disabled={isPending}
        onClick={() => run(props.task)}
      >
        {isPending ? EXPORTING : props.label}
      </button>
      <span
        ref={ref}
        className="feedback-msg"
        data-tone={isError ? "error" : "ok"}
        data-shown={text !== null}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        tabIndex={-1}
      >
        {text && (
          <>
            <span aria-hidden="true">{isError ? "!" : "✓"}</span> {text}
          </>
        )}
      </span>
    </>
  );
}
