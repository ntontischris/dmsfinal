import Link from "next/link";

// Φίλτρα σε ομάδα: ένα ενεργό κάθε φορά, η επιλογή ζει στη διεύθυνση.

export interface SegmentedOption {
  label: string;
  href: string;
  isCurrent: boolean;
  count?: number;
}

export function Segmented({
  options,
  label,
}: {
  options: readonly SegmentedOption[];
  label: string;
}) {
  return (
    <nav className="kit-seg" aria-label={label}>
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          aria-current={option.isCurrent ? "true" : undefined}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="num">{option.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
