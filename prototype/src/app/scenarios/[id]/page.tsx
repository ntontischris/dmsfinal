import Link from "next/link";
import { notFound } from "next/navigation";

import { findRole } from "@/data/roles";
import { SCENARIOS, findScenario, stepHref } from "@/data/scenarios";
import { findScreen } from "@/data/screens";

interface ScenarioPageProps {
  params: Promise<{ id: string }>;
}

export const generateStaticParams = () =>
  SCENARIOS.map((scenario) => ({ id: scenario.id }));

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const { id } = await params;
  const scenario = findScenario(id);
  if (!scenario) notFound();

  return (
    <>
      <header className="screen-header">
        <div className="eyebrow">
          <Link href="/scenarios">Σενάρια</Link> · {scenario.who}
        </div>
        <h1>{scenario.title}</h1>
        <p className="muted">{scenario.summary}</p>
      </header>
      <ol className="scenario-steps">
        {scenario.steps.map((step, index) => (
          <li key={`${step.code}-${index}`} className="card">
            <div className="card-title">
              <h2>
                <Link href={stepHref(scenario, index)}>{step.title}</Link>
              </h2>
              <span className="muted">
                {findRole(step.role).label} · {step.code}{" "}
                {findScreen(step.code)?.title ?? ""}
              </span>
            </div>
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
          </li>
        ))}
      </ol>
    </>
  );
}
