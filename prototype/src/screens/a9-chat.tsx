import Link from "next/link";
import type { ReactNode } from "react";

import { CATALOGUE, isPackage, type CataloguePackage } from "@/data/catalogue";
import type { Source, Turn } from "@/data/knowledge";
import {
  findConversation,
  findKbItem,
  isInAudience,
  readableItems,
  sourceTitle,
} from "@/data/knowledge-access";
import type { RoleId } from "@/data/roles";
import { fmtMoney, screenHref } from "@/screens/shared";

export type Scenario = "answer" | "unknown" | "price" | "personal" | "capped";

export const SCENARIOS: readonly { id: Scenario; label: string }[] = [
  { id: "answer", label: "απάντηση με πηγές" },
  { id: "unknown", label: "δεν ξέρω" },
  { id: "price", label: "τιμή" },
  { id: "personal", label: "προσωπικό στοιχείο" },
  { id: "capped", label: "πλαφόν" },
];

export const parseScenario = (v: string | undefined): Scenario =>
  SCENARIOS.find((s) => s.id === v)?.id ?? "answer";

const isShownSource = (source: Source, role: RoleId): boolean => {
  if (source.kind === "διαγραμμένο") return false;
  if (source.kind === "πακέτο") return true;
  const item = findKbItem(source.itemId);
  return !!item && isInAudience(item, role);
};

interface SourceChipsProps {
  sources: readonly Source[];
  role: RoleId;
}

export function SourceChips({ sources, role }: SourceChipsProps) {
  const shown = sources.filter((s) => isShownSource(s, role));
  if (shown.length === 0) return null;
  return (
    <div className="a9-chips">
      {shown.map((s, i) =>
        s.kind === "γνώση" ? (
          <Link
            key={i}
            className="a9-chip"
            href={screenHref(role, "A8", { item: s.itemId })}
          >
            {sourceTitle(s)}
          </Link>
        ) : (
          <span key={i} className="a9-chip">
            {`${sourceTitle(s)} (Κατάλογος)`}
          </span>
        ),
      )}
    </div>
  );
}

export function Referral({ role }: { role: RoleId }) {
  if (role === "client") {
    return (
      <Link className="button" href={screenHref(role, "J3", {})}>
        Γράψε στη Συνομιλία με την ομάδα
      </Link>
    );
  }
  return (
    <>
      <p>Η ερώτηση πήγε σε όσους διαχειρίζονται τη Γνώση.</p>
      <Link className="button" href={screenHref(role, "A8", {})}>
        Ψάξε στη Γνώση
      </Link>
    </>
  );
}

const accountantTurn = (): Turn | undefined => {
  const item = readableItems("accountant")[0];
  if (!item) return undefined;
  return {
    question: "Πού βρίσκω οδηγίες για αυτό;",
    answer: item.summary,
    sources: [{ kind: "γνώση", itemId: item.id }],
  };
};

const turnOf = (role: RoleId): Turn | undefined => {
  if (role === "accountant") return accountantTurn();
  const id = role === "client" ? "cv-1" : role === "sales" ? "cv-5" : "cv-4";
  return findConversation(id)?.turns[0];
};

function Question({ text }: { text: string }) {
  return <div className="a9-q">{text}</div>;
}

function Answer({ children }: { children: ReactNode }) {
  return <div className="a9-a">{children}</div>;
}

interface UnknownTurnProps {
  role: RoleId;
  question: string;
  text: string;
}

function UnknownTurn({ role, question, text }: UnknownTurnProps) {
  return (
    <>
      <Question text={question} />
      <Answer>
        <p>{text}</p>
        <Referral role={role} />
        <p className="muted">Η ερώτηση καταγράφηκε στις Αναπάντητες.</p>
      </Answer>
    </>
  );
}

function AnswerTurn({ role }: { role: RoleId }) {
  const turn = turnOf(role);
  if (!turn) {
    return (
      <UnknownTurn
        role={role}
        question="Πού βρίσκω οδηγίες για αυτό;"
        text="Δεν το βρίσκω στη Γνώση, οπότε δεν ξέρω."
      />
    );
  }
  return (
    <>
      <Question text={turn.question} />
      <Answer>
        <p>{turn.answer}</p>
        <SourceChips sources={turn.sources} role={role} />
      </Answer>
    </>
  );
}

const pricedPackage = (): CataloguePackage | undefined =>
  CATALOGUE.filter(isPackage).find((p) => p.isPublic && p.showsPrice);

function PriceTurn({ role }: { role: RoleId }) {
  const pkg = pricedPackage();
  return (
    <>
      <Question text="Πόσο κοστίζει ένα Πακέτο;" />
      <Answer>
        {pkg ? (
          <>
            <p>
              Πακέτο «{pkg.name}»: {fmtMoney(pkg.price)} ({pkg.billing}), τιμή
              όπως στον Κατάλογο.
            </p>
            <SourceChips
              sources={[{ kind: "πακέτο", packageId: pkg.id }]}
              role={role}
            />
          </>
        ) : (
          <p>Δεν υπάρχει δημόσιο Πακέτο που να δείχνει τιμή, οπότε δεν ξέρω.</p>
        )}
        <p className="muted">
          Ο Βοηθός λέει τιμή μόνο από δημόσια Πακέτα που δείχνουν τιμή.
        </p>
      </Answer>
    </>
  );
}

interface MessagesProps {
  role: RoleId;
  scenario: Scenario;
}

export function Messages({ role, scenario }: MessagesProps) {
  if (scenario === "price") return <PriceTurn role={role} />;
  if (scenario === "personal") {
    return (
      <UnknownTurn
        role={role}
        question="Πότε είναι το επόμενο Γύρισμά μου;"
        text="Δεν έχω πρόσβαση στα στοιχεία του λογαριασμού σου, οπότε δεν ξέρω."
      />
    );
  }
  if (scenario === "unknown") {
    return (
      <UnknownTurn
        role={role}
        question="Ποιος κωδικός ανοίγει την αποθήκη;"
        text="Δεν το βρίσκω στη Γνώση, οπότε δεν ξέρω."
      />
    );
  }
  return <AnswerTurn role={role} />;
}
