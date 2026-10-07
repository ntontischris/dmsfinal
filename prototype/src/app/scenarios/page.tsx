import Link from "next/link";

import { FICTIONAL_CLIENT } from "@/data/fictional-client";
import { SCENARIOS, stepHref } from "@/data/scenarios";

export default function ScenariosPage() {
  return (
    <>
      <header className="screen-header">
        <div className="eyebrow">Καθοδηγούμενα σενάρια</div>
        <h1>Ο πελάτης «{FICTIONAL_CLIENT.name}» από άκρη σε άκρη</h1>
        <p className="muted">
          Κάθε σενάριο περνά τη ραχοκοκαλιά από τη ματιά ενός ρόλου: φόρμα,
          Ευκαιρία, πρόταση και υπογραφή, Συμφωνία, Γυρίσματα, Παραγωγή,
          Παραδοτέα, Τιμολόγιο, Είσπραξη, Ανανέωση. Το prototype δεν αποθηκεύει:
          κάθε βήμα δείχνει την Κυψέλη τη στιγμή που βρίσκεται σε εκείνο το
          σημείο (μια παλιά Περίοδος, η τρέχουσα, η πρόταση που περιμένει
          υπογραφή). «Σήμερα» είναι Κυριακή 20/09/2026.
        </p>
      </header>
      <ul className="scenario-list">
        {SCENARIOS.map((scenario) => (
          <li key={scenario.id} className="card">
            <div className="card-title">
              <h2>{scenario.title}</h2>
              <span className="muted">
                {scenario.who} · {scenario.steps.length} βήματα
              </span>
            </div>
            <p>{scenario.summary}</p>
            <div className="btn-row">
              <Link
                className="button"
                data-primary="true"
                href={stepHref(scenario, 0)}
              >
                Ξεκίνα →
              </Link>
              <Link className="button" href={`/scenarios/${scenario.id}`}>
                Όλα τα βήματα
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
