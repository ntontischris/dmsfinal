"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";

import { attachFile } from "../actions-upload";
import { MarkdownBody } from "../components/markdown";
import { fileHref } from "../helpers";
import { TEXT_STATUS_LABEL } from "../labels";
import { articleImageSrc, imageMarkdown } from "../markdown-urls";
import { uploadToKnowledge } from "../upload-client";
import { acceptOf, formatSize } from "../upload-rules";
import type { EditableItem } from "../view-schema";

// Το «Κείμενο» του επεξεργαστή (prototype `l1-editor.tsx` › ContentFields) σε Markdown, με προεπισκόπηση και ανέβασμα
// εικόνας που εισάγει Markdown link στη θέση του δρομέα.
export function BodyField({ item }: { item: EditableItem }) {
  const [body, setBody] = useState(item.body ?? "");
  const [isPreview, setIsPreview] = useState(false);
  const [uploadState, setUploadState] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadState("Η εικόνα ανεβαίνει…");
    const outcome = await uploadToKnowledge(item.id, "image", file);
    if (!outcome.ok) return setUploadState(outcome.error);
    const at = textareaRef.current?.selectionStart ?? body.length;
    const markdown = imageMarkdown(
      file.name,
      articleImageSrc(item.id, outcome.path),
    );
    setBody(
      (current) => `${current.slice(0, at)}\n${markdown}\n${current.slice(at)}`,
    );
    setUploadState(null);
  };

  return (
    <>
      <div className="btn-row">
        <button className="button" type="button" onClick={() => imageRef.current?.click()}>
          Εικόνα
        </button>
        <button
          className="button"
          type="button"
          aria-pressed={isPreview}
          onClick={() => setIsPreview(!isPreview)}
        >
          {isPreview ? "Επεξεργασία" : "Προεπισκόπηση"}
        </button>
      </div>
      <input
        ref={imageRef}
        type="file"
        hidden
        accept={acceptOf("image")}
        aria-label="Ανέβασμα εικόνας"
        onChange={handleImage}
      />
      {uploadState && <p className="muted">{uploadState}</p>}
      <label style={isPreview ? { display: "none" } : undefined}>
        Κείμενο (Markdown)
        <textarea
          ref={textareaRef}
          className="input"
          name="body"
          rows={12}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      {isPreview && (
        <div className="a8-body" data-tw>
          <MarkdownBody source={body} />
        </div>
      )}
      <p className="muted">
        **έντονα**, - λίστα, [σύνδεσμος](https://…). Σύνδεσμοι μόνο https:// ή /app/….
      </p>
    </>
  );
}

// Το Αρχείο ενός στοιχείου «Αρχείο»: ανέβασμα κατευθείαν στο Storage (έως 25 MB), λήψη, και τι διαβάζει ο Βοηθός.
export function FileField({ item }: { item: EditableItem }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsBusy(true);
    setMessage({ text: "Το αρχείο ανεβαίνει…", isError: false });
    const uploaded = await uploadToKnowledge(item.id, "file", file);
    const attached = uploaded.ok
      ? await attachFile({
          itemId: item.id,
          path: uploaded.path,
          name: file.name,
        })
      : uploaded;
    setIsBusy(false);
    setMessage(
      attached.ok
        ? { text: "Το Αρχείο ανέβηκε.", isError: false }
        : { text: attached.error, isError: true },
    );
    if (attached.ok) router.refresh();
  };

  return (
    <div className="note">
      {item.file ? (
        <>
          Αρχείο: <a href={fileHref(item.id)}>{item.file.name}</a> (
          {formatSize(item.file.size)}). Μέγιστο 25 MB.{" "}
        </>
      ) : (
        <>Δεν έχει ανέβει ακόμα Αρχείο. PDF, DOCX, PPTX ή εικόνα, έως 25 MB. </>
      )}
      {item.textStatus && TEXT_STATUS_LABEL[item.textStatus]}
      <div className="btn-row">
        <button
          className="button"
          type="button"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {item.file ? "Αντικατάσταση Αρχείου" : "Ανέβασμα Αρχείου"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={acceptOf("file")}
        aria-label="Επιλογή Αρχείου"
        onChange={handleChange}
      />
      {message && (
        <p role={message.isError ? "alert" : "status"}>{message.text}</p>
      )}
    </div>
  );
}
