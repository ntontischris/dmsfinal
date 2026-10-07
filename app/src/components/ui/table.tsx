import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

// Πίνακας (Τεχνικό δελτίο): ετικέτες στηλών mono, λεπτές γραμμές, ποσά δεξιά.
// Σε κινητό κάθε γραμμή γίνεται κάρτα και κάθε κελί δείχνει την ετικέτα του (data-label).

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm max-sm:block max-sm:[&_tbody]:block max-sm:[&_thead]:hidden max-sm:[&_tr]:mb-2 max-sm:[&_tr]:block max-sm:[&_tr]:rounded-md max-sm:[&_tr]:border max-sm:[&_tr]:bg-card max-sm:[&_tr]:px-3 max-sm:[&_tr]:py-2">
        {children}
      </table>
    </div>
  );
}

interface CellProps {
  isNumeric?: boolean;
}

export function Th({
  isNumeric,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & CellProps) {
  return (
    <th
      className={cn(
        "kit-label whitespace-nowrap border-b border-border-strong px-3 py-2 text-left tracking-[0.06em]",
        isNumeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function Td({
  isNumeric,
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> &
  CellProps & { "data-label": string }) {
  return (
    <td
      className={cn(
        "border-b px-3 py-2.5 align-top",
        isNumeric && "whitespace-nowrap text-right tabular-nums",
        "max-sm:flex max-sm:justify-between max-sm:gap-3 max-sm:border-0 max-sm:px-0 max-sm:py-1 max-sm:text-right max-sm:before:kit-label max-sm:before:text-left max-sm:before:content-[attr(data-label)]",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-muted">{children}</tr>;
}
