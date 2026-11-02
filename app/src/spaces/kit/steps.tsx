// Βήματα μιας διαδικασίας (κόμβοι της Χρωματικής διόρθωσης): τι έγινε, πού είμαστε, τι μένει.

export interface Step {
  label: string;
  hint?: string;
  state: "done" | "current" | "todo";
}

export function Steps({
  steps,
  label,
}: {
  steps: readonly Step[];
  label: string;
}) {
  return (
    <ol className="kit-steps" aria-label={label}>
      {steps.map((step) => (
        <li
          key={step.label}
          className="kit-step"
          data-state={step.state}
          aria-current={step.state === "current" ? "step" : undefined}
        >
          <span className="kit-step-label">{step.label}</span>
          {step.hint && <span className="kit-step-hint">{step.hint}</span>}
        </li>
      ))}
    </ol>
  );
}
