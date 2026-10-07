import type { ReactNode } from "react";

import type { Lang } from "@/data/website";
import {
  packageName,
  packageText,
  publicPackages,
} from "@/data/website-access";
import { fmtMoney } from "@/screens/shared";
import { tr } from "@/screens/w-site";

export type Ask =
  "answer" | "price" | "unknown" | "offtopic" | "limit" | "down";

export const ASKS: readonly { id: Ask; label: string }[] = [
  { id: "answer", label: "απάντηση με πηγές" },
  { id: "price", label: "τιμή" },
  { id: "unknown", label: "δεν ξέρει" },
  { id: "offtopic", label: "άσχετη ερώτηση" },
  { id: "limit", label: "όριο 15 μηνυμάτων" },
  { id: "down", label: "δεν είναι διαθέσιμος" },
];

export const parseAsk = (value: string | undefined): Ask | undefined =>
  ASKS.find((a) => a.id === value)?.id;

export const QUESTIONS: Readonly<Record<Ask, { el: string; en: string }>> = {
  answer: {
    el: "Πώς γίνεται ένα γύρισμα;",
    en: "How does a shoot work?",
  },
  price: { el: "Πόσο κοστίζει;", en: "How much does it cost?" },
  unknown: {
    el: "Μπορείτε να γυρίσετε στη Θεσσαλονίκη;",
    en: "Can you shoot in Thessaloniki?",
  },
  offtopic: {
    el: "Τι καιρό θα κάνει αύριο;",
    en: "What will the weather be like tomorrow?",
  },
  limit: { el: "Και κάτι ακόμα…", en: "One more thing…" },
  down: { el: "Πώς δουλεύετε;", en: "How do you work?" },
};

interface Source {
  title: string;
  summary: string;
}

function Sources({ items, lang }: { items: readonly Source[]; lang: Lang }) {
  return (
    <div className="r-sources">
      <strong>{tr(lang, "Πηγές", "Sources")}</strong>
      {items.map((s) => (
        <div key={s.title}>
          {s.title}
          <br />
          {tr(lang, "Περίληψη: ", "Summary: ")}
          {s.summary}
        </div>
      ))}
    </div>
  );
}

function PriceAnswer({ lang }: { lang: Lang }) {
  const packages = publicPackages(lang);
  const shown = packages.filter((p) => p.showsPrice);
  const hidden = packages.filter((p) => !p.showsPrice);
  return (
    <>
      <span>
        {tr(
          lang,
          "Αυτά είναι τα πακέτα που δείχνουμε δημόσια:",
          "These are the packages we show publicly:",
        )}
      </span>
      <ul style={{ margin: 0, paddingLeft: "var(--space-4)" }}>
        {shown.map((p) => (
          <li key={p.id}>
            {packageName(p, lang)}: {fmtMoney(p.price)}{" "}
            {p.billing === "μηνιαίο"
              ? tr(lang, "τον μήνα + ΦΠΑ", "per month + VAT")
              : tr(lang, "+ ΦΠΑ", "+ VAT")}
          </li>
        ))}
        {hidden.map((p) => (
          <li key={p.id}>
            {packageName(p, lang)}: {packageText(p, lang)}{" "}
            {tr(lang, "(η τιμή δίνεται με προσφορά)", "(price on quote)")}
          </li>
        ))}
      </ul>
      <span>
        {tr(
          lang,
          "Για οτιδήποτε άλλο, στείλτε μας τη φόρμα.",
          "For anything else, send us the form.",
        )}
      </span>
    </>
  );
}

export function AnswerBody({ ask, lang }: { ask: Ask; lang: Lang }): ReactNode {
  if (ask === "price") return <PriceAnswer lang={lang} />;
  if (ask === "offtopic") {
    return tr(
      lang,
      "Απαντώ μόνο για τη Delta Films: υπηρεσίες, πακέτα, δουλειές και πώς δουλεύουμε. Ρωτήστε μου κάτι από αυτά.",
      "I only answer about Delta Films: services, packages, work and how we work. Ask me one of those.",
    );
  }
  if (ask === "unknown") {
    return tr(
      lang,
      "Δεν ξέρω την απάντηση σε αυτό. Αφήστε μας τα στοιχεία σας και θα σας απαντήσει κάποιος από την ομάδα.",
      "I do not know the answer to that. Leave your details and someone from the team will reply.",
    );
  }
  return (
    <>
      <span>
        {tr(
          lang,
          "Κλείνουμε μια μέρα στον χώρο σας, γυρίζουμε με φυσικό φως και παραδίδουμε τα βίντεο μέσα σε λίγες μέρες.",
          "We book a day at your place, shoot in natural light and deliver the videos within a few days.",
        )}
      </span>
      <Sources
        lang={lang}
        items={[
          {
            title: tr(lang, "Πώς δουλεύουμε", "How we work"),
            summary: tr(
              lang,
              "Από το briefing ως την παράδοση, σε τέσσερα βήματα.",
              "From briefing to delivery, in four steps.",
            ),
          },
        ]}
      />
    </>
  );
}
