import { cn } from "@/lib/cn";

// Βήματα μιας διαδικασίας (κόμβοι της Χρωματικής διόρθωσης): τι έγινε, πού είμαστε, τι μένει.

export interface Step {
  label: string;
  hint?: string;
  state: "done" | "current" | "todo";
}

const DOT: Record<Step["state"], string> = {
  done: "border-ok bg-ok/15 text-ok",
  current: "border-primary bg-primary text-primary-foreground",
  todo: "border-border-strong bg-card text-muted-foreground",
};

export function Steps({
  steps,
  label,
}: {
  steps: readonly Step[];
  label: string;
}) {
  return (
    <ol aria-label={label} className="m-0 flex list-none overflow-x-auto p-0">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative min-w-30 flex-1 pr-3"
        >
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-4 right-0 left-8 h-px",
                step.state === "done" ? "bg-ok" : "bg-border-strong",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 grid size-8 place-items-center rounded-full border font-mono text-xs font-medium",
              DOT[step.state],
            )}
          >
            {step.state === "done" ? "✓" : String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "mt-2 block text-sm",
              step.state === "todo"
                ? "font-medium text-muted-foreground"
                : "font-semibold",
            )}
          >
            {step.label}
          </span>
          {step.hint && (
            <span className="block text-xs text-muted-foreground">
              {step.hint}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
