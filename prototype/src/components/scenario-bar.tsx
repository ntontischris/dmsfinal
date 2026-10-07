import Link from "next/link";

import { findRole } from "@/data/roles";
import { findScenario, stepHref } from "@/data/scenarios";

interface ScenarioBarProps {
  scenarioId: string | undefined;
  stepNumber: string | undefined;
}

// Πάνω από την οθόνη, όταν ανοίγει από ένα σενάριο (?sc=…&st=…): τι βλέπεις εδώ και πού πας μετά.
export function ScenarioBar({ scenarioId, stepNumber }: ScenarioBarProps) {
  const scenario = findScenario(scenarioId);
  const index = Number(stepNumber) - 1;
  const step = scenario?.steps[index];
  if (!scenario || !step) return null;
  const total = scenario.steps.length;
  return (
    <aside className="card scenario-bar" aria-label="Σενάριο">
      <div className="scenario-bar-head">
        <Link href={`/scenarios/${scenario.id}`}>{scenario.title}</Link>
        <span className="muted">
          Βήμα {index + 1} από {total} · ως {findRole(step.role).label}
        </span>
      </div>
      <h2>{step.title}</h2>
      <p>{step.see}</p>
      {step.act && (
        <p>
          <strong>Δοκίμασε:</strong> {step.act}
        </p>
      )}
      {step.check && (
        <p className="muted">
          <strong>Πρόσεξε:</strong> {step.check}
        </p>
      )}
      <nav className="scenario-bar-nav" aria-label="Βήματα σεναρίου">
        {index > 0 ? (
          <Link className="button" href={stepHref(scenario, index - 1)}>
            ← Προηγούμενο
          </Link>
        ) : (
          <span />
        )}
        {index + 1 < total ? (
          <Link
            className="button"
            data-primary="true"
            href={stepHref(scenario, index + 1)}
          >
            Επόμενο: {scenario.steps[index + 1].title} →
          </Link>
        ) : (
          <Link
            className="button"
            data-primary="true"
            href={`/scenarios/${scenario.id}`}
          >
            Τέλος σεναρίου ✓
          </Link>
        )}
      </nav>
    </aside>
  );
}
