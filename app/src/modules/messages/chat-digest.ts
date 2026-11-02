import { isNewMessage, newestAt, threadHref } from "./helpers";
import { getThread } from "./queries";
import type { ReadResult } from "./read";
import { messageAnchor } from "./request-helpers";
import type { Thread } from "./view-schema";

// Η σύνοψη της Συνομιλίας ενός Πελάτη για άλλες οθόνες (B2 «Συνομιλία», B4 «Τελευταία απάντηση του πελάτη»).
// Μόνο ό,τι βλέπει ο θεατής: η βάση (messages_thread) φιλτράρει ανά Εύρος και κρύβει τα Εσωτερικά από τον πελάτη.

export interface ClientLastReply {
  authorName: string;
  at: string;
  text: string;
  href: string;
}

export interface ClientChatDigest {
  href: string;
  messageCount: number;
  unread: number;
  // null = κανένα Μήνυμα ακόμα.
  lastAt: string | null;
  lastClientReply: ClientLastReply | null;
}

export const chatDigestOf = (thread: Thread): ClientChatDigest => {
  const messages = thread.messages;
  const fromClient = messages.filter(
    (message) => message.authorKind === "client" && !message.deleted,
  );
  const last = fromClient.reduce<(typeof fromClient)[number] | null>(
    (newest, message) =>
      newest === null || Date.parse(message.at) > Date.parse(newest.at)
        ? message
        : newest,
    null,
  );
  const href = threadHref(thread.client.id);
  return {
    href,
    messageCount: messages.length,
    unread: messages.filter((message) => isNewMessage(message, thread.readAt))
      .length,
    lastAt: messages.length > 0 ? newestAt(messages) : null,
    lastClientReply:
      last === null
        ? null
        : {
            authorName: last.authorName ?? "—",
            at: last.at,
            text: last.body ?? "",
            href: `${href}#${messageAnchor(last.id)}`,
          },
  };
};

// null = ο θεατής δεν βλέπει αυτή τη Συνομιλία (ίδιο με ανύπαρκτη).
export async function getClientChatDigest(
  clientId: string,
): Promise<ReadResult<ClientChatDigest | null>> {
  const result = await getThread(clientId);
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data === null ? null : chatDigestOf(result.data),
  };
}
