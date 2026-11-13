"use client";

import type { ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";
import { useVideoControl } from "@/spaces/kit/video-player";

import {
  markSeenAsClient,
  replyAsClient,
  resolveAsClient,
} from "../actions-client";
import type { ClientVersion } from "../client-types";
import { H4CommentForm } from "./h4-comments";
import { AnswerLine } from "./h4-parts";
import { H4Player } from "./h4-player";
import { VideoNotes } from "./video-notes";
import { useMarkSeen } from "./video-notes-fields";

const CLIENT_ACTIONS = { reply: replyAsClient, resolve: resolveAsClient };

interface H4ReviewProps {
  deliverableId: string;
  version: ClientVersion;
  canReportBroken: boolean;
  canComment: boolean;
  // Ό,τι μπαίνει ανάμεσα στο βίντεο και τις σημειώσεις (η απόφαση, το μήνυμα μετά την απάντηση).
  children?: ReactNode;
}

// Το βίντεο της Έκδοσης και οι σημειώσεις του, με κοινό player: ο χρόνος μιας σημείωσης πηγαίνει το βίντεο εκεί.
// Νέες σημειώσεις και απαντήσεις μόνο στην τελευταία Έκδοση· οι παλιές διαβάζονται.
export function H4Review({
  deliverableId,
  version,
  canReportBroken,
  canComment,
  children,
}: H4ReviewProps) {
  const control = useVideoControl();
  useMarkSeen(
    markSeenAsClient,
    deliverableId,
    version.number,
    version.comments.length > 0,
  );
  return (
    <>
      <H4Player
        deliverableId={deliverableId}
        version={version}
        canReportBroken={canReportBroken}
        control={control}
      />
      {children}
      <Panel
        label="Σχόλια"
        aside={<span className="muted">{version.comments.length}</span>}
      >
        <AnswerLine version={version} />
        <VideoNotes
          notes={version.comments}
          control={control}
          actions={canComment ? CLIENT_ACTIONS : null}
          unnamed="Ομάδα"
        />
        {canComment && (
          <H4CommentForm
            deliverableId={deliverableId}
            versionNumber={version.number}
            control={control}
          />
        )}
      </Panel>
    </>
  );
}
