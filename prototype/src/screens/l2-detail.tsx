import Link from "next/link";

import type { Conversation, Source, Turn } from "@/data/knowledge";
import { sourceTitle } from "@/data/knowledge-access";
import type { RoleId } from "@/data/roles";
import { Badge, screenHref } from "@/screens/shared";

interface L2DetailProps {
  role: RoleId;
  conversation: Conversation;
  kind: string | undefined;
}

export function L2Detail({ role, conversation, kind }: L2DetailProps) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>{conversation.who}</h2>
        <Link href={screenHref(role, "L2", { kind })}>
          ← Όλες οι Συζητήσεις
        </Link>
      </div>
      <p>
        <Badge>{conversation.kind}</Badge>{" "}
        <Badge>{conversation.language}</Badge>
        {conversation.hitLimit && (
          <Badge tone="attention">έφτασε το όριο</Badge>
        )}
        {conversation.page && (
          <span className="muted"> Σελίδα: {conversation.page}</span>
        )}
      </p>
      <div>
        {conversation.turns.map((turn, i) => (
          <TurnView key={i} role={role} turn={turn} cv={conversation.id} />
        ))}
      </div>
      <div className="btn-row">
        <button type="button" className="button" data-danger="true">
          Διαγραφή Συζήτησης
        </button>
      </div>
      <p className="note">
        Για αίτημα διαγραφής· αλλιώς σβήνει μόνη της 12 μήνες μετά το τελευταίο
        μήνυμα, μαζί με τις Αναπάντητες της.
      </p>
      <p className="note">Μόνο ανάγνωση: από εδώ δεν απαντάς στον χρήστη.</p>
    </section>
  );
}

const REFERRALS: Readonly<Record<NonNullable<Turn["referral"]>, string>> = {
  φόρμα: "φόρμα επικοινωνίας",
  Συνομιλία: "Συνομιλία με την ομάδα",
  "Διαχείριση Γνώσης": "Διαχείριση Γνώσης",
};

function TurnView({
  role,
  turn,
  cv,
}: {
  role: RoleId;
  turn: Turn;
  cv: string;
}) {
  const isUnanswered = turn.sources.length === 0;
  return (
    <div className="l2-turn">
      <p>
        <strong>Ερώτηση:</strong> {turn.question}
      </p>
      <p>
        <strong>Βοηθός:</strong> {turn.answer}
      </p>
      <Chips sources={turn.sources} />
      {isUnanswered && (
        <p>
          <Badge tone="attention">δεν ήξερε</Badge>
          {turn.referral && <> → παραπομπή: {REFERRALS[turn.referral]}</>}{" "}
          <Link href={screenHref(role, "L3", {})}>
            Δες στις Αναπάντητες
          </Link>
        </p>
      )}
    </div>
  );
}

function Chips({ sources }: { sources: readonly Source[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="l2-chips">
      {sources.map((s, i) => (
        <span key={i} className="l2-chip" data-gone={s.kind === "διαγραμμένο"}>
          {sourceTitle(s)}
        </span>
      ))}
    </div>
  );
}
