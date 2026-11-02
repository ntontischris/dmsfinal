"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type ChangeEvent } from "react";

import { sendMessage } from "../actions";
import { ATTACHMENT_ACCEPT, formatSize } from "../attachment-rules";
import { ATTACH_HINT } from "../labels";
import {
  useAttachmentUploads,
  type UploadItem,
} from "../use-attachment-uploads";
import type { ThreadProduction, WritableClient } from "../view-schema";
import { mentionsIn } from "./j2-adapter";
import { JForm } from "./j2-form";

interface ComposerProps {
  clientId: string;
  clientName: string;
  productions: readonly ThreadProduction[];
  canWriteUntagged: boolean;
  mentionable: readonly WritableClient[];
  defaultTag: string;
  editMinutes: number;
}

const statusOf = (item: UploadItem): string =>
  item.status === "uploading"
    ? " · ανεβαίνει…"
    : item.status === "failed"
      ? " · δεν ανέβηκε"
      : "";

// Ο συντάκτης του prototype (`screens/j2-composer.tsx`): «Προς πελάτη» ή «Εσωτερικό Μήνυμα», ετικέτα, κείμενο,
// @αναφορές (μόνο σε Εσωτερικά) και συνημμένα. Στέλνει στο πραγματικό sendMessage· τα αρχεία ανεβαίνουν απευθείας στο Storage.
export function Composer({
  clientId,
  clientName,
  productions,
  canWriteUntagged,
  mentionable,
  defaultTag,
  editMinutes,
}: ComposerProps) {
  const router = useRouter();
  const uploads = useAttachmentUploads();
  const resetUploads = uploads.reset;
  const fileRef = useRef<HTMLInputElement>(null);
  const [isInternal, setInternal] = useState(false);
  const [tag, setTag] = useState(defaultTag);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<readonly string[]>([]);

  // Μετά από κάθε αποστολή: καθαρίζει τον συντάκτη και ανανεώνει τη Συνομιλία αμέσως (Μ2).
  const handleSent = useCallback(() => {
    setInternal(false);
    setText("");
    setPicked([]);
    setTag(defaultTag);
    resetUploads();
    router.refresh();
  }, [router, resetUploads, defaultTag]);

  const mention = (id: string) => {
    const person = mentionable.find((p) => p.id === id);
    if (!person) return;
    setText(`${text}@${person.name} `);
    if (!picked.includes(id)) setPicked([...picked, id]);
  };

  const attach = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0)
      void uploads.add(files, {
        clientId,
        productionId: tag === "" ? null : tag,
      });
  };

  const mentions = isInternal ? mentionsIn(text, picked, mentionable) : [];
  const isEmpty = text.trim() === "" && uploads.paths.length === 0;

  return (
    <section className="j2-composer" data-internal={isInternal}>
      <JForm
        action={sendMessage}
        className="j2-form"
        submitLabel={
          isInternal ? "Αποστολή στην ομάδα" : "Αποστολή στον πελάτη"
        }
        pendingLabel="Αποστολή…"
        isDisabled={isEmpty || uploads.isUploading}
        onSuccess={handleSent}
        aside={
          <span className="muted">
            μπορείς να το διορθώσεις για {editMinutes} λεπτά
          </span>
        }
      >
        <input type="hidden" name="clientId" value={clientId} />
        {isInternal && <input type="hidden" name="internal" value="on" />}
        {mentions.map((id) => (
          <input key={id} type="hidden" name="mentions" value={id} />
        ))}
        <div className="j2-seg" role="group" aria-label="Σε ποιον πάει">
          <button
            type="button"
            aria-pressed={!isInternal}
            onClick={() => setInternal(false)}
          >
            {!isInternal && <span aria-hidden="true">✓ </span>}
            Προς πελάτη
          </button>
          <button
            type="button"
            aria-pressed={isInternal}
            onClick={() => setInternal(true)}
          >
            {isInternal && <span aria-hidden="true">✓ </span>}
            Εσωτερικό Μήνυμα
          </button>
        </div>
        <p className="j2-to">
          <strong>Προς:</strong>{" "}
          {isInternal ? "μόνο την ομάδα · δεν το βλέπει ο πελάτης" : clientName}
        </p>
        <label className="toolbar">
          <span>Ετικέτα</span>
          <select
            className="input"
            name="productionId"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          >
            {canWriteUntagged && <option value="">χωρίς ετικέτα</option>}
            {productions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <textarea
          className="input"
          name="body"
          aria-label="Νέο Μήνυμα"
          placeholder="Γράψε το Μήνυμα…"
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="toolbar">
          {mentionable.length > 0 && (
            <select
              className="input"
              aria-label="Αναφορά σε…"
              disabled={!isInternal}
              value=""
              onChange={(e) => mention(e.target.value)}
            >
              <option value="">Αναφορά σε…</option>
              {mentionable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="button"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            Επισύναψη
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept={ATTACHMENT_ACCEPT}
            aria-label="Επισύναψη αρχείων"
            tabIndex={-1}
            onChange={attach}
          />
        </div>
        {!isInternal && mentionable.length > 0 && (
          <p className="muted">
            Οι @αναφορές γίνονται μόνο σε Εσωτερικά Μηνύματα
          </p>
        )}
        <p className="muted">{ATTACH_HINT}</p>
        {uploads.items.length > 0 && (
          <ul className="jfiles" aria-label="Συνημμένα">
            {uploads.items.map((item) => (
              <li key={item.key}>
                {item.name} ({formatSize(item.size)}
                {statusOf(item)}){" "}
                {item.path !== null && (
                  <input type="hidden" name="attachments" value={item.path} />
                )}
                <button
                  className="button"
                  type="button"
                  onClick={() => uploads.remove(item.key)}
                >
                  Αφαίρεση
                </button>
              </li>
            ))}
          </ul>
        )}
        {uploads.error && (
          <p className="j2-error" role="alert">
            {uploads.error}
          </p>
        )}
      </JForm>
    </section>
  );
}
