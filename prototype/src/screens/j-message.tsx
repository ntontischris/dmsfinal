import type { ReactNode } from "react";

import type { Message } from "@/data/messages";
import { authorName, productionTitle } from "@/data/messages-access";
import { Badge, fmtDate } from "@/screens/shared";

import "./j.css";

// «20/09 11:50»· με έτος μόνο όταν δεν είναι φέτος.
export const fmtWhen = (iso: string): string => {
  const [date, time = ""] = iso.split("T");
  const full = fmtDate(date);
  return `${date.startsWith("2026") ? full.slice(0, 5) : full} ${time}`.trim();
};

export const fmtSize = (kb: number): string =>
  kb >= 1024 ? `${(kb / 1024).toFixed(1).replace(".", ",")} MB` : `${kb} KB`;

interface MessageBubbleProps {
  message: Message;
  // Ο πελάτης δεν βλέπει ποτέ Εσωτερικά Μηνύματα, ούτε ονόματα @αναφορών.
  viewer: "team" | "client";
  isUnread?: boolean;
  isHighlighted?: boolean;
  isOwn?: boolean;
  // Ετικέτα Παραγωγής ως σύνδεσμος (ομάδα) ή απλό κείμενο.
  tagHref?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

// Ένα Μήνυμα της Συνομιλίας: αποστολέας, ώρα, ετικέτα, κείμενο, συνημμένα, ενδείξεις, και κάτω από αυτό ό,τι δώσει η οθόνη.
export function MessageBubble({
  message,
  viewer,
  isUnread,
  isHighlighted,
  isOwn,
  tagHref,
  actions,
  children,
}: MessageBubbleProps) {
  const tag = productionTitle(message.productionId);
  const side = message.author.kind === "client" ? "client" : "team";
  return (
    <article
      className="jmsg"
      id={message.id}
      data-side={side}
      data-own={isOwn}
      data-internal={!!message.isInternal}
      data-highlight={isHighlighted}
    >
      <header className="jmsg-head">
        <strong>{authorName(message)}</strong>
        {viewer === "team" && side === "team" && !message.isInternal && (
          <span className="muted">προς πελάτη</span>
        )}
        <span className="muted">{fmtWhen(message.at)}</span>
        {isUnread && <Badge tone="strong">νέο</Badge>}
      </header>
      {message.isInternal && (
        <p className="jmsg-internal">Εσωτερικό · δεν το βλέπει ο πελάτης</p>
      )}
      {tag &&
        (tagHref ? (
          <a className="jtag" href={tagHref}>
            {tag}
          </a>
        ) : (
          <span className="jtag">{tag}</span>
        ))}
      {message.deletedAt ? (
        <p className="muted jmsg-deleted">Το Μήνυμα διαγράφηκε.</p>
      ) : (
        <p className="jmsg-text">{message.text}</p>
      )}
      {!message.deletedAt && !!message.attachments?.length && (
        <ul className="jfiles">
          {message.attachments.map((file) => (
            <li key={file.name}>
              {file.kind}: {file.name} ({fmtSize(file.sizeKb)})
            </li>
          ))}
        </ul>
      )}
      {message.editedAt && !message.deletedAt && (
        <p className="muted jmsg-mark">διορθώθηκε</p>
      )}
      {children}
      {actions && <div className="btn-row jmsg-actions">{actions}</div>}
    </article>
  );
}
