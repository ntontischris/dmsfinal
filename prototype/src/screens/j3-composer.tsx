"use client";

import Link from "next/link";
import { useState } from "react";

import { MESSAGE_RULES, type Attachment } from "@/data/messages";

import "./j3.css";

export interface ComposerDraft {
  text: string;
  productionId?: string;
  kind?: string;
  attachments: readonly Attachment[];
}

export interface ProductionOption {
  id: string;
  title: string;
}

interface PresetFile extends Attachment {
  isVideo?: boolean;
}

const PRESETS: readonly PresetFile[] = [
  { name: "λογότυπο-νέο.png", kind: "εικόνα", sizeKb: 640 },
  { name: "μενού-φθινόπωρο.pdf", kind: "PDF", sizeKb: 2300 },
  { name: "οδηγίες-γυρίσματος.pdf", kind: "PDF", sizeKb: 410 },
  {
    name: "βίντεο-από-κινητό.mov",
    kind: "έγγραφο",
    sizeKb: 24 * 1024,
    isVideo: true,
  },
];

const KINDS = ["νέο Παραδοτέο", "Γύρισμα", "άλλο"] as const;

interface J3ComposerProps {
  productions: readonly ProductionOption[];
  onSend: (draft: ComposerDraft) => void;
  bookingHref: string;
  changeHref: string;
}

export function J3Composer({
  productions,
  onSend,
  bookingHref,
  changeHref,
}: J3ComposerProps) {
  const [text, setText] = useState("");
  const [productionId, setProductionId] = useState("");
  const [isRequest, setIsRequest] = useState(false);
  const [kind, setKind] = useState<string>(KINDS[0]);
  const [files, setFiles] = useState<readonly Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const attach = (preset: PresetFile) => {
    const isTooBig = preset.sizeKb > MESSAGE_RULES.maxFileMb * 1024;
    if (preset.isVideo || isTooBig)
      return setError(
        `Τα βίντεο και τα μεγάλα αρχεία στέλνονται ως link (έως ${MESSAGE_RULES.maxFileMb} MB ανά αρχείο)`,
      );
    if (files.length >= MESSAGE_RULES.maxFiles)
      return setError(`Έως ${MESSAGE_RULES.maxFiles} αρχεία ανά Μήνυμα.`);
    if (files.some((f) => f.name === preset.name)) return;
    setError(null);
    setFiles([
      ...files,
      { name: preset.name, kind: preset.kind, sizeKb: preset.sizeKb },
    ]);
  };

  const submit = () => {
    if (!text.trim()) return;
    onSend({
      text: text.trim(),
      productionId: productionId || undefined,
      kind: isRequest ? kind : undefined,
      attachments: files,
    });
    setText("");
    setFiles([]);
    setIsRequest(false);
    setError(null);
  };

  return (
    <form
      className="card j3-composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="card-title">Νέο Μήνυμα</h2>
      <label className="j3-field">
        <span>Μήνυμα προς την ομάδα</span>
        <textarea
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <label className="j3-field">
        <span>Για ποια Παραγωγή;</span>
        <select
          className="input"
          value={productionId}
          onChange={(e) => setProductionId(e.target.value)}
        >
          <option value="">Γενικά, χωρίς Παραγωγή</option>
          {productions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label className="j3-check">
        <input
          type="checkbox"
          checked={isRequest}
          onChange={(e) => setIsRequest(e.target.checked)}
        />
        Ζητώ κάτι να γίνει (Αίτημα)
      </label>
      {isRequest && (
        <div className="j3-field">
          <select
            className="input"
            aria-label="Είδος Αιτήματος"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          {kind === "Γύρισμα" && (
            <p className="note">
              Πρώτα δοκίμασε να το κλείσεις μόνος σου:{" "}
              <Link href={bookingHref}>Κλείσε Γύρισμα</Link>
            </p>
          )}
          <p className="muted">
            Αλλαγές σε εγκεκριμένο Παραδοτέο ζητιούνται από τη σελίδα του
            Παραδοτέου («Ζητώ αλλαγή»).{" "}
            <Link href={changeHref}>Άνοιξε το Παραδοτέο</Link>
          </p>
        </div>
      )}
      <div className="j3-field">
        <div className="j3-files">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => attach(p)}>
              Επισύναψη: {p.name}
            </button>
          ))}
        </div>
        {files.length > 0 && (
          <ul className="jfiles">
            {files.map((f) => (
              <li key={f.name}>
                {f.kind}: {f.name}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="note" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="btn-row">
        <button type="submit" data-primary disabled={!text.trim()}>
          Αποστολή
        </button>
      </div>
    </form>
  );
}
