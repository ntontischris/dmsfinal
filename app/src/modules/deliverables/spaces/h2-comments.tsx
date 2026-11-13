"use client";

import { useCallback, useState } from "react";

import type { VideoControl } from "@/spaces/kit/video-player";

import { addComment } from "../actions-comments";
import { H2Form } from "./h2-form";
import { TimeField, fillTimeOnStart } from "./video-notes-fields";

// Νέα σημείωση της ομάδας (prototype `screens/h2-comments.tsx`). Ο χρόνος mm:ss παίρνεται από τον player
// μόλις αρχίσεις να γράφεις (YouTube, Vimeo) ή γράφεται με το χέρι· τον ελέγχει ο server (ίδιο μήνυμα με το prototype).
export function CommentForm({
  deliverableId,
  versionNumber,
  control,
}: {
  deliverableId: string;
  versionNumber: number;
  control?: VideoControl;
}) {
  const [time, setTime] = useState("");
  const handleSuccess = useCallback(() => setTime(""), []);
  return (
    <H2Form
      key={versionNumber}
      action={addComment}
      submitLabel="Προσθήκη σχολίου"
      hidden={{ deliverableId, versionNumber: String(versionNumber) }}
      resetOnSuccess
      onSuccess={handleSuccess}
    >
      <label>
        Νέο σχόλιο
        <input
          className="input"
          name="body"
          required
          onFocus={() => fillTimeOnStart(control, time, setTime)}
        />
      </label>
      <TimeField
        control={control}
        value={time}
        onChange={setTime}
        label="Χρόνος στο video (mm:ss, προαιρετικό)"
      />
      <label className="h2-check">
        <input type="checkbox" name="isInternal" value="1" />
        Εσωτερικό (δεν το βλέπει ο πελάτης)
      </label>
    </H2Form>
  );
}
