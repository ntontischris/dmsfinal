import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Avatar } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { AUDIENCE_LABEL, whoText } from "../assistant-helpers";
import {
  CONVERSATION_GONE_TEXT,
  DELETE_NOTE,
  READ_ONLY_NOTE,
} from "../assistant-labels";
import { getConversation } from "../assistant-queries";
import { fmtWhen, turnsOf, type L2Source, type L2Turn } from "./l2-adapter";
import { DeleteConversation } from "./l2-delete";
import { KBox } from "./k-box";
import { L2_DENIED } from "./l2-screen";

import "../../finance/spaces/money-lines.css";
import "./k.css";
import "./l2.css";

// Οι απαντήσεις έχουν παραγράφους: οι αλλαγές γραμμής μένουν.
const PRE = { whiteSpace: "pre-wrap" } as const;

function Chips({ sources }: { sources: readonly L2Source[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="l2-chips">
      {sources.map((source) =>
        source.href ? (
          <Link key={source.key} className="l2-chip" href={source.href}>
            {source.label}
          </Link>
        ) : (
          <span key={source.key} className="l2-chip" data-gone={source.isGone}>
            {source.label}
          </span>
        ),
      )}
    </div>
  );
}

function TurnView({ turn }: { turn: L2Turn }) {
  return (
    <div className="l2-turn">
      {turn.question !== null && (
        <div className="l2-msg" data-who="q">
          <p>
            <strong>Ερώτηση:</strong> <span style={PRE}>{turn.question}</span>
          </p>
        </div>
      )}
      {turn.answer !== null && (
        <div className="l2-msg" data-who="a">
          <Avatar name="Βοηθός" size={28} />
          <p>
            <strong>Βοηθός:</strong> <span style={PRE}>{turn.answer}</span>
          </p>
        </div>
      )}
      <Chips sources={turn.sources} />
      {turn.isUnanswered && (
        <p>
          <Badge tone="attention">δεν ήξερε</Badge>{" "}
          <Link href={hrefOf("L3")}>Δες στις Αναπάντητες</Link>
        </p>
      )}
    </div>
  );
}

// L2 μία Συζήτηση στη νέα εμφάνιση (prototype `screens/l2-detail.tsx`): μόνο ανάγνωση, με τις πηγές κάθε απάντησης.
// Το id έχει ελεγχθεί ως uuid στη σελίδα· null = άκυρο. Χωρίς Δικαίωμα ή ανύπαρκτη: ίδια άρνηση.
export async function SpacesConversation({ id }: { id: string | null }) {
  const viewer = await getViewer();
  const result =
    viewer.status === "signed-in" && id !== null
      ? await getConversation(id)
      : null;
  if (result?.ok === false)
    return (
      <div data-spaces className="k">
        <ErrorNotice what="η Συζήτηση του Βοηθού" />
      </div>
    );
  const conversation = result?.data;
  if (!conversation)
    return (
      <div data-spaces className="k">
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {viewer.status === "signed-in"
            ? `${L2_DENIED} ${CONVERSATION_GONE_TEXT}`
            : L2_DENIED}
        </StateNotice>
      </div>
    );
  const who = whoText(
    conversation.audience,
    conversation.who,
    conversation.clientName,
  );
  const turns = turnsOf(conversation.messages);
  return (
    <div data-spaces className="k">
      <section>
        <header className="ml-hero">
          <span className="ml-hero-mono" aria-hidden="true">
            {initialsOf(who)}
          </span>
          <div>
            <span className="k-badges">
              <Badge>{AUDIENCE_LABEL[conversation.audience]}</Badge>
              <Badge>{conversation.language}</Badge>
            </span>
            <h1 data-page-title>{who}</h1>
            <p>
              Ξεκίνησε {fmtWhen(conversation.startedAt)} · τελευταίο μήνυμα{" "}
              {fmtWhen(conversation.lastMessageAt)}
            </p>
          </div>
        </header>
        <DeleteConversation id={conversation.id} />
      </section>
      <div className="ml-stack">
        <KBox title="Μηνύματα" hint={`${turns.length} γύροι`} isOpen>
          {turns.map((turn) => (
            <TurnView key={turn.key} turn={turn} />
          ))}
        </KBox>
      </div>
      <p className="k-note">{DELETE_NOTE}</p>
      <p className="k-note">{READ_ONLY_NOTE}</p>
    </div>
  );
}
