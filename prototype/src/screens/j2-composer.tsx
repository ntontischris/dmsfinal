"use client";

import { useState } from "react";

import { NOW } from "@/data/filming";
import { MESSAGE_RULES, type Attachment, type Message } from "@/data/messages";
import { MENTIONABLE, meOf, productionsOfClient } from "@/data/messages-access";
import type { RoleId } from "@/data/roles";
import { FAKE_FILES } from "@/screens/j2-model";

interface ComposerProps {
  role: RoleId;
  clientId: string;
  defaultTag?: string;
  onSend: (message: Message) => void;
}

export function Composer({
  role,
  clientId,
  defaultTag,
  onSend,
}: ComposerProps) {
  const [isInternal, setInternal] = useState(false);
  const [tag, setTag] = useState(defaultTag ?? "");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<readonly Attachment[]>([]);
  const [error, setError] = useState("");

  const attach = (name: string) => {
    const file = FAKE_FILES.find((f) => f.name === name);
    if (!file) return;
    if (file.sizeKb > MESSAGE_RULES.maxFileMb * 1024)
      return setError("Πάνω από 10 MB: στείλε το ως link");
    if (files.length >= MESSAGE_RULES.maxFiles)
      return setError(`Έως ${MESSAGE_RULES.maxFiles} αρχεία ανά Μήνυμα`);
    setError("");
    setFiles([
      ...files,
      { name: file.name, kind: file.kind, sizeKb: file.sizeKb },
    ]);
  };

  const mention = (id: string) => {
    const person = MENTIONABLE.find((p) => p.id === id);
    if (person) setText(`${text}@${person.name} `);
  };

  const send = () => {
    const mentions = isInternal
      ? MENTIONABLE.filter((p) => text.includes(`@${p.name}`)).map((p) => p.id)
      : [];
    onSend({
      id: `local-${Date.now()}`,
      clientId,
      at: NOW,
      author: { kind: "team", personId: meOf(role) },
      text: text.trim(),
      productionId: tag || undefined,
      isInternal: isInternal || undefined,
      mentions: mentions.length ? mentions : undefined,
      attachments: files.length ? files : undefined,
    });
    setText("");
    setFiles([]);
    setError("");
  };

  return (
    <section className="j2-composer" data-internal={isInternal}>
      <div className="tabs" role="group" aria-label="Παραλήπτης">
        <button
          className="tab"
          type="button"
          aria-current={!isInternal ? "page" : undefined}
          onClick={() => setInternal(false)}
        >
          Προς πελάτη
        </button>
        <button
          className="tab"
          type="button"
          aria-current={isInternal ? "page" : undefined}
          onClick={() => setInternal(true)}
        >
          Εσωτερικό Μήνυμα
        </button>
      </div>
      {isInternal && (
        <strong className="j2-error">Δεν το βλέπει ο πελάτης</strong>
      )}
      <label className="toolbar">
        <span>Ετικέτα</span>
        <select
          className="input"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">χωρίς ετικέτα</option>
          {productionsOfClient(clientId).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <textarea
        className="input"
        placeholder="Γράψε το Μήνυμα…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="toolbar">
        <select
          className="input"
          aria-label="Αναφορά σε…"
          disabled={!isInternal}
          value=""
          onChange={(e) => mention(e.target.value)}
        >
          <option value="">Αναφορά σε…</option>
          {MENTIONABLE.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Επισύναψη"
          value=""
          onChange={(e) => attach(e.target.value)}
        >
          <option value="">Επισύναψη</option>
          {FAKE_FILES.map((f) => (
            <option key={f.name} value={f.name}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      {!isInternal && (
        <p className="muted">
          Οι @αναφορές γίνονται μόνο σε Εσωτερικά Μηνύματα
        </p>
      )}
      {files.length > 0 && (
        <ul className="jfiles">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>
              {f.name}{" "}
              <button
                className="button"
                type="button"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
              >
                Αφαίρεση
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="j2-error" role="alert">
          {error}
        </p>
      )}
      <div className="btn-row">
        <button
          data-primary
          type="button"
          disabled={text.trim() === ""}
          onClick={send}
        >
          Αποστολή
        </button>
        <span className="muted">
          μπορείς να το διορθώσεις για {MESSAGE_RULES.editMinutes} λεπτά
        </span>
      </div>
    </section>
  );
}
