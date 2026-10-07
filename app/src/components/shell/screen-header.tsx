import type { ReactNode } from "react";

// Κεφαλίδα οθόνης: ετικέτα με τον κωδικό, τίτλος, προαιρετικές ενέργειες δεξιά.
interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}

export function ScreenHeader({ eyebrow, title, children }: ScreenHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="kit-label mb-2">{eyebrow}</p>
        <h1 className="m-0 text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] font-medium tracking-tight">
          {title}
        </h1>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}
