// Κοινά των γραμμών της O6 (μορφή «Χρήματα»), χωρίς "use client": τα χρησιμοποιούν και η σελίδα και οι φόρμες.

export const initialsOf = (label: string): string =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

export const inUseCount = (items: readonly { retired: boolean }[]): number =>
  items.filter((item) => !item.retired).length;

// Η κεφαλίδα των Τρόπων είσπραξης: ο τίτλος (h2, τον βρίσκουν τα τεστ) και πόσοι είναι σε χρήση.
export function MethodsHead({ inUse }: { inUse: number }) {
  return (
    <div className="o6-head">
      <h2 className="ml-box-title">Τρόποι είσπραξης</h2>
      <small>{inUse} σε χρήση · μόνο ελληνικά</small>
    </div>
  );
}
