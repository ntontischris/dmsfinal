"use client";

import { useState } from "react";

import type { Message } from "@/data/messages";
import { isOwnMessage, isUnread } from "@/data/messages-access";
import type { RoleId } from "@/data/roles";
import { MessageActions } from "@/screens/j2-actions";
import { Composer } from "@/screens/j2-composer";
import { applyFilter, patchMessage, type J2Filter } from "@/screens/j2-model";
import { RequestBox } from "@/screens/j2-request";
import { MessageBubble } from "@/screens/j-message";
import { StateNotice, screenHref } from "@/screens/shared";

interface ThreadProps {
  role: RoleId;
  clientId: string;
  initial: readonly Message[];
  filter: J2Filter;
  production?: string;
  highlightId?: string;
  isEmptyState: boolean;
  canWrite: boolean;
}

export function J2Thread(props: ThreadProps) {
  const { role, clientId, filter, highlightId } = props;
  const [list, setList] = useState<readonly Message[]>(props.initial);
  const shown = applyFilter(list, filter);
  const change = (next: Message) => setList(patchMessage(list, next.id, next));
  return (
    <div className="j2-thread">
      {shown.length === 0 &&
        (props.isEmptyState && list.length === 0 ? (
          <StateNotice kind="empty" title="Κανένα Μήνυμα ακόμα">
            <p>
              Η Συνομιλία υπάρχει για κάθε Πελάτη, ακόμα και αν είναι Ανενεργός.
              Το πρώτο Μήνυμα την ξεκινά.
            </p>
          </StateNotice>
        ) : (
          <p className="muted">Κανένα Μήνυμα σε αυτό το φίλτρο.</p>
        ))}
      {shown.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          viewer="team"
          isUnread={isUnread(role, message)}
          isHighlighted={message.id === highlightId}
          isOwn={isOwnMessage(role, message)}
          tagHref={
            message.productionId
              ? screenHref(role, "G2", { production: message.productionId })
              : undefined
          }
          actions={
            message.deletedAt ? undefined : (
              <MessageActions role={role} message={message} onChange={change} />
            )
          }
        >
          {message.request && !message.deletedAt && (
            <RequestBox role={role} message={message} onChange={change} />
          )}
        </MessageBubble>
      ))}
      {props.canWrite && (
        <Composer
          role={role}
          clientId={clientId}
          defaultTag={props.production}
          onSend={(m) => setList([...list, m])}
        />
      )}
    </div>
  );
}
