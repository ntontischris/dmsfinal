import { ErrorNotice } from "@/spaces/screens/shared";

import { getPipelineValue } from "../queries-forecast";
import { pipelineStats } from "./forecast-adapter";
import { GuideLink } from "./guide-link";

import "../../finance/spaces/money-lines.css";
import "./b3-lines.css";

// Οι δείκτες της πρόβλεψης ως κεφαλίδα: ο πρώτος (Αξία ανοιχτών, ή Ανοιχτές χωρίς ποσά) μεγάλος, οι άλλοι μικρά στοιχεία.
// Αν δεν διαβαστούν, η κεφαλίδα μένει με τη μία γραμμή και ο πίνακας από κάτω χωρίς αυτούς.
async function HeroNumbers({ today }: { today: string }) {
  const value = await getPipelineValue(today);
  if (!value.ok) return <ErrorNotice what="η πρόβλεψη του Pipeline" />;
  const [main, ...facts] = pipelineStats(value.data);
  if (!main) return null;
  return (
    <>
      <p className="ml-hero-amount" data-open="true">
        {main.value}
        <small>
          {main.label}
          {main.hint && ` · ${main.hint}`}
        </small>
      </p>
      <dl className="b3-facts">
        {facts.map((fact) => (
          <div
            key={fact.label}
            data-warn={fact.tone === "attention" || undefined}
          >
            <dt>{fact.label}</dt>
            <dd>
              <strong>{fact.value}</strong>
              {fact.hint && <small>{fact.hint}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

// Η κεφαλίδα του Pipeline: τι κάνω εδώ, η αξία των ανοιχτών και ο Οδηγός πωλήσεων δεξιά.
export function PipelineHero({
  today,
  isMine,
  hasCards,
}: {
  today: string;
  isMine: boolean;
  hasCards: boolean;
}) {
  return (
    <header className="ml-hero b3-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        €
      </span>
      <div>
        <h2>Ανοιχτές Ευκαιρίες</h2>
        <p>
          Πάρε τηλέφωνο όποιον περιμένει και πήγαινε κάθε Ευκαιρία ένα Στάδιο
          μπροστά.
          {isMine &&
            " Βλέπεις τις Ευκαιρίες σου και όσες αφορούν τους Πελάτες σου."}
        </p>
        {hasCards && <HeroNumbers today={today} />}
      </div>
      <div className="ml-quick">
        <GuideLink />
      </div>
    </header>
  );
}
