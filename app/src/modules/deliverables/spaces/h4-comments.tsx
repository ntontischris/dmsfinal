"use client";

import { useCallback, useState } from "react";

import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { commentAsClient } from "../actions-client";
import type { ClientComment } from "../client-types";
import { formatTimecode, parseTimecode } from "../timecode";
import { fmtDay } from "./h4-adapter";
import { H34Form } from "./h4-form";

// Τα σχόλια μιας Έκδοσης όπως τα βλέπει ο πελάτης (prototype `screens/h4-comments.tsx`). Χωρίς όνομα = «Ομάδα».
const whoOf = (name: string | null): string => name ?? "Ομάδα";

export function H4CommentList({
  comments,
}: {
  comments: readonly ClientComment[];
}) {
  if (comments.length === 0)
    return <p className="muted">Δεν υπάρχουν σχόλια σε αυτή την Έκδοση.</p>;
  return (
    <RowList>
      {comments.map((c) => (
        <ListRow
          key={c.id}
          lead={
            c.atSeconds !== null ? (
              <span className="sx-dots">{formatTimecode(c.atSeconds)}</span>
            ) : (
              <Avatar name={whoOf(c.authorName)} size={32} />
            )
          }
          title={c.body}
          sub={`${whoOf(c.authorName)} · ${fmtDay(c.createdAt)}`}
          aside={
            c.atSeconds !== null && <Badge>{formatTimecode(c.atSeconds)}</Badge>
          }
        />
      ))}
    </RowList>
  );
}

// Νέο σχόλιο: ο χρόνος mm:ss τον γράφει ο ίδιος ο πελάτης (όπως στο Drive του prototype)· τον ξαναελέγχει ο server.
export function H4CommentForm({
  deliverableId,
  versionNumber,
}: {
  deliverableId: string;
  versionNumber: number;
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
      <label>
        Χρόνος στο video (λεπτά:δευτερόλεπτα, προαιρετικό)
        <input
          className="input"
          name="atSeconds"
          value={time}
          placeholder="0:12"
          autoComplete="off"
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
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
          onChange={(event) => setText(event.target.value)}
        />
      </label>
    </H34Form>
  );
}
