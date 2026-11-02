"use client";

import { Fragment } from "react";

import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { addComment } from "../actions-comments";
import { formatTimecode } from "../timecode";
import type { DeliverableComment } from "../types";
import { H2Form } from "./h2-form";
import { fmtDay, whoOf } from "./h2-model";

import "./h1.css";

// Τα σχόλια μιας Έκδοσης (prototype `screens/h2-comments.tsx`). Σχόλιο χωρίς όνομα ομάδας = του πελάτη.
export function CommentList({
  comments,
}: {
  comments: readonly DeliverableComment[];
}) {
  if (comments.length === 0)
    return <p className="muted">Κανένα σχόλιο σε αυτή την Έκδοση.</p>;
  return (
    <RowList>
      {comments.map((c) => (
        <Fragment key={c.id}>
          <ListRow
            lead={
              c.atSeconds !== null ? (
                <span className="sx-dots">{formatTimecode(c.atSeconds)}</span>
              ) : (
                <Avatar name={whoOf(c.authorName)} size={32} />
              )
            }
            title={whoOf(c.authorName)}
            sub={fmtDay(c.createdAt)}
            aside={
              <>
                {c.atSeconds !== null && (
                  <Badge>{formatTimecode(c.atSeconds)}</Badge>
                )}
                {c.authorName === null && <Badge>πελάτης</Badge>}
                {c.isInternal && <Badge tone="attention">εσωτερικό</Badge>}
              </>
            }
          />
          <li className="sx-extra">
            <p>{c.body}</p>
          </li>
        </Fragment>
      ))}
    </RowList>
  );
}

// Νέο σχόλιο: ο χρόνος mm:ss είναι προαιρετικός και τον ελέγχει ο server (ίδιο μήνυμα με το prototype).
export function CommentForm({
  deliverableId,
  versionNumber,
}: {
  deliverableId: string;
  versionNumber: number;
}) {
  return (
    <H2Form
      key={versionNumber}
      action={addComment}
      submitLabel="Προσθήκη σχολίου"
      hidden={{ deliverableId, versionNumber: String(versionNumber) }}
      resetOnSuccess
    >
      <label>
        Νέο σχόλιο
        <input className="input" name="body" required />
      </label>
      <label>
        Χρόνος στο video (mm:ss, προαιρετικό)
        <input
          className="input"
          name="atSeconds"
          placeholder="0:12"
          autoComplete="off"
        />
      </label>
      <label className="h2-check">
        <input type="checkbox" name="isInternal" value="1" />
        Εσωτερικό (δεν το βλέπει ο πελάτης)
      </label>
    </H2Form>
  );
}
