import type { ReactNode, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

// Κοινά κομμάτια των φορμών των Παραγωγών: πεδίο κειμένου με τα tokens της εφαρμογής και μικρή σημείωση.

const TEXTAREA =
  "w-full min-w-0 rounded-sm border border-input bg-background px-3 py-1.5 text-sm leading-snug text-foreground hover:border-border-strong focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(TEXTAREA, "min-h-20", className)} {...props} />
  );
}

export function MutedNote({ children }: { children: ReactNode }) {
  return <p className="m-0 text-sm text-muted-foreground">{children}</p>;
}
