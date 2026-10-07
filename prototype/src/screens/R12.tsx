import Link from "next/link";

import type { Lang } from "@/data/website";
import { parseLang } from "@/data/website-access";
import type { ScreenProps } from "@/screens/shared";
import {
  ASKS,
  AnswerBody,
  QUESTIONS,
  parseAsk,
  type Ask,
} from "@/screens/r12-scenarios";
import { InterestForm, withQuery } from "@/screens/w-form";
import { SiteFrame, tr } from "@/screens/w-site";

const MAX_QUESTION = 1000;
const ANSWERING: readonly Ask[] = ["answer", "price", "unknown", "offtopic"];

function ProtoBar({ role, query }: Pick<ScreenProps, "role" | "query">) {
  return (
    <nav className="site-proto" aria-label="Prototype">
      Prototype:{" "}
      <Link
        href={withQuery(role, "R12", query, { ask: undefined })}
        aria-current={!query.ask ? "true" : undefined}
      >
        αρχή
      </Link>
      {ASKS.map((a) => (
        <Link
          key={a.id}
          href={withQuery(role, "R12", query, { ask: a.id })}
          aria-current={query.ask === a.id ? "true" : undefined}
        >
          {a.label}
        </Link>
      ))}
    </nav>
  );
}

function Chips({
  role,
  query,
  lang,
}: {
  role: ScreenProps["role"];
  query: ScreenProps["query"];
  lang: Lang;
}) {
  const chips: readonly Ask[] = ["answer", "price", "unknown", "offtopic"];
  return (
    <div className="r-chips">
      {chips.map((id) => (
        <Link key={id} href={withQuery(role, "R12", query, { ask: id })}>
          {lang === "en" ? QUESTIONS[id].en : QUESTIONS[id].el}
        </Link>
      ))}
    </div>
  );
}

function Conversation({
  ask,
  lang,
  props,
}: {
  ask: Ask;
  lang: Lang;
  props: ScreenProps;
}) {
  const q = lang === "en" ? QUESTIONS[ask].en : QUESTIONS[ask].el;
  return (
    <>
      <div className="r-msg" data-from="me">
        {q}
      </div>
      <div className="r-msg">
        <AnswerBody ask={ask} lang={lang} />
      </div>
      {ask === "unknown" && (
        <InterestForm
          role={props.role}
          lang={lang}
          query={props.query}
          compact
          code="R12"
        />
      )}
    </>
  );
}

function FormInstead({
  ask,
  lang,
  props,
}: {
  ask: Ask;
  lang: Lang;
  props: ScreenProps;
}) {
  return (
    <>
      <div className="r-alert" role="status">
        {ask === "limit"
          ? tr(
              lang,
              "Φτάσατε το όριο μηνυμάτων αυτής της συζήτησης (15 από 15).",
              "You have reached this conversation's message limit (15 of 15).",
            )
          : tr(
              lang,
              "Ο Βοηθός δεν είναι διαθέσιμος τώρα.",
              "The Assistant is not available right now.",
            )}{" "}
        {tr(
          lang,
          "Αφήστε μας τα στοιχεία σας και θα σας απαντήσουμε εμείς.",
          "Leave your details and we will reply ourselves.",
        )}
      </div>
      <InterestForm
        role={props.role}
        lang={lang}
        query={props.query}
        compact
        code="R12"
      />
    </>
  );
}

function ChatInput({ lang }: { lang: Lang }) {
  return (
    <div className="r-chat-input">
      <input
        className="input"
        maxLength={MAX_QUESTION}
        placeholder={tr(lang, "Γράψτε την ερώτησή σας", "Type your question")}
        aria-label={tr(lang, "Ερώτηση", "Question")}
      />
      <span className="r-form-note">0/1.000</span>
    </div>
  );
}

export function R12(props: ScreenProps) {
  const { role, query } = props;
  const lang = parseLang(query.lang);
  const ask = parseAsk(query.ask);
  const isForm = ask === "limit" || ask === "down";
  return (
    <SiteFrame
      role={role}
      code="R12"
      lang={lang}
      path="/"
      query={query}
      hasWidget={false}
    >
      <ProtoBar role={role} query={query} />
      <section className="r-chat" aria-label={tr(lang, "Βοηθός", "Assistant")}>
        <div className="r-chat-head">
          <span>{tr(lang, "Ρωτήστε μας", "Ask us")}</span>
          <Link href={withQuery(role, "R1", {}, { lang: query.lang })}>
            {tr(lang, "Κλείσιμο", "Close")}
          </Link>
        </div>
        <div className="r-chat-body">
          {!ask && (
            <>
              <div className="r-msg">
                {tr(
                  lang,
                  "Γεια σας! Απαντώ μόνο για τη Delta Films. Τι θέλετε να μάθετε;",
                  "Hello! I only answer about Delta Films. What would you like to know?",
                )}
              </div>
              <Chips role={role} query={query} lang={lang} />
            </>
          )}
          {ask && ANSWERING.includes(ask) && (
            <Conversation ask={ask} lang={lang} props={props} />
          )}
          {ask && isForm && <FormInstead ask={ask} lang={lang} props={props} />}
        </div>
        {!isForm && <ChatInput lang={lang} />}
        <div className="r-chat-foot">
          {tr(
            lang,
            "Οι συζητήσεις κρατιούνται 12 μήνες από το τελευταίο μήνυμα και τις βλέπει η εταιρεία.",
            "Conversations are kept for 12 months from the last message and the company can see them.",
          )}
        </div>
      </section>
    </SiteFrame>
  );
}
