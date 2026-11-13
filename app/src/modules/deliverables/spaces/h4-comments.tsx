"use client";

import { useCallback, useState } from "react";

import type { VideoControl } from "@/spaces/kit/video-player";

import { commentAsClient } from "../actions-client";
import { parseTimecode } from "../timecode";
import { H34Form } from "./h4-form";
import { TimeField, fillTimeOnStart } from "./video-notes-fields";

// Νέα σημείωση του πελάτη (prototype `screens/h4-comments.tsx`). Ο χρόνος mm:ss παίρνεται από τον player
// μόλις αρχίσεις να γράφεις (YouTube, Vimeo) ή γράφεται με το χέρι (Drive)· τον ξαναελέγχει ο server.
export function H4CommentForm({
  deliverableId,
  versionNumber,
  control,
}: {
  deliverableId: string;
  versionNumber: number;
  control?: VideoControl;
}) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const isTimeBad = parseTimecode(time) === undefined;
  const isValid = text.trim().length > 0 && !isTimeBad;
  const handleSuccess = useCallback(() => {
    setText("");
    setTime("");
  }, []);

  return (
    <H34Form
      action={commentAsClient}
      hidden={{ deliverableId, versionNumber: String(versionNumber) }}
      submitLabel="Προσθήκη σχολίου"
      isDisabled={!isValid}
      onSuccess={handleSuccess}
    >
      <TimeField
        control={control}
        value={time}
        onChange={setTime}
        label="Χρόνος στο video (λεπτά:δευτερόλεπτα, προαιρετικό)"
      />
      {isTimeBad && (
        <span className="muted">
          Γράψε τον χρόνο ως 0:12 (λεπτά:δευτερόλεπτα).
        </span>
      )}
      <label>
        Σχόλιο
        <input
          className="input"
          name="body"
          value={text}
          maxLength={2000}
          onFocus={() => fillTimeOnStart(control, time, setTime)}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
    </H34Form>
  );
}
