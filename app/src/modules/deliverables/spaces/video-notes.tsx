"use client";

import { Fragment, useEffect, useState } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import type { VideoControl } from "@/spaces/kit/video-player";
import { Badge } from "@/spaces/screens/shared";

import { formatTimecode } from "../timecode";
import { fmtDay } from "./h2-model";
import { seenLineOf, threadsOf, type NoteLike } from "./notes-model";

import "./h1.css";
import "./notes.css";

// Οι σημειώσεις πάνω στο βίντεο, ίδιες για ομάδα (H2) και πελάτη (H4): νήματα με τη σειρά του βίντεο,
// ο χρόνος πηγαίνει τον player εκεί, απάντηση, «λύθηκε» και «το είδε».

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export interface NoteView extends NoteLike {
  body: string;
  authorName: string | null;
  resolvedByName: string | null;
  seenBy: string[];
  isInternal?: boolean;
}

export interface NoteActions {
  reply: Action;
  resolve: Action;
}

interface VideoNotesProps {
  notes: readonly NoteView[];
  control?: VideoControl;
  // null: μόνο ανάγνωση (π.χ. «όπως ο πελάτης» ή παλιά Έκδοση).
  actions: NoteActions | null;
  // Πώς λέγεται όποιος δεν έχει όνομα στη λίστα (για την ομάδα «Πελάτης», για τον πελάτη «Ομάδα»).
  unnamed: string;
}

function ReplyForm({
  parentId,
  action,
  onDone,
}: {
  parentId: string;
  action: Action;
  onDone: () => void;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess: true,
  });
  useEffect(() => {
    if (state.notice) onDone();
  }, [state, onDone]);
  return (
    <form ref={formRef} className="vn-reply" onSubmit={onSubmit}>
      <input type="hidden" name="parentId" value={parentId} />
      <label>
        Απάντηση
        <input className="input" name="body" maxLength={2000} required />
      </label>
      {state.error && (
        <span className="h2-error" role="alert">
          {state.error}
        </span>
      )}
      <div className="btn-row">
        <button type="submit" className="button" disabled={isPending}>
          Στείλε την απάντηση
        </button>
        <button type="button" className="button" onClick={onDone}>
          Άκυρο
        </button>
      </div>
    </form>
  );
}

function ResolveButton({ note, action }: { note: NoteView; action: Action }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action);
  const isResolved = note.resolvedAt !== null;
  return (
    <form ref={formRef} className="vn-inline" onSubmit={onSubmit}>
      <input type="hidden" name="commentId" value={note.id} />
      <input type="hidden" name="resolved" value={isResolved ? "0" : "1"} />
      <button type="submit" className="button" disabled={isPending}>
        {isResolved ? "Ξανάνοιξέ το" : "Λύθηκε"}
      </button>
      {state.error && (
        <span className="h2-error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

function NoteLead({
  note,
  who,
  control,
}: {
  note: NoteView;
  who: string;
  control?: VideoControl;
}) {
  if (note.atSeconds === null) return <Avatar name={who} size={32} />;
  const at = note.atSeconds;
  const timecode = formatTimecode(at);
  if (!control) return <span className="sx-dots">{timecode}</span>;
  return (
    <button
      type="button"
      className="vn-time sx-dots"
      onClick={() => control.seek(at)}
      aria-label={`Πήγαινε το βίντεο στο ${timecode}`}
    >
      {timecode}
    </button>
  );
}

function SeenLine({ seenBy }: { seenBy: readonly string[] }) {
  const line = seenLineOf(seenBy);
  return line ? <p className="vn-seen muted">{line}</p> : null;
}

function Replies({
  replies,
  whoOf,
}: {
  replies: readonly NoteView[];
  whoOf: (name: string | null) => string;
}) {
  if (replies.length === 0) return null;
  return (
    <ul className="vn-replies" aria-label="Απαντήσεις">
      {replies.map((reply) => (
        <li key={reply.id}>
          <p className="vn-reply-head">
            <strong>{whoOf(reply.authorName)}</strong> ·{" "}
            {fmtDay(reply.createdAt)}
            {reply.isInternal && (
              <>
                {" "}
                <Badge tone="attention">εσωτερικό</Badge>
              </>
            )}
          </p>
          <p>{reply.body}</p>
          <SeenLine seenBy={reply.seenBy} />
        </li>
      ))}
    </ul>
  );
}

function Thread({
  note,
  replies,
  control,
  actions,
  whoOf,
}: {
  note: NoteView;
  replies: readonly NoteView[];
  control?: VideoControl;
  actions: NoteActions | null;
  whoOf: (name: string | null) => string;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const who = whoOf(note.authorName);
  const isResolved = note.resolvedAt !== null;
  return (
    <>
      <ListRow
        lead={<NoteLead note={note} who={who} control={control} />}
        title={who}
        sub={fmtDay(note.createdAt)}
        isFaded={isResolved}
        aside={
          <>
            {isResolved && (
              <Badge tone="ok">
                λύθηκε{note.resolvedByName ? ` · ${note.resolvedByName}` : ""}
              </Badge>
            )}
            {note.isInternal && <Badge tone="attention">εσωτερικό</Badge>}
          </>
        }
      />
      <li className="sx-extra">
        <p>{note.body}</p>
        <SeenLine seenBy={note.seenBy} />
        <Replies replies={replies} whoOf={whoOf} />
        {actions && isReplying && (
          <ReplyForm
            parentId={note.id}
            action={actions.reply}
            onDone={() => setIsReplying(false)}
          />
        )}
        {actions && !isReplying && (
          <div className="btn-row">
            <button
              type="button"
              className="button"
              onClick={() => setIsReplying(true)}
            >
              Απάντηση
            </button>
            <ResolveButton note={note} action={actions.resolve} />
          </div>
        )}
      </li>
    </>
  );
}

export function VideoNotes({
  notes,
  control,
  actions,
  unnamed,
}: VideoNotesProps) {
  const threads = threadsOf(notes);
  if (threads.length === 0)
    return <p className="muted">Καμία σημείωση σε αυτή την Έκδοση.</p>;
  const whoOf = (name: string | null) => name ?? unnamed;
  return (
    <RowList>
      {threads.map((thread) => (
        <Fragment key={thread.note.id}>
          <Thread
            note={thread.note}
            replies={thread.replies}
            control={control}
            actions={actions}
            whoOf={whoOf}
          />
        </Fragment>
      ))}
    </RowList>
  );
}
