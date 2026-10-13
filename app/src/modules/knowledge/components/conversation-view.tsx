import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import {
  AUDIENCE_LABEL,
  CONVERSATIONS_PATH,
  formatDateTime,
  UNANSWERED_PATH,
  whoText,
} from "../assistant-helpers";
import { DELETE_NOTE, READ_ONLY_NOTE } from "../assistant-labels";
import type {
  Conversation,
  ConversationMessage,
  MessageSource,
} from "../assistant-view-schema";
import { editHref } from "../helpers";
import { DeleteConversationForm } from "./delete-conversation-form";

// L2 μία Συζήτηση: μόνο ανάγνωση, με τις πηγές κάθε απάντησης (ή «δεν υπάρχει πια») και «Διαγραφή Συζήτησης».

const SOURCE_KIND_LABEL: Readonly<Record<MessageSource["kind"], string>> = {
  item: "Γνώση",
  package: "Πακέτο",
  sector: "Κλάδος",
};

function SourceChip({ source }: { source: MessageSource }) {
  const label = `${SOURCE_KIND_LABEL[source.kind]}: «${source.title}»`;
  if (source.gone)
    return (
      <span className="text-sm text-muted-foreground line-through">
        {label} (δεν υπάρχει πια)
      </span>
    );
  return source.kind === "item" ? (
    <Link className="text-sm" href={editHref(source.id)}>
      {label}
    </Link>
  ) : (
    <span className="text-sm">{label}</span>
  );
}

function MessageView({ message }: { message: ConversationMessage }) {
  const isUser = message.role === "user";
  return (
    <li className="grid gap-1 border-b py-3">
      <p className="m-0">
        <strong>{isUser ? "Ερώτηση:" : "Βοηθός:"}</strong>{" "}
        <span className="whitespace-pre-wrap">{message.content}</span>
      </p>
      <span className="text-xs text-muted-foreground">
        {formatDateTime(message.createdAt)}
      </span>
      {message.sources.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {message.sources.map((source, index) => (
            <SourceChip
              key={`${source.kind}-${source.id}-${index}`}
              source={source}
            />
          ))}
        </div>
      )}
      {message.noSource && (
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="attention">δεν ήξερε</Badge>
          <Link href={UNANSWERED_PATH}>Δες στις Αναπάντητες</Link>
        </p>
      )}
    </li>
  );
}

export function ConversationView({
  conversation,
}: {
  conversation: Conversation;
}) {
  return (
    <div className="grid gap-6">
      <p className="m-0">
        <Link href={CONVERSATIONS_PATH}>← Όλες οι Συζητήσεις</Link>
      </p>
      <Panel
        label={whoText(
          conversation.audience,
          conversation.who,
          conversation.clientName,
        )}
        aside={<Badge>{AUDIENCE_LABEL[conversation.audience]}</Badge>}
      >
        <p className="m-0 text-sm text-muted-foreground">
          Ξεκίνησε {formatDateTime(conversation.startedAt)} · τελευταίο μήνυμα{" "}
          {formatDateTime(conversation.lastMessageAt)} · γλώσσα{" "}
          {conversation.language}
        </p>
        <ol className="m-0 list-none p-0">
          {conversation.messages.map((message) => (
            <MessageView key={message.id} message={message} />
          ))}
        </ol>
        <p className="mb-0 text-sm text-muted-foreground">{READ_ONLY_NOTE}</p>
      </Panel>
      <Panel label="Διαγραφή">
        <div className="grid gap-2">
          <DeleteConversationForm id={conversation.id} />
          <p className="m-0 text-sm text-muted-foreground">{DELETE_NOTE}</p>
        </div>
      </Panel>
    </div>
  );
}
