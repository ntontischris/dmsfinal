import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/spaces/kit/parts";

import type { J2Message } from "./j2-adapter";
import { NewBadge } from "./j2-read-at";

import "./j.css";

interface MessageBubbleProps {
  message: J2Message;
  actions?: ReactNode;
  children?: ReactNode;
}

// Ένα Μήνυμα της Συνομιλίας του prototype (`screens/j-message.tsx`): αποστολέας, ώρα, ετικέτα, κείμενο, συνημμένα,
// ενδείξεις, και κάτω από αυτό ό,τι δώσει η οθόνη (Αίτημα, ενέργειες).
export function MessageBubble({
  message,
  actions,
  children,
}: MessageBubbleProps) {
  return (
    <article
      className="jmsg"
      id={message.anchor}
      data-side={message.side}
      data-internal={message.isInternal}
    >
      <header className="jmsg-head">
        <Avatar name={message.authorName} size={28} />
        <strong>{message.authorName}</strong>
        {message.side === "team" && !message.isInternal && (
          <span className="muted">προς πελάτη</span>
        )}
        <span className="muted">{message.when}</span>
        <NewBadge at={message.at} canBeNew={message.canBeNew} />
      </header>
      {message.isInternal && (
        <p className="jmsg-internal">Εσωτερικό · δεν το βλέπει ο πελάτης</p>
      )}
      {message.tagTitle &&
        (message.tagHref ? (
          <Link className="jtag" href={message.tagHref}>
            {message.tagTitle}
          </Link>
        ) : (
          <span className="jtag">{message.tagTitle}</span>
        ))}
      {message.isDeleted ? (
        <p className="muted jmsg-deleted">Το Μήνυμα διαγράφηκε.</p>
      ) : (
        message.body && <p className="jmsg-text">{message.body}</p>
      )}
      {message.attachments.length > 0 && (
        <ul className="jfiles" aria-label="Συνημμένα">
          {message.attachments.map((file) => (
            <li key={file.id}>
              <a href={file.href}>{file.name}</a> ({file.size})
            </li>
          ))}
        </ul>
      )}
      {message.mentions && (
        <p className="muted jmsg-mark">Αναφορά σε: {message.mentions}</p>
      )}
      {message.isEdited && <p className="muted jmsg-mark">διορθώθηκε</p>}
      {children}
      {actions && <div className="btn-row jmsg-actions">{actions}</div>}
    </article>
  );
}
